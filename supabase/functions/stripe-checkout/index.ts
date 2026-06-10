// supabase/functions/stripe-checkout/index.ts
// ─────────────────────────────────────────────
// Acciones:
//   create_checkout  → Crea booking (pending_payment) + Stripe Checkout Session
//   verify_payment   → Verifica estado de una session tras redirect
//   customer_portal  → Genera link al Stripe Customer Portal
// ─────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const PLATFORM_FEE_PCT = 0.12 // 12%

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── Auth ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'create_checkout':
        return await handleCreateCheckout(user, body)
      case 'verify_payment':
        return await handleVerifyPayment(user, body)
      case 'customer_portal':
        return await handleCustomerPortal(user, body)
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (err) {
    console.error('[stripe-checkout]', err)
    return json({ error: err.message }, 400)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// create_checkout
// ─────────────────────────────────────────────────────────────────────────────
async function handleCreateCheckout(
  user: { id: string; email?: string },
  body: {
    equipment_id: string
    start_date: string
    end_date: string
    days: number
    protection_plan?: string
    success_url: string
    cancel_url: string
  },
) {
  const { equipment_id, start_date, end_date, days, protection_plan, success_url, cancel_url } = body

  // ── 1. Validaciones básicas ──
  if (!equipment_id || !start_date || !end_date || !days || days < 1) {
    throw new Error('Missing or invalid booking parameters')
  }

  // ── 2. Cargar equipo + propietario (dos queries: sin FK embed) ──
  const { data: equipment, error: eqErr } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', equipment_id)
    .single()
  if (eqErr || !equipment) throw new Error('Equipment not found')

  const { data: owner, error: ownerErr } = await supabase
    .from('user_profile')
    .select('id, email, stripe_connect_account_id, connect_onboarding_completed')
    .eq('id', equipment.owner_id)
    .single()
  if (ownerErr || !owner) throw new Error('Owner profile not found')

  if (owner.id === user.id) throw new Error('Cannot book your own equipment')

  if (!owner.stripe_connect_account_id || !owner.connect_onboarding_completed) {
    throw new Error('Owner has not completed Stripe onboarding')
  }

  if (!['available', 'published'].includes(equipment.status)) {
    throw new Error('Equipment is not available for booking')
  }

  // ── 3. Cargar perfil del arrendatario ──
  const { data: renter, error: rErr } = await supabase
    .from('user_profile')
    .select('email, stripe_customer_id')
    .eq('id', user.id)
    .single()
  if (rErr || !renter) throw new Error('Renter profile not found')

  // ── 4. Calcular precios ──
  const pricePerDay = Number(equipment.price_per_day)
  const basePrice = round2(pricePerDay * days)

  const protectionRate = getProtectionRate(equipment.risk_level)
  const protectionFee = protection_plan ? round2(basePrice * protectionRate) : 0

  const platformFee = round2(basePrice * PLATFORM_FEE_PCT)

  const depositPct = getDepositPct(equipment.risk_level)
  const declaredValue = Number(equipment.declared_value || pricePerDay * 10)
  const depositAmount = round2(declaredValue * depositPct)

  const totalCharged = round2(basePrice + protectionFee)
  const ownerPayout = round2(basePrice - platformFee)

  // ── 5. Crear o reusar Stripe Customer ──
  // Verifica que el customer guardado exista realmente en Stripe. Un ID
  // inválido (borrado, o de otro entorno test/live) provoca "No such customer"
  // al crear la session; en ese caso creamos uno nuevo y lo persistimos.
  let stripeCustomerId = renter.stripe_customer_id
  let customerValid = false
  if (stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(stripeCustomerId)
      customerValid = !(existing as { deleted?: boolean }).deleted
    } catch (_) {
      customerValid = false
    }
  }
  if (!customerValid) {
    const customer = await stripe.customers.create({
      email: renter.email,
      metadata: { backlinego_user_id: user.id },
    })
    stripeCustomerId = customer.id
    await supabase
      .from('user_profile')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user.id)
  }

  // ── 6. Crear booking (status: pending_payment) ──
  const { data: booking, error: bErr } = await supabase
    .from('booking')
    .insert({
      equipment_id,
      equipment_title: equipment.title,
      owner_id: owner.id,
      renter_id: user.id,
      start_date,
      end_date,
      days,
      base_price_cents: Math.round(basePrice * 100),
      protection_fee_cents: Math.round(protectionFee * 100),
      protection_rate: protectionRate,
      platform_fee_cents: Math.round(platformFee * 100),
      deposit_cents: Math.round(depositAmount * 100),
      total_charged_cents: Math.round(totalCharged * 100),
      owner_payout_cents: Math.round(ownerPayout * 100),
      status: 'pending_payment',
      protection_plan: protection_plan || null,
      deposit_status: 'none',
    })
    .select()
    .single()
  if (bErr) throw bErr

  // ── 7. Crear Stripe Checkout Session (Destination Charge) ──
  const applicationFee = Math.round((platformFee + protectionFee) * 100)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Alquiler: ${equipment.title}`,
            description: `${days} día${days > 1 ? 's' : ''} · ${start_date} → ${end_date}`,
          },
          unit_amount: Math.round(totalCharged * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: owner.stripe_connect_account_id,
      },
      metadata: {
        booking_id: booking.id,
        equipment_id,
        owner_id: owner.id,
        renter_id: user.id,
        type: 'rental_payment',
      },
    },
    metadata: {
      booking_id: booking.id,
      deposit_amount_cents: Math.round(depositAmount * 100).toString(),
    },
    success_url: success_url || `${Deno.env.get('SITE_URL')}/Profile?success=true`,
    cancel_url: cancel_url || `${Deno.env.get('SITE_URL')}/equipment/${equipment_id}?cancelled=true`,
  })

  // ── 8. Guardar session ID en booking ──
  await supabase
    .from('booking')
    .update({ stripe_payment_intent_id: session.payment_intent as string })
    .eq('id', booking.id)

  // ── 9. Log (best-effort: no debe romper el checkout) ──
  const { error: logErr } = await supabase.from('payment_log').insert({
    booking_id: booking.id,
    event_type: 'charge',
    stripe_event_id: session.id,
    amount_cents: Math.round(totalCharged * 100),
    status: 'pending',
    metadata: {
      application_fee: applicationFee,
      deposit_amount_cents: Math.round(depositAmount * 100),
    },
  })
  if (logErr) console.error('[stripe-checkout] payment_log insert failed:', logErr)

  return json({
    checkout_url: session.url,
    booking_id: booking.id,
    session_id: session.id,
    breakdown: {
      base_price: basePrice,
      protection_fee: protectionFee,
      platform_fee: platformFee,
      deposit_amount: depositAmount,
      total_charged: totalCharged,
      owner_payout: ownerPayout,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// verify_payment — comprueba el estado de una Checkout Session tras redirect
// ─────────────────────────────────────────────────────────────────────────────
async function handleVerifyPayment(
  user: { id: string },
  body: { session_id: string },
) {
  const { session_id } = body
  if (!session_id) throw new Error('Missing session_id')

  const session = await stripe.checkout.sessions.retrieve(session_id)

  // Verificar que la session pertenece a un booking de este usuario
  const bookingId = session.metadata?.booking_id
  if (bookingId) {
    const { data: booking } = await supabase
      .from('booking')
      .select('renter_id, status')
      .eq('id', bookingId)
      .single()

    if (booking && booking.renter_id !== user.id) {
      throw new Error('Session does not belong to this user')
    }
  }

  return json({
    status: session.payment_status, // 'paid' | 'unpaid' | 'no_payment_required'
    booking_id: bookingId || null,
    customer_email: session.customer_details?.email || null,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// customer_portal — genera link al Stripe Customer Portal
// ─────────────────────────────────────────────────────────────────────────────
async function handleCustomerPortal(
  user: { id: string },
  body: { origin?: string },
) {
  // Obtener stripe_customer_id del usuario
  const { data: profile, error: pErr } = await supabase
    .from('user_profile')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()
  if (pErr || !profile) throw new Error('Profile not found')

  if (!profile.stripe_customer_id) {
    throw new Error('No Stripe customer found. Complete a booking first.')
  }

  const returnUrl = body.origin
    ? `${body.origin}/settings`
    : `${Deno.env.get('SITE_URL')}/settings`

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: returnUrl,
  })

  return json({
    url: portalSession.url,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getProtectionRate(riskLevel?: string): number {
  switch (riskLevel) {
    case 'bajo': return 0.04
    case 'medio': return 0.065
    case 'alto': return 0.10
    case 'critico': return 0.135
    default: return 0.065
  }
}

function getDepositPct(riskLevel?: string): number {
  switch (riskLevel) {
    case 'bajo': return 0.15
    case 'medio': return 0.30
    case 'alto': return 0.55
    case 'critico': return 0.85
    default: return 0.30
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
