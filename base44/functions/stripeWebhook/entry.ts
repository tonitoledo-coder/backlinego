import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Verificar firma del webhook
  const signature = req.headers.get('stripe-signature') || '';
  const rawBody = await req.text();

  let event;
  try {
    event = WEBHOOK_SECRET
      ? stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET)
      : JSON.parse(rawBody);
  } catch (err) {
    return Response.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const data = event.data.object;

  try {
    switch (event.type) {

      // Pago principal completado
      case 'checkout.session.completed': {
        const bookingId = data.metadata?.booking_id;
        if (!bookingId || data.metadata?.type !== 'booking_rental') break;

        await base44.asServiceRole.entities.Booking.update(bookingId, {
          status: 'confirmed',
          stripe_payment_intent_id: data.payment_intent,
        });
        break;
      }

      // Depósito autorizado (hold listo)
      case 'payment_intent.amount_capturable_updated': {
        const bookingId = data.metadata?.booking_id;
        if (!bookingId || data.metadata?.type !== 'booking_deposit') break;

        await base44.asServiceRole.entities.Booking.update(bookingId, {
          deposit_status: 'held',
          stripe_deposit_intent_id: data.id,
        });
        break;
      }

      // Cuenta Connect del propietario verificada
      case 'account.updated': {
        if (!data.charges_enabled) break;

        const profiles = await base44.asServiceRole.entities.UserProfile.filter({
          stripe_connect_account_id: data.id,
        });
        if (profiles?.[0]) {
          await base44.asServiceRole.entities.UserProfile.update(
            profiles[0].id,
            { connect_onboarding_completed: true }
          );
        }
        break;
      }

      // Pago de reserva fallido
      case 'payment_intent.payment_failed': {
        const bookingId = data.metadata?.booking_id;
        if (!bookingId || data.metadata?.type !== 'booking_rental') break;

        await base44.asServiceRole.entities.Booking.update(bookingId, {
          status: 'cancelled',
          cancellation_reason: `Pago fallido: ${data.last_payment_error?.message || 'unknown'}`,
        });
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  return Response.json({ received: true });
});