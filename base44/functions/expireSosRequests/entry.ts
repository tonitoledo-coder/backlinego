import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const activeRequests = await base44.asServiceRole.entities.SosRequest.filter(
    { status: 'active' }, '-created_at', 200
  );

  const now = new Date().toISOString();
  let expired = 0;

  for (const req of activeRequests) {
    if (req.expires_at && req.expires_at < now) {
      await base44.asServiceRole.entities.SosRequest.update(req.id, { status: 'expired' });
      expired++;
    }
  }

  return Response.json({ checked: activeRequests.length, expired });
});