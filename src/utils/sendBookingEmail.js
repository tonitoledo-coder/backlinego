/**
 * sendBookingEmail — helper centralizado para emails transaccionales de reservas.
 *
 * Uso:
 *   import { sendBookingEmail } from '@/utils/sendBookingEmail';
 *   await sendBookingEmail('booking_created', booking, { ownerEmail, equipmentTitle });
 *
 * events:
 *   booking_created       → owner
 *   booking_confirmed     → renter
 *   booking_cancelled     → renter + owner
 *   delivery_confirmed    → renter + owner  (ACTIVE)
 *   return_confirmed      → renter + owner  (COMPLETED)
 *   dispute_opened        → other party + admin
 *   dispute_resolved      → renter + owner
 *
 * TODO (Fase 2 — scheduled job):
 *   reminder_24h          → renter
 *   Implementar como automation tipo "scheduled" o cron que corra diariamente,
 *   filtre bookings donde end_date = tomorrow AND status = 'active',
 *   y llame a sendBookingEmail('reminder_24h', booking, { renterEmail, equipmentTitle }).
 */

import { base44 } from '@/api/base44Client';

const ADMIN_EMAIL = 'hola@backlinego.com';
const APP_URL = 'https://backlinego.com';

const TEXTS = {
  es: {
    booking_created: {
      subject: (eq) => `Nueva solicitud de alquiler para ${eq}`,
      body: (d) =>
        `Hola,\n\nTienes una nueva solicitud de alquiler para "${d.equipment}".\n\n` +
        `📅 Fechas: ${d.startDate} → ${d.endDate}\n` +
        `💶 Importe total: €${d.totalPrice}\n` +
        `🔖 Reserva: #${d.bookingRef}\n\n` +
        `Accede a BacklineGo para confirmar o gestionar la reserva:\n${APP_URL}/Profile\n\n` +
        `El equipo de BacklineGo`,
    },
    booking_confirmed: {
      subject: (eq) => `¡Tu alquiler está confirmado! ${eq}`,
      body: (d) =>
        `¡Enhorabuena!\n\nTu reserva para "${d.equipment}" ha sido confirmada.\n\n` +
        `📅 Fechas: ${d.startDate} → ${d.endDate}\n` +
        `💶 Importe total: €${d.totalPrice}\n` +
        `🔖 Reserva: #${d.bookingRef}\n\n` +
        `Accede a tu perfil para ver los detalles y el código QR de entrega:\n${APP_URL}/Profile\n\n` +
        `El equipo de BacklineGo`,
    },
    booking_cancelled: {
      subject: (eq) => `Alquiler cancelado: ${eq}`,
      body: (d) =>
        `Tu reserva para "${d.equipment}" ha sido cancelada.\n\n` +
        `📅 Fechas: ${d.startDate} → ${d.endDate}\n` +
        `🔖 Reserva: #${d.bookingRef}\n` +
        (d.cancelledBy ? `👤 Cancelado por: ${d.cancelledBy}\n` : '') +
        (d.refundPct != null ? `💶 Reembolso: ${d.refundPct}% (€${d.refundAmount})\n` : '') +
        `\nSi tienes dudas, contáctanos en ${ADMIN_EMAIL}.\n\nEl equipo de BacklineGo`,
    },
    delivery_confirmed: {
      subject: (eq) => `Entrega confirmada — alquiler activo: ${eq}`,
      body: (d) =>
        `¡La entrega de "${d.equipment}" ha sido confirmada.\n\n` +
        `📅 Fechas: ${d.startDate} → ${d.endDate}\n` +
        `🔖 Reserva: #${d.bookingRef}\n\n` +
        `El alquiler está ahora activo. Recuerda devolver el equipo antes del ${d.endDate}.\n\n` +
        `El equipo de BacklineGo`,
    },
    return_confirmed: {
      subject: (eq) => `Devolución confirmada — valoración disponible: ${eq}`,
      body: (d) =>
        `¡La devolución de "${d.equipment}" ha sido registrada correctamente!\n\n` +
        `📅 Fechas: ${d.startDate} → ${d.endDate}\n` +
        `🔖 Reserva: #${d.bookingRef}\n\n` +
        `El depósito en escrow será liberado en breve. ¡Gracias por usar BacklineGo!\n\n` +
        `El equipo de BacklineGo`,
    },
    dispute_opened: {
      subject: (eq) => `Se ha abierto una disputa en tu alquiler: ${eq}`,
      body: (d) =>
        `Se ha abierto una disputa en la reserva #${d.bookingRef} para "${d.equipment}".\n\n` +
        `👤 Abierta por: ${d.openedBy}\n` +
        `📋 Motivo: ${d.disputeType}\n\n` +
        `Por favor, accede a tu perfil en BacklineGo para responder:\n${APP_URL}/Profile\n\n` +
        `Resolveremos la disputa en un plazo de 48-72h.\n\nEl equipo de BacklineGo`,
    },
    dispute_resolved: {
      subject: (eq) => `Resolución de disputa: ${eq}`,
      body: (d) =>
        `La disputa en la reserva #${d.bookingRef} para "${d.equipment}" ha sido resuelta.\n\n` +
        `⚖️ Resultado: ${d.resolutionLabel}\n` +
        (d.resolutionNotes ? `📝 Notas: ${d.resolutionNotes}\n` : '') +
        `💳 Acción sobre la fianza: ${d.depositActionLabel}\n\n` +
        `Si tienes dudas, responde a este email.\n\nEl equipo de BacklineGo`,
    },
    // TODO Fase 2 — scheduled job diario:
    // reminder_24h: {
    //   subject: (eq) => `Recordatorio: devuelve el equipo mañana — ${eq}`,
    //   body: (d) => `Tu alquiler de "${d.equipment}" vence mañana (${d.endDate}).\n\n` +
    //     `Recuerda devolver el equipo antes de las ${d.returnSlot || '23:59'}h.\n\n` +
    //     `El equipo de BacklineGo`,
    // },
  },
};

const RESOLUTION_LABELS = {
  resolved_owner:   'Razón dada al propietario',
  resolved_renter:  'Razón dada al arrendatario',
  resolved_partial: 'Resolución parcial acordada',
  closed:           'Disputa cerrada',
};

const DEPOSIT_ACTION_LABELS = {
  return_to_renter:  'Devolución de fianza al arrendatario',
  transfer_to_owner: 'Fianza transferida al propietario',
  split:             'Fianza dividida a partes iguales',
  none:              'Sin acción sobre la fianza',
};

/**
 * @param {string} event  - uno de los eventos listados arriba
 * @param {object} booking - objeto Booking completo
 * @param {object} extra  - datos adicionales según el evento
 */
export async function sendBookingEmail(event, booking, extra = {}) {
  const lang = 'es'; // TODO: usar extra.lang || navigator.language?.slice(0,2) || 'es'
  const t = TEXTS[lang] || TEXTS.es;
  const template = t[event];
  if (!template) return;

  const eq = extra.equipmentTitle || `Reserva #${booking.id?.slice(-8)}`;
  const bookingRef = booking.id?.slice(-8) || booking.id;
  const startDate = booking.start_date || '';
  const endDate = booking.end_date || '';
  const totalPrice = booking.total_price?.toFixed ? booking.total_price.toFixed(2) : booking.total_price;

  const data = {
    equipment: eq,
    bookingRef,
    startDate,
    endDate,
    totalPrice,
    ...extra,
  };

  const subject = template.subject(eq);
  const body = template.body(data);

  const recipients = [];

  switch (event) {
    case 'booking_created':
      if (extra.ownerEmail) recipients.push(extra.ownerEmail);
      break;
    case 'booking_confirmed':
      if (extra.renterEmail) recipients.push(extra.renterEmail);
      break;
    case 'booking_cancelled':
      if (extra.renterEmail) recipients.push(extra.renterEmail);
      if (extra.ownerEmail && extra.ownerEmail !== extra.renterEmail) recipients.push(extra.ownerEmail);
      break;
    case 'delivery_confirmed':
    case 'return_confirmed':
      if (extra.renterEmail) recipients.push(extra.renterEmail);
      if (extra.ownerEmail && extra.ownerEmail !== extra.renterEmail) recipients.push(extra.ownerEmail);
      break;
    case 'dispute_opened':
      if (extra.otherPartyEmail) recipients.push(extra.otherPartyEmail);
      recipients.push(ADMIN_EMAIL);
      break;
    case 'dispute_resolved':
      if (extra.renterEmail) recipients.push(extra.renterEmail);
      if (extra.ownerEmail && extra.ownerEmail !== extra.renterEmail) recipients.push(extra.ownerEmail);
      break;
    default:
      break;
  }

  await Promise.allSettled(
    recipients.map(to =>
      base44.integrations.Core.SendEmail({ to, subject, body, from_name: 'BacklineGo' })
    )
  );
}