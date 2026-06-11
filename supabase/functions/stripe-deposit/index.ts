// supabase/functions/stripe-deposit/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Gestiona el ciclo de vida de la FIANZA (depósito) retenida en Stripe.
// El hold se crea en stripe-webhook (PaymentIntent capture_method:'manual',
// metadata.type='deposit') al confirmar el pago. Aquí lo liberamos o capturamos.
//
// Acciones:
//   release            → cancela el hold (devolución limpia). Owner o admin.
//   release_to_renter  → idéntico a release, pero solo admin (resolución disputa).
//   capture_to_owner   → captura el hold y lo transfiere al Connect del owner. Admin.
//   split              → captura parcial al owner; el resto se libera al renter. Admin.
//
// Modelo: el depósito es un cargo directo sobre el customer del arrendatario
// (NO destination charge). Al capturarlo, el dinero va al balance de la
// plataforma; un transfer separado lo mueve a la cuenta conectada del owner.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_ONLY = new Set(['release_to_renter', 'capture_to_owner', 'split'])

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── Auth ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authErr || !user) throw new Error('Unauthorized')

    const { action, booking_id, owner_amount_cents } = await req.json()
    if (!action || !booking_id) throw new Error('Missing action or booking_id')

    // ── Cargar booking ──
    const { data: booking, error: bErr } = await supabase
      .from('booking')
      .select('id, owner_id, renter_id, deposit_cents, deposit_status, stripe_deposit_intent_id')
      .eq('id', booking_id)
      .single()
    if (bErr || !booking) throw new Error('Booking not found')

    // ── Autorización ──
    const { data: profile } = await supabase
      .from('user_profile')
      .select('role')
      .eq('id', user.id)
      .single()
    const isAdmin = profile?.role === 'admin'
    const isOwner = booking.owner_id === user.id

    if (ADMIN_ONLY.has(action)) {
      if (!isAdmin) throw new Error('Forbidden: admin only')
    } else if (action === 'release') {
      if (!isOwner && !isAdmin) throw new Error('Forbidden: owner or admin only')
    } else {
      throw new Error(`Unknown action: ${action}`)
    }

    // ── Idempotencia ──
    if (booking.deposit_status === 'released' && (action === 'release' || action === 'release_to_renter')) {
      return json({ ok: true, deposit_status: 'released', noop: true })
    }
    if (booking.deposit_status === 'captured' && (action === 'capture_to_owner' || action === 'split')) {
      return json({ ok: true, deposit_status: 'captured', noop: true })
    }

    // ── Sin depósito real (hold inexistente): no hay dinero que mover.
    //    Marcamos 'released' para cerrar el ciclo de forma honesta. ──
    if (!booking.deposit_cents || booking.deposit_cents <= 0 || !booking.stripe_deposit_intent_id) {
      await setDepositStatus(booking_id, 'released')
      return json({ ok: true, deposit_status: 'released', no_deposit: true })
    }

    const pi = await stripe.paymentIntents.retrieve(booking.stripe_deposit_intent_id)

    // ── RELEASE / RELEASE_TO_RENTER: liberar el hold completo ──
    if (action === 'release' || action === 'release_to_renter') {
      if (pi.status === 'requires_capture') {
        await stripe.paymentIntents.cancel(pi.id)
      } else if (pi.status === 'succeeded') {
        // Ya se capturó antes: reembolsar al arrendatario.
        await stripe.refunds.create({ payment_intent: pi.id })
      }
      // canceled / requires_payment_method / etc. → nada que liberar
      await setDepositStatus(booking_id, 'released')
      await logEvent(booking_id, 'deposit_release', pi.id, booking.deposit_cents, 'succeeded')
      return json({ ok: true, deposit_status: 'released' })
    }

    // ── CAPTURE_TO_OWNER / SPLIT: capturar (total o parcial) + transfer al owner ──
    const { data: owner } = await supabase
      .from('user_profile')
      .select('stripe_connect_account_id')
      .eq('id', booking.owner_id)
      .single()
    if (!owner?.stripe_connect_account_id) {
      throw new Error('Owner has no connected Stripe account to receive the deposit')
    }

    let captureAmount = booking.deposit_cents
    if (action === 'split') {
      captureAmount = owner_amount_cents && owner_amount_cents > 0
        ? Math.min(owner_amount_cents, booking.deposit_cents)
        : Math.floor(booking.deposit_cents / 2)
    }

    if (pi.status === 'requires_capture') {
      // Capturar el importe destinado al owner; el remanente se libera solo.
      await stripe.paymentIntents.capture(pi.id, { amount_to_capture: captureAmount })
    } else if (pi.status !== 'succeeded') {
      throw new Error(`Deposit hold cannot be captured (status: ${pi.status})`)
    }

    // Transferir lo capturado a la cuenta conectada del propietario.
    await stripe.transfers.create({
      amount: captureAmount,
      currency: 'eur',
      destination: owner.stripe_connect_account_id,
      metadata: { booking_id, type: 'deposit_capture', action },
    })

    await setDepositStatus(booking_id, 'captured')
    await logEvent(booking_id, 'deposit_capture', pi.id, captureAmount, 'succeeded', { action })
    return json({ ok: true, deposit_status: 'captured', captured_cents: captureAmount })
  } catch (err) {
    console.error('[stripe-deposit]', err)
    return json({ error: err.message }, 400)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
async function setDepositStatus(bookingId: string, status: string) {
  const { error } = await supabase
    .from('booking')
    .update({ deposit_status: status })
    .eq('id', bookingId)
  if (error) console.error('[stripe-deposit] booking update failed:', error.message)
}

async function logEvent(
  bookingId: string,
  eventType: string,
  paymentIntentId: string,
  amountCents: number,
  status: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabase.from('payment_log').insert({
    booking_id: bookingId,
    event_type: eventType,
    stripe_payment_intent_id: paymentIntentId,
    amount_cents: amountCents,
    status,
    metadata,
  })
  if (error) console.error('[stripe-deposit] payment_log insert failed:', error.message)
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
