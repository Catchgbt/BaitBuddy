import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.email;

    // Wallet-Status laden oder erstellen
    let wallet = await base44.entities.PremiumWallet.filter({ user_id: userId }).then(results => results[0]);
    
    if (!wallet) {
      // Bestimme Startwert basierend auf Benutzerrolle
      const startingCredits = user.role === 'admin' ? 100000 : 10000;
      
      // Erstelle Wallet mit entsprechendem Startwert
      try {
        wallet = await base44.entities.PremiumWallet.create({
          user_id: userId,
          purchased_credits: startingCredits,
          consumed_credits: 0,
          total_spent_eur: 0
        });

        console.log(`✅ New PremiumWallet created for ${userId} (${user.role}) with ${startingCredits} starting credits`);
      } catch (createError) {
        console.error('❌ Failed to create wallet:', createError);
        return Response.json({ 
          error: 'Failed to create wallet',
          details: createError.message 
        }, { status: 500 });
      }
    }

    // Validierung: Sicherstellen dass consumed_credits nicht negativ ist
    if (wallet.consumed_credits < 0) {
      console.warn(`⚠️ Negative consumed_credits detected for ${userId}, resetting to 0`);
      wallet = await base44.entities.PremiumWallet.update(wallet.id, {
        consumed_credits: 0
      });
    }

    // Validierung: Sicherstellen dass purchased_credits mindestens consumed_credits ist
    if (wallet.purchased_credits < wallet.consumed_credits) {
      console.warn(`⚠️ purchased_credits < consumed_credits for ${userId}, correcting...`);
      wallet = await base44.entities.PremiumWallet.update(wallet.id, {
        purchased_credits: wallet.consumed_credits
      });
    }

    // Aktive Session suchen
    const activeSession = await base44.entities.UsageSession.filter({ 
      user_id: userId, 
      status: 'active' 
    }).then(sessions => sessions[0]);

    // Verbleibende Credits berechnen
    const remainingCredits = Math.max(0, wallet.purchased_credits - wallet.consumed_credits);
    
    console.log(`📊 Premium Wallet Status for ${userId}: ${remainingCredits} credits remaining (${wallet.purchased_credits} purchased - ${wallet.consumed_credits} consumed)`);
    
    const response = {
      ok: true,
      wallet: {
        id: wallet.id,
        purchased_credits: wallet.purchased_credits,
        consumed_credits: wallet.consumed_credits,
        remaining_credits: remainingCredits,
        total_spent_eur: wallet.total_spent_eur || 0
      },
      active_session: activeSession ? {
        session_id: activeSession.session_id,
        feature_id: activeSession.feature_id,
        started_at: activeSession.started_at,
        billed_credits: activeSession.billed_credits
      } : null,
      status: remainingCredits > 0 ? 'active' : 'exhausted',
      user_role: user.role,
      user_id: userId
    };

    return Response.json(response);
    
  } catch (error) {
    console.error('❌ Get Premium Wallet Status Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});