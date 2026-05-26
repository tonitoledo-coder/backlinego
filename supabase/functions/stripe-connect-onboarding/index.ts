// supabase/functions/stripe-connect-onboarding/index.ts
// ─────────────────────────────────────────────────────
// Acciones:
//   create_account   → Crea cuenta Express para el propietario
//   onboarding_link  → Genera link de onboarding Stripe
//   check_status     → Verifica estado de la cuenta conectada
// ─────────────────────────────────────────────────────

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── Auth: extraer usuario del JWT ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) throw new Error('Unauthorized')

    const { action, return_url } = await req.json()

    // ── Cargar perfil ──
    const { data: profile, error: profileErr } = await supabase
      .from('user_profile')
      .select('stripe_connect_account_id, connect_onboarding_completed, email, display_name')
      .eq('id', user.id)
      .single()
    if (profileErr) throw profileErr

    // ── ACTION: create_account ──
    if (action === 'create_account') {
      if (profile.stripe_connect_account_id) {
        return json({ account_id: profile.stripe_connect_account_id, already_exists: true })
      }

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        email: profile.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: '5733', // Musical Instruments Stores
          product_description: 'Alquiler de equipos musicales vía BacklineGo',
        },
        metadata: { backlinego_user_id: user.id },
      })

      await supabase
        .from('user_profile')
        .update({ stripe_connect_account_id: account.id })
        .eq('id', user.id)

      return json({ account_id: account.id, already_exists: false })
    }

    // ── ACTION: onboarding_link ──
    if (action === 'onboarding_link') {
      const accountId = profile.stripe_connect_account_id
      if (!accountId) throw new Error('No Stripe account — call create_account first')

      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: return_url || `${Deno.env.get('SITE_URL')}/settings?stripe=refresh`,
        return_url: return_url || `${Deno.env.get('SITE_URL')}/settings?stripe=complete`,
        type: 'account_onboarding',
      })

      return json({ url: link.url })
    }

    // ── ACTION: check_status ──
    if (action === 'check_status') {
      const accountId = profile.stripe_connect_account_id
      if (!accountId) return json({ has_account: false, charges_enabled: false, payouts_enabled: false })

      const account = await stripe.accounts.retrieve(accountId)

      // Actualizar flag si charges ya están habilitados
      if (account.charges_enabled && !profile.connect_onboarding_completed) {
        await supabase
          .from('user_profile')
          .update({ connect_onboarding_completed: true })
          .eq('id', user.id)
      }

      return json({
        has_account: true,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (err) {
    console.error('[stripe-connect-onboarding]', err)
    return json({ error: err.message }, 400)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
