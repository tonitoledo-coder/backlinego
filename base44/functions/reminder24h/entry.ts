/**
 * reminder24h — Cron diario que envía recordatorio de devolución a renters
 * cuyo booking vence mañana y sigue en estado 'active'.
 *
 * Automación recomendada: scheduled, diaria a las 10:00h.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only callable by admins or the scheduler (no user token)
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (isAuth) {
      const user = await base44.auth.me().catch(() => null);
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Calculate tomorrow's date in yyyy-MM-dd
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Fetch active bookings ending tomorrow
    const bookings = await base44.asServiceRole.entities.Booking.filter(
      { status: 'active', end_date: tomorrowStr },
      '-created_date',
      200
    );

    if (!bookings.length) {
      return Response.json({ sent: 0, message: 'No active bookings ending tomorrow' });
    }

    const results = await Promise.allSettled(
      bookings.map(async (booking) => {
        const renterEmail = booking.renter_email || booking.renter_id;
        if (!renterEmail || !renterEmail.includes('@')) return { skipped: booking.id };

        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'BacklineGo',
          to: renterEmail,
          subject: `Recordatorio: devuelve el equipo mañana — Reserva #${booking.id?.slice(-8)}`,
          body:
            `Hola,\n\n` +
            `Te recordamos que tu alquiler de la reserva #${booking.id?.slice(-8)} vence mañana (${tomorrowStr}).\n\n` +
            (booking.return_slot != null
              ? `⏰ Hora de devolución acordada: ${String(booking.return_slot).padStart(2, '0')}:00h\n\n`
              : '') +
            `Recuerda entregar el equipo en las condiciones acordadas. El propietario confirmará la devolución desde su perfil en BacklineGo.\n\n` +
            `¡Gracias por usar BacklineGo!\n\nEl equipo de BacklineGo`,
        });

        return { sent: booking.id };
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value?.sent).length;
    return Response.json({ sent, total: bookings.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});