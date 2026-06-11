// supabase/functions/send-email/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Email transaccional vía Resend. Centraliza plantillas + resolución de
// destinatarios en servidor (service role), porque el cliente no puede leer
// el email de la otra parte por RLS.
//
// Entrada: { event, booking_id, extra }
//   event ∈ booking_created | booking_confirmed | booking_cancelled |
//           delivery_confirmed | return_confirmed | dispute_opened |
//           dispute_resolved
//
// Secrets necesarios:
//   RESEND_API_KEY  — API key de Resend
//   EMAIL_FROM      — remitente verificado, ej. "BacklineGo <noreply@tresdetres.club>"
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'BacklineGo <noreply@tresdetres.club>'
const ADMIN_EMAIL = 'hola@backlinego.com'
const APP_URL = Deno.env.get('SITE_URL') || 'https://backlinego.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Plantillas (es) ───────────────────────────────────────────────────────────
const TEXTS: Record<string, { subject: (d: any) => string; body: (d: any) => string }> = {
  booking_created: {
    subject: (d) => `Nueva reserva confirmada para ${d.equipment}`,
    body: (d) =>
      `Hola,\n\nTienes una nueva reserva confirmada para "${d.equipment}".\n\n` +
      `📅 Fechas: ${d.startDate} → ${d.endDate}\n💶 Importe total: €${d.totalPrice}\n🔖 Reserva: #${d.bookingRef}\n\n` +
      `Accede a BacklineGo para gestionar la entrega:\n${APP_URL}/Profile\n\nEl equipo de BacklineGo`,
  },
  booking_confirmed: {
    subject: (d) => `¡Tu alquiler está confirmado! ${d.equipment}`,
    body: (d) =>
      `¡Enhorabuena!\n\nTu reserva para "${d.equipment}" ha sido confirmada.\n\n` +
      `📅 Fechas: ${d.startDate} → ${d.endDate}\n💶 Importe total: €${d.totalPrice}\n🔖 Reserva: #${d.bookingRef}\n\n` +
      `Accede a tu perfil para ver los detalles y el código QR de entrega:\n${APP_URL}/Profile\n\nEl equipo de BacklineGo`,
  },
  booking_cancelled: {
    subject: (d) => `Alquiler cancelado: ${d.equipment}`,
    body: (d) =>
      `Tu reserva para "${d.equipment}" ha sido cancelada.\n\n` +
      `📅 Fechas: ${d.startDate} → ${d.endDate}\n🔖 Reserva: #${d.bookingRef}\n` +
      (d.cancelledBy ? `👤 Cancelado por: ${d.cancelledBy}\n` : '') +
      (d.refundPct != null ? `💶 Reembolso: ${d.refundPct}% (€${d.refundAmount})\n` : '') +
      `\nSi tienes dudas, contáctanos en ${ADMIN_EMAIL}.\n\nEl equipo de BacklineGo`,
  },
  delivery_confirmed: {
    subject: (d) => `Entrega confirmada — alquiler activo: ${d.equipment}`,
    body: (d) =>
      `La entrega de "${d.equipment}" ha sido confirmada.\n\n` +
      `📅 Fechas: ${d.startDate} → ${d.endDate}\n🔖 Reserva: #${d.bookingRef}\n\n` +
      `El alquiler está ahora activo. Recuerda devolver el equipo antes del ${d.endDate}.\n\nEl equipo de BacklineGo`,
  },
  return_confirmed: {
    subject: (d) => `Devolución confirmada — valoración disponible: ${d.equipment}`,
    body: (d) =>
      `¡La devolución de "${d.equipment}" ha sido registrada correctamente!\n\n` +
      `📅 Fechas: ${d.startDate} → ${d.endDate}\n🔖 Reserva: #${d.bookingRef}\n\n` +
      `La fianza se liberará en breve. ¡Gracias por usar BacklineGo!\n\nEl equipo de BacklineGo`,
  },
  dispute_opened: {
    subject: (d) => `Se ha abierto una disputa en tu alquiler: ${d.equipment}`,
    body: (d) =>
      `Se ha abierto una disputa en la reserva #${d.bookingRef} para "${d.equipment}".\n\n` +
      (d.openedBy ? `👤 Abierta por: ${d.openedBy}\n` : '') +
      (d.disputeType ? `📋 Motivo: ${d.disputeType}\n` : '') +
      `\nAccede a tu perfil para responder:\n${APP_URL}/Profile\n\n` +
      `Resolveremos la disputa en 48-72h.\n\nEl equipo de BacklineGo`,
  },
  dispute_resolved: {
    subject: (d) => `Resolución de disputa: ${d.equipment}`,
    body: (d) =>
      `La disputa en la reserva #${d.bookingRef} para "${d.equipment}" ha sido resuelta.\n\n` +
      (d.resolutionLabel ? `⚖️ Resultado: ${d.resolutionLabel}\n` : '') +
      (d.resolutionNotes ? `📝 Notas: ${d.resolutionNotes}\n` : '') +
      (d.depositActionLabel ? `💳 Acción sobre la fianza: ${d.depositActionLabel}\n` : '') +
      `\nSi tienes dudas, responde a este email.\n\nEl equipo de BacklineGo`,
  },
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    const { event, booking_id, extra = {} } = await req.json()
    const template = TEXTS[event]
    if (!template) throw new Error(`Unknown email event: ${event}`)
    if (!booking_id) throw new Error('Missing booking_id')

    // ── Cargar booking + emails de las partes (service role bypassa RLS) ──
    const { data: booking, error: bErr } = await supabase
      .from('booking')
      .select('id, renter_id, owner_id, equipment_title, start_date, end_date, total_charged_cents')
      .eq('id', booking_id)
      .single()
    if (bErr || !booking) throw new Error('Booking not found')

    const [{ data: renter }, { data: owner }] = await Promise.all([
      supabase.from('user_profile').select('email').eq('id', booking.renter_id).single(),
      supabase.from('user_profile').select('email').eq('id', booking.owner_id).single(),
    ])

    const data = {
      equipment: extra.equipmentTitle || booking.equipment_title || `Reserva #${String(booking.id).slice(-8)}`,
      bookingRef: String(booking.id).slice(-8),
      startDate: booking.start_date || '',
      endDate: booking.end_date || '',
      totalPrice: ((booking.total_charged_cents || 0) / 100).toFixed(2),
      ...extra,
    }

    // ── Resolver destinatarios (solo partes reales del booking + admin) ──
    const renterEmail = renter?.email
    const ownerEmail = owner?.email
    const recipients = new Set<string>()
    switch (event) {
      case 'booking_created':
        if (ownerEmail) recipients.add(ownerEmail)
        break
      case 'booking_confirmed':
        if (renterEmail) recipients.add(renterEmail)
        break
      case 'booking_cancelled':
      case 'delivery_confirmed':
      case 'return_confirmed':
      case 'dispute_resolved':
        if (renterEmail) recipients.add(renterEmail)
        if (ownerEmail) recipients.add(ownerEmail)
        break
      case 'dispute_opened':
        if (renterEmail) recipients.add(renterEmail)
        if (ownerEmail) recipients.add(ownerEmail)
        recipients.add(ADMIN_EMAIL)
        break
    }
    const to = [...recipients]
    if (to.length === 0) return json({ ok: true, skipped: 'no recipients' })

    const subject = template.subject(data)
    const text = template.body(data)
    const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a">${
      text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')
    }</div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, text, html }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Resend error ${res.status}: ${errBody}`)
    }
    const result = await res.json()
    return json({ ok: true, id: result.id, sent_to: to.length })
  } catch (err) {
    console.error('[send-email]', err)
    return json({ error: err.message }, 400)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
