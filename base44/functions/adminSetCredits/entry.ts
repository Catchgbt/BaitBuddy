import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { target_user_email, credits_amount } = body;

    if (!target_user_email || typeof credits_amount !== 'number') {
      return Response.json({ error: 'target_user_email und credits_amount erforderlich' }, { status: 400 });
    }

    // Wallet des Ziel-Benutzers finden oder erstellen
    let wallet = await base44.asServiceRole.entities.PremiumWallet.filter({ 
      user_id: target_user_email 
    }).then(results => results[0]);

    if (!wallet) {
      // Wallet erstellen falls nicht vorhanden
      wallet = await base44.asServiceRole.entities.PremiumWallet.create({
        user_id: target_user_email,
        purchased_credits: credits_amount,
        consumed_credits: 0,
        total_spent_eur: 0
      });
      
      console.log(`Created new wallet for ${target_user_email} with ${credits_amount} credits`);
    } else {
      // Bestehende Credits überschreiben
      wallet = await base44.asServiceRole.entities.PremiumWallet.update(wallet.id, {
        purchased_credits: credits_amount
      });
      
      console.log(`Updated wallet for ${target_user_email} to ${credits_amount} credits`);
    }

    // Admin-Event protokollieren
    await base44.asServiceRole.entities.PremiumEvent.create({
      user_id: target_user_email,
      event_type: 'admin_credit_grant',
      credits_amount: credits_amount,
      payload: {
        admin_user: user.email,
        timestamp: new Date().toISOString(),
        action: 'set_credits'
      }
    });

    return Response.json({
      ok: true,
      message: `${credits_amount.toLocaleString()} Credits für ${target_user_email} gesetzt`,
      wallet: {
        user_id: target_user_email,
        purchased_credits: wallet.purchased_credits,
        consumed_credits: wallet.consumed_credits,
        remaining_credits: wallet.purchased_credits - wallet.consumed_credits
      }
    });

  } catch (error) {
    console.error('Admin Set Credits Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});