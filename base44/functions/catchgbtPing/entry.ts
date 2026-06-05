import { createClientFromRequest } from "npm:@base44/sdk@0.7.0";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      // unauthenticated is fine for ping
    }

    return Response.json({
      ok: true,
      ts: new Date().toISOString(),
      authenticated: !!user,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});