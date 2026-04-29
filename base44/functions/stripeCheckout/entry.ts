import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ── Create or retrieve Stripe customer ──────────────────────────
    if (action === 'check_connect_status') {
  const account = await stripe.accounts.retrieve();
  
  return Response.json({
    id: account.id,
    country: account.country,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    capabilities: account.capabilities,
    controller: account.controller,          // ← clave para Connect
    settings: {
      dashboard: account.settings?.dashboard,
    },
    type: account.type,                      // standard | express | custom
  });
}
    if (action === 'test_create_connect') {
      try {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'ES',
          email: 'test-connect@backlinego.com',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        return Response.json({ 
          success: true, 
          account_id: account.id,
          type: account.type 
        });
      } catch (err) {
        return Response.json({ 
          success: false, 
          error: err.message,
          code: err.code
        });
      }
    }

    if (action === 'create_customer') {
      let customerId = user.stripe_customer_id;

      if (!customerId) {
        // Check if customer already exists by email
        const existing = await stripe.customers.list({ email: user.email, limit: 1 });
        if (existing.data.length > 0) {
          customerId = existing.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.full_name || user.email,
            metadata: { base44_user_id: user.id },
          });
          customerId = customer.id;
        }
        await base44.auth.updateMe({ stripe_customer_id: customerId, stripe_onboarding_completed: true });
      }

      return Response.json({ customer_id: customerId });
    }

    // ── Create checkout session (sandbox) ──────────────────────────
    if (action === 'create_checkout') {
      let customerId = user.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({ email: user.email, name: user.full_name || user.email });
        customerId = customer.id;
        await base44.auth.updateMe({ stripe_customer_id: customerId });
      }

      // Ensure "Perfil Pro" product & price exist
      let price;
      const products = await stripe.products.search({ query: 'name:"Perfil Pro BacklineGo"', limit: 1 });
      if (products.data.length > 0) {
        const prices = await stripe.prices.list({ product: products.data[0].id, active: true, limit: 1 });
        price = prices.data[0];
      }

      if (!price) {
        const product = await stripe.products.create({ name: 'Perfil Pro BacklineGo', description: 'Pago de prueba sandbox BacklineGo' });
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: 999, // 9.99 EUR in cents
          currency: 'eur',
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: price.id, quantity: 1 }],
        mode: 'payment',
        success_url: `${body.origin}/settings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${body.origin}/settings?payment=cancelled`,
        payment_method_options: {
          card: { request_three_d_secure: 'any' },
        },
      });

      return Response.json({ url: session.url, session_id: session.id });
    }

    // ── Verify payment session & log it ────────────────────────────
    if (action === 'verify_payment') {
      const { session_id } = body;
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === 'paid') {
        // Log payment
        await base44.asServiceRole.entities.PaymentLog.create({
          user_id: user.id,
          user_email: user.email,
          amount: session.amount_total / 100,
          currency: session.currency.toUpperCase(),
          status: 'completed',
          stripe_payment_id: session.payment_intent,
          description: 'Perfil Pro BacklineGo (sandbox)',
        });
        return Response.json({ success: true, amount: session.amount_total / 100, currency: session.currency });
      }

      return Response.json({ success: false, status: session.payment_status });
    }

    // ── Customer portal ────────────────────────────────────────────
    if (action === 'customer_portal') {
      const customerId = user.stripe_customer_id;
      if (!customerId) return Response.json({ error: 'No customer ID' }, { status: 400 });

      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${body.origin}/settings`,
      });

      return Response.json({ url: portal.url });
    }

    // ── Connect: crear cuenta Express para propietario ──────────────
    if (action === 'create_owner_connect_account') {
      const { owner_email } = body;

      // Buscar si ya tiene cuenta Connect en UserProfile
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({
        email: owner_email
      });
      const profile = profiles?.[0];

      if (profile?.stripe_connect_account_id) {
        return Response.json({
          already_exists: true,
          account_id: profile.stripe_connect_account_id
        });
      }

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        email: owner_email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: '5945',
          url: body.origin || 'https://backlinego.com',
        },
      });

      // Guardar en UserProfile
      if (profile) {
        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          stripe_connect_account_id: account.id,
          connect_onboarding_completed: false,
        });
      }

      return Response.json({ account_id: account.id });
    }

    // ── Connect: link de onboarding para el propietario ─────────────
    if (action === 'get_owner_onboarding_link') {
      const { account_id } = body;

      const link = await stripe.accountLinks.create({
        account: account_id,
        refresh_url: `${body.origin}/profile?connect=refresh`,
        return_url: `${body.origin}/profile?connect=success`,
        type: 'account_onboarding',
      });

      return Response.json({ url: link.url });
    }

    // ── Booking: crear Checkout Session real ────────────────────────
    if (action === 'create_booking_checkout') {
      const {
        booking_id,
        equipment_id,
        equipment_title,
        owner_email,
        base_price,
        protection_fee,
        deposit_amount,
        owner_connect_account_id,
      } = body;

      let customerId = user.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.full_name || user.email,
        });
        customerId = customer.id;
        await base44.auth.updateMe({ stripe_customer_id: customerId });
      }

      const platformFeeCents = Math.round(base_price * 0.12 * 100);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              unit_amount: Math.round(base_price * 100),
              product_data: { name: `Alquiler: ${equipment_title}` },
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: 'eur',
              unit_amount: Math.round(protection_fee * 100),
              product_data: { name: 'Protection Fee (Damage Waiver)' },
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        payment_intent_data: {
          application_fee_amount: platformFeeCents,
          transfer_data: owner_connect_account_id
            ? { destination: owner_connect_account_id }
            : undefined,
          metadata: {
            booking_id,
            equipment_id,
            owner_email,
            renter_email: user.email,
            deposit_amount: deposit_amount.toString(),
            type: 'booking_rental',
          },
        },
        metadata: {
          booking_id,
          deposit_amount: deposit_amount.toString(),
        },
        success_url: `${body.origin}/profile?booking=success&session_id={CHECKOUT_SESSION_ID}&booking_id=${booking_id}`,
        cancel_url: `${body.origin}/equipment/${equipment_id}?booking=cancelled`,
      });

      return Response.json({
        url: session.url,
        session_id: session.id,
      });
    }

    // ── Booking: verificar pago y crear depósito hold ────────────────
    if (action === 'confirm_booking_payment') {
      const { session_id, booking_id } = body;

      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['payment_intent'],
      });

      if (session.payment_status !== 'paid') {
        return Response.json({ success: false, status: session.payment_status });
      }

      const depositAmount = parseInt(session.metadata?.deposit_amount || '0');
      let depositIntentId = null;

      // Crear hold del depósito si aplica
      if (depositAmount > 0) {
        const depositIntent = await stripe.paymentIntents.create({
          amount: depositAmount * 100,
          currency: 'eur',
          customer: user.stripe_customer_id,
          capture_method: 'manual',
          confirm: true,
          payment_method: session.payment_intent?.payment_method,
          metadata: {
            booking_id,
            type: 'booking_deposit',
          },
          description: `Depósito reserva ${booking_id}`,
        });
        depositIntentId = depositIntent.id;
      }

      // Actualizar Booking
      const bookings = await base44.asServiceRole.entities.Booking.filter({
        id: booking_id
      });
      if (bookings?.[0]) {
        await base44.asServiceRole.entities.Booking.update(booking_id, {
          status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent?.id,
          stripe_deposit_intent_id: depositIntentId,
          deposit_status: depositIntentId ? 'held' : 'none',
        });
      }

      return Response.json({
        success: true,
        payment_intent_id: session.payment_intent?.id,
        deposit_intent_id: depositIntentId,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});