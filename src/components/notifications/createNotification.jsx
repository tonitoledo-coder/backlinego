import { db } from '@/lib/db';

/**
 * Crea una notificación in-app para un usuario.
 * @param {Object} opts
 * @param {string} opts.user_id - UUID del destinatario (user_profile.id)
 * @param {'quote_request'|'booking_confirmed'|'chat_message'|'equipment_available'|'general'} opts.type
 * @param {string} opts.title
 * @param {string} [opts.message]
 * @param {string} [opts.link] - URL completa de destino (ej: '/Chat?id=abc')
 * @param {string} [opts.related_booking_id]
 * @param {string} [opts.related_dispute_id]
 */
export async function createNotification({ user_id, type = 'general', title, message, link, related_booking_id, related_dispute_id }) {
  if (!user_id || !title) return;
  await db.entities.Notification.create({
    user_id,
    type,
    title,
    message,
    link,
    related_booking_id,
    related_dispute_id,
  });
}
