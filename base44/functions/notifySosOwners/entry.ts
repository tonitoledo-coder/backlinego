import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CATEGORY_LABELS = {
  cuerdas: 'Cuerdas',
  teclados: 'Teclados / Piano',
  percusion: 'Percusión / Batería',
  dj_gear: 'DJ Gear',
  sonido_pa: 'Sonido PA',
  estudio_podcast: 'Estudio / Podcast',
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { category, city, expires_at, description, requester_email, sos_request_id } = await req.json();

  // Find all SOS-enabled equipment in the same category
  const allSosEquip = await base44.asServiceRole.entities.Equipment.filter({
    sos_available: true,
    category,
    status: 'available',
  }, '-created_date', 100);

  // Filter by city (loose match)
  const cityEquip = allSosEquip.filter(eq => {
    const eqCity = eq.location?.city?.toLowerCase() || '';
    const reqCity = city?.toLowerCase() || '';
    return eqCity.includes(reqCity) || reqCity.includes(eqCity);
  });

  // Get unique owner emails
  const ownerEmails = [...new Set(cityEquip.map(eq => eq.created_by).filter(Boolean))];

  // Don't notify the requester themselves
  const toNotify = ownerEmails.filter(email => email !== requester_email);

  const expiresDate = expires_at ? new Date(expires_at) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiresStr = expiresDate.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  const catLabel = CATEGORY_LABELS[category] || category;

  const emailBody = `🚨 SOLICITUD URGENTE SOS en BacklineGo

Categoría: ${catLabel}
Ciudad: ${city}
Descripción: ${description}

Responde antes de: ${expiresStr} (24h desde ahora)

Un músico necesita este equipo HOY. Accede a BacklineGo y revisa la sección "Solicitudes SOS" en tu dashboard para responder.

Si tienes disponible, haz clic aquí para responder:
https://backlinego.base44.app/Profile

El equipo de BacklineGo`;

  let sent = 0;
  for (const email of toNotify) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `🚨 Solicitud urgente de ${catLabel} en ${city} — responde antes de ${expiresStr}`,
        body: emailBody,
      });
      // Also create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        user_email: email,
        type: 'general',
        title: `🚨 SOS: ${catLabel} en ${city}`,
        body: `Solicitud urgente - responde antes de ${expiresStr}`,
        link_page: 'Profile',
        link_params: '?tab=sos',
        read: false,
      });
      sent++;
    } catch (_) {}
  }

  return Response.json({ notified: sent, owners_found: toNotify.length });
});