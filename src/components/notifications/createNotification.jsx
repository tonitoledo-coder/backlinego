import { base44 } from '@/api/base44Client';

/**
 * Crea una notificación in-app para un usuario.
 * @param {Object} opts
 * @param {string} opts.user_email - Email del destinatario
 * @param {'quote_request'|'booking_confirmed'|'chat_message'|'equipment_available'|'general'} opts.type
 * @param {string} opts.title
 * @param {string} [opts.body]
 * @param {string} [opts.link_page] - Nombre de página destino (ej: 'Chat')
 * @param {string} [opts.link_params] - Parámetros URL (ej: '?id=abc')
 */
export async function createNotification({ user_email, type = 'general', title, body, link_page, link_params }) {
  if (!user_email || !title) return;
  await base44.entities.Notification.create({ user_email, type, title, body, link_page, link_params, read: false });
}