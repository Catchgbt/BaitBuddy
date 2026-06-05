import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { credits, price_eur, payment_method = 'demo' } = body;

    if (!credits || !price_eur || credits < 500 || credits > 10000) {
      return Response.json({ error: 'Ungültige Credit-Menge oder Preis' }, { status: 400 });
    }

    // Validiere den Preis gegen unsere Formel
    const expectedPrice = Math.round((2.21 + (credits * 0.002778)) * 100) / 100;
    if (Math.abs(price_eur - expectedPrice) > 0.01) {
      return Response.json({ error: 'Preisvalidierung fehlgeschlagen' }, { status: 400 });
    }

    const userId = user.email;

    try {
      // Wallet laden oder erstellen
      let wallet = await base44.entities.PremiumWallet.filter({ user_id: userId }).then(results => results[0]);
      
      if (!wallet) {
        wallet = await base44.entities.PremiumWallet.create({
          user_id: userId,
          purchased_credits: 0,
          consumed_credits: 0,
          total_spent_eur: 0
        });
      }

      // Credits zum Wallet hinzufügen
      const updatedWallet = await base44.entities.PremiumWallet.update(wallet.id, {
        purchased_credits: wallet.purchased_credits + credits,
        total_spent_eur: (wallet.total_spent_eur || 0) + price_eur
      });

      // Purchase Event protokollieren
      await base44.entities.PremiumEvent.create({
        user_id: userId,
        event_type: 'purchase',
        credits_amount: credits,
        payload: {
          price_eur,
          payment_method,
          package_id: `credits-${credits}`,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Premium Purchase: User ${userId} bought ${credits} credits for ${price_eur} EUR`);

      return Response.json({
        ok: true,
        message: `${credits.toLocaleString()} Credits erfolgreich gekauft!`,
        wallet: {
          purchased_credits: updatedWallet.purchased_credits,
          consumed_credits: updatedWallet.consumed_credits,
          remaining_credits: updatedWallet.purchased_credits - updatedWallet.consumed_credits,
          total_spent_eur: updatedWallet.total_spent_eur
        }
      });

    } catch (dbError) {
      console.error('Database error during purchase:', dbError);
      return Response.json({ error: 'Fehler beim Speichern des Kaufs' }, { status: 500 });
    }

  } catch (error) {
    console.error('Purchase Premium Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});