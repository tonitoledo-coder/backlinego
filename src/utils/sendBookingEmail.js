/**
 * sendBookingEmail — helper de emails transaccionales de reservas.
 *
 * El contenido, la resolución de destinatarios y el envío (Resend) viven en la
 * edge function `send-email` (servidor), porque el cliente no puede leer el
 * email de la otra parte por RLS. Aquí solo disparamos el evento.
 *
 * Uso (sin cambios para los call sites):
 *   await sendBookingEmail('booking_confirmed', booking, { equipmentTitle, ... });
 *
 * events: booking_created | booking_confirmed | booking_cancelled |
 *         delivery_confirmed | return_confirmed | dispute_opened | dispute_resolved
 *
 * Es best-effort: un fallo de email nunca debe romper el flujo principal.
 */

import { supabase } from '@/lib/db';

export async function sendBookingEmail(event, booking, extra = {}) {
  if (!booking?.id) return;
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { event, booking_id: booking.id, extra },
    });
    if (error) console.warn('[sendBookingEmail] envío falló:', error.message || error);
  } catch (err) {
    console.warn('[sendBookingEmail] envío falló:', err);
  }
}
