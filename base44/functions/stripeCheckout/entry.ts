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

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});