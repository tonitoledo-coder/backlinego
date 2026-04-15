import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Find bookings completed ~24h ago (between 23h and 25h ago)
  const now = Date.now();
  const windowStart = new Date(now - 25 * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(now - 23 * 60 * 60 * 1000).toISOString();

  const completedBookings = await base44.asServiceRole.entities.Booking.filter({ status: 'completed' }, '-updated_date', 200);

  const toRemind = completedBookings.filter(b => {
    const updatedAt = b.updated_date || b.created_date;
    if (!updatedAt) return false;
    return updatedAt >= windowStart && updatedAt <= windowEnd;
  });

  let sent = 0;
  for (const booking of toRemind) {
    // Check if each party has already reviewed
    const [renterReviews, ownerReviews] = await Promise.all([
      base44.asServiceRole.entities.Review.filter({ booking_id: booking.id, reviewer_role: 'renter' }),
      base44.asServiceRole.entities.Review.filter({ booking_id: booking.id, reviewer_role: 'owner' }),
    ]);

    const needsRenterReview = renterReviews.length === 0 && booking.renter_id;
    const needsOwnerReview  = ownerReviews.length === 0  && booking.owner_id;

    if (needsRenterReview) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: booking.renter_id,
        subject: '⭐ ¿Cómo fue tu alquiler? Valora tu experiencia',
        body: `Hola,\n\nHan pasado 24 horas desde que completaste tu alquiler. ¡Nos encantaría que valorases tu experiencia!\n\nPuedes hacerlo desde tu perfil en BacklineGo en la sección "Mis reservas".\n\nTienes hasta 14 días desde la finalización del alquiler para dejar tu valoración.\n\n¡Gracias!\nEl equipo de BacklineGo`,
      });
      sent++;
    }

    if (needsOwnerReview) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: booking.owner_id,
        subject: '⭐ Valora al inquilino de tu equipo',
        body: `Hola,\n\nHan pasado 24 horas desde que se completó la reserva de tu equipo. ¡Valora al inquilino!\n\nPuedes hacerlo desde tu perfil en BacklineGo en la sección "Reservas entrantes".\n\nTienes hasta 14 días desde la finalización para dejar tu valoración.\n\n¡Gracias!\nEl equipo de BacklineGo`,
      });
      sent++;
    }
  }

  return Response.json({ checked: toRemind.length, reminders_sent: sent });
});