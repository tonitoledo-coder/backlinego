// supabase/functions/stripe-webhook/index.ts
// ─────────────────────────────────────────────
// Webhook endpoint para eventos Stripe.
// Maneja tanto eventos de la cuenta plataforma como de cuentas conectadas.
//
// Eventos procesados:
//   checkout.session.completed     → booking confirmed + crear hold depósito
//   payment_intent.payment_failed  → booking cancelled
//   payment_intent.amount_capturable_updated → deposit held
//   charge.refunded                → deposit released/refunded
//   account.updated                → connect onboarding complete
//   transfer.created               → payout al propietario registrado
// ─────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('Missing stripe-signature', { status: 400 })

  // ── Verificar firma ──
  // Intentamos primero con el secret de la cuenta plataforma,
  // luego con el de cuentas conectadas si falla
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    )
  } catch {
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        Deno.env.get('STRIPE_WEBHOOK_SECRET_CONNECT')!,
      )
    } catch (err) {
      console.error('[webhook] Signature verification failed:', err.message)
      return new Response('Webhook signature verification failed', { status: 400 })
    }
  }

  console.log(`[webhook] ${event.type} — ${event.id}`)

  try {
    switch (event.type) {
      // ── Checkout completado: confirmar booking + crear hold depósito ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const bookingId = session.metadata?.booking_id
        if (!bookingId) break

        const paymentIntentId = session.payment_intent as string

        // Actualizar booking a confirmed
        await supabase
          .from('booking')
          .update({
            status: 'confirmed',
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq('id', bookingId)

        // Crear hold de depósito (capture_method: manual)
        const depositCents = parseInt(session.metadata?.deposit_amount_cents || '0', 10)
        if (depositCents > 0) {
          // Obtener booking para datos del customer
          const { data: booking } = await supabase
            .from('booking')
            .select('renter_id')
            .eq('id', bookingId)
            .single()

          if (booking) {
            const { data: renter } = await supabase
              .from('user_profile')
              .select('stripe_customer_id')
              .eq('id', booking.renter_id)
              .single()

            if (renter?.stripe_customer_id) {
              try {
                const depositPI = await stripe.paymentIntents.create({
                  amount: depositCents,
                  currency: 'eur',
                  customer: renter.stripe_customer_id,
                  capture_method: 'manual',
                  confirm: true,
                  automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                  },
                  metadata: {
                    booking_id: bookingId,
                    type: 'deposit',
                  },
                })

                await supabase
                  .from('booking')
                  .update({
                    stripe_deposit_intent_id: depositPI.id,
                    deposit_status: 'held',
                  })
                  .eq('id', bookingId)
              } catch (depositErr) {
                console.error('[webhook] Deposit hold failed:', depositErr.message)
                // No bloquear la confirmación del booking por el depósito
              }
            }
          }
        }

        await logEvent(bookingId, 'checkout_completed', event.id, session.amount_total || 0, 'succeeded')
        break
      }

      // ── Pago fallido ──
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const bookingId = pi.metadata?.booking_id
        if (!bookingId || pi.metadata?.type === 'deposit') break

        await supabase
          .from('booking')
          .update({ status: 'cancelled', cancellation_reason: 'payment_failed' })
          .eq('id', bookingId)

        await logEvent(bookingId, 'payment_failed', event.id, pi.amount, 'failed')
        break
      }

      // ── Depósito capturado (usado en disputas) ──
      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object as Stripe.PaymentIntent
        const bookingId = pi.metadata?.booking_id
        if (!bookingId || pi.metadata?.type !== 'deposit') break

        await supabase
          .from('booking')
          .update({ deposit_status: 'held' })
          .eq('id', bookingId)

        await logEvent(bookingId, 'deposit_held', event.id, pi.amount_capturable, 'succeeded')
        break
      }

      // ── Reembolso (liberación de depósito) ──
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const bookingId = charge.metadata?.booking_id
        if (!bookingId || charge.metadata?.type !== 'deposit') break

        await supabase
          .from('booking')
          .update({ deposit_status: 'refunded' })
          .eq('id', bookingId)

        await logEvent(bookingId, 'deposit_refunded', event.id, charge.amount_refunded, 'succeeded')
        break
      }

      // ── Connect: onboarding completado ──
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        if (!account.charges_enabled) break

        await supabase
          .from('user_profile')
          .update({ connect_onboarding_completed: true })
          .eq('stripe_connect_account_id', account.id)
        break
      }

      // ── Transfer al propietario completada ──
      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        const bookingId = transfer.metadata?.booking_id
        if (!bookingId) break

        await supabase
          .from('booking')
          .update({ stripe_transfer_id: transfer.id })
          .eq('id', bookingId)

        await logEvent(bookingId, 'transfer', event.id, transfer.amount, 'succeeded', {
          destination: transfer.destination,
        })
        break
      }
    }
  } catch (err) {
    console.error(`[webhook] Error processing ${event.type}:`, err.message)
    // Devolver 200 igualmente para que Stripe no reintente indefinidamente
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

// ─────────────────────────────────────────────────────────────────────────────
async function logEvent(
  bookingId: string,
  eventType: string,
  stripeEventId: string,
  amountCents: number,
  status: string,
  metadata?: Record<string, unknown>,
) {
  await supabase.from('payment_log').insert({
    booking_id: bookingId,
    event_type: eventType,
    stripe_event_id: stripeEventId,
    amount_cents: amountCents,
    status,
    metadata: metadata || {},
  }).catch((err) => console.error('[webhook] Log insert failed:', err.message))
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
