import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
  try {
    console.log('[Stripe] === START Checkout Session ===');
    
    // 1. Prüfe Stripe Secret Key
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('[Stripe] ❌ STRIPE_SECRET_KEY nicht gesetzt!');
      return Response.json({ 
        error: 'Stripe-Konfiguration fehlt. Bitte kontaktiere den Support.',
        debug: 'STRIPE_SECRET_KEY missing'
      }, { status: 500 });
    }
    console.log('[Stripe] ✅ Secret Key gefunden');

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    // 2. User authentifizieren
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.error('[Stripe] ❌ Kein User authentifiziert');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[Stripe] ✅ User:', user.email);

    // 3. Request Body parsen
    const body = await req.json();
    const { plan_id } = body;
    console.log('[Stripe] Plan ID:', plan_id);

    // 4. Validiere Plan (Preise in Cent, EUR)
    const PLAN_CONFIG = {
      basic:           { price: 499,   interval: 'month', name: 'Basic' },
      pro:             { price: 999,   interval: 'month', name: 'Pro' },
      ultimate:        { price: 1999,  interval: 'month', name: 'Ultimate' },
      elite:           { price: 1999,  interval: 'month', name: 'Ultimate' },
      friends:         { price: 5499,  interval: 'year',  name: 'Freundschaft (Jahr)' },
      friends_monthly: { price: 3900,  interval: 'month', name: 'Freundschaft (Monat)' },
      trial_10_10:     { price: 1000,  interval: null,    name: 'Trial 10 Tage' }
    };

    const planConfig = PLAN_CONFIG[plan_id];
    if (!planConfig) {
      console.error('[Stripe] Ungueltiger Plan:', plan_id);
      return Response.json({ 
        error: 'Ungültiger Plan' 
      }, { status: 400 });
    }
    console.log('[Stripe] Plan gueltig:', plan_id);

    // 5. App-URL ermitteln
    const appUrl = new URL(req.url).origin;
    const appId = Deno.env.get('BASE44_APP_ID') || '68bb3d3b9f83dc1f55ef532b';
    
    const successUrl = `${appUrl}/apps/${appId}/PremiumPlans?session_id={CHECKOUT_SESSION_ID}&success=true&plan_id=${plan_id}`;
    const cancelUrl = `${appUrl}/apps/${appId}/PremiumPlans?canceled=true`;
    
    console.log('[Stripe] Success URL:', successUrl);
    console.log('[Stripe] Cancel URL:', cancelUrl);

    // 6. Erstelle Stripe Checkout Session
    console.log('[Stripe] Erstelle Session...');
    
    const isSubscription = planConfig.interval !== null;
    const intervalLabel = planConfig.interval === 'year' ? 'Jaehrliches' : 'Monatliches';

    const priceData = {
      currency: 'eur',
      product_data: {
        name: `CatchGBT ${planConfig.name} Plan`,
        description: isSubscription
          ? `${intervalLabel} Abo fuer ${planConfig.name} mit allen Features`
          : `Einmalkauf: ${planConfig.name}`,
        images: ['https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3d3b9f83dc1f55ef532b/e9d6eda08_icon_512.png'],
      },
      unit_amount: planConfig.price
    };
    if (isSubscription) {
      priceData.recurring = { interval: planConfig.interval, interval_count: 1 };
    }

    // Zahlungsmethoden: Karte enthaelt automatisch Google Pay und Apple Pay
    // (Wallet-Buttons erscheinen wenn Geraet/Browser sie unterstuetzt).
    // Weitere Methoden (PayPal/Klarna/SEPA) musst du im Stripe-Dashboard unter
    // Settings -> Payment methods aktivieren.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic'
        }
      },
      line_items: [{ price_data: priceData, quantity: 1 }],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        plan_id: plan_id,
        app_id: appId
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    console.log('[Stripe] ✅ Session erstellt:', session.id);
    console.log('[Stripe] Checkout URL:', session.url);
    console.log('[Stripe] === END Checkout Session ===');

    return Response.json({
      ok: true,
      checkout_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('[Stripe] ❌ FEHLER:', error.message);
    console.error('[Stripe] Stack:', error.stack);
    console.error('[Stripe] Type:', error.type);
    console.error('[Stripe] Code:', error.code);
    
    return Response.json({ 
      error: error.message || 'Fehler beim Erstellen der Checkout-Session',
      debug: {
        type: error.type,
        code: error.code,
        message: error.message
      }
    }, { status: 500 });
  }
});