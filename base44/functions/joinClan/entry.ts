import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clan_id } = await req.json();

    if (!clan_id) {
      return Response.json({ error: 'clan_id erforderlich' }, { status: 400 });
    }

    const clans = await base44.asServiceRole.entities.Clan.list('', 1000);
    const clan = clans.find(c => c.id === clan_id);

    if (!clan) {
      return Response.json({ error: 'Clan nicht gefunden' }, { status: 404 });
    }

    if (clan.members.includes(user.email)) {
      return Response.json({ error: 'Du bist bereits Mitglied' }, { status: 400 });
    }

    if (clan.members.length >= 10) {
      return Response.json({ error: 'Clan ist voll (max 10 Mitglieder)' }, { status: 400 });
    }

    const updatedMembers = [...clan.members, user.email];

    await base44.asServiceRole.entities.Clan.update(clan_id, {
      members: updatedMembers
    });

    return Response.json({ 
      success: true,
      message: 'Erfolgreich beigetreten'
    });

  } catch (error) {
    console.error('Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});