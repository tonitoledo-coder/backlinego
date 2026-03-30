import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { event, data } = await req.json();

    // Only act on create/update where is_active was set to true
    if (!data || !data.is_active) {
      return Response.json({ ok: true, skipped: true });
    }

    const activatedId = event.entity_id;
    const docType = data.type;

    if (!docType) {
      return Response.json({ ok: true, skipped: true, reason: 'no type' });
    }

    // Find all other active documents of the same type
    const others = await base44.asServiceRole.entities.LegalDocument.filter({
      type: docType,
      is_active: true,
    });

    const toDeactivate = others.filter(d => d.id !== activatedId);

    await Promise.all(
      toDeactivate.map(d =>
        base44.asServiceRole.entities.LegalDocument.update(d.id, { is_active: false })
      )
    );

    return Response.json({ ok: true, deactivated: toDeactivate.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});