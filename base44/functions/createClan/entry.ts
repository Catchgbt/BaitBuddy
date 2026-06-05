import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, competition_id } = await req.json();

    if (!name) {
      return Response.json({ error: 'Clanname erforderlich' }, { status: 400 });
    }

    const clan = await base44.entities.Clan.create({
      name,
      description: description || '',
      members: [user.email],
      founder_email: user.email,
      competition_id: competition_id || null,
      total_event_score: 0,
      total_catches: 0,
      average_size: 0
    });

    return Response.json({ 
      success: true,
      clan,
      message: 'Clan erfolgreich erstellt'
    });

  } catch (error) {
    console.error('Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});