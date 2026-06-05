import { createClient } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return Response.json({ error: 'No signature' }, { status: 400 });
  }

  let event;
  
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Service-Role Client für Admin-Operationen
  const base44 = createClient({
    app_id: Deno.env.get('BASE44_APP_ID'),
    service_role: true
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Hole User ID aus Metadata
        const userId = session.metadata?.user_id || session.client_reference_id;
        const planId = session.metadata?.plan_id;

        if (!userId || !planId) {
          console.error('Missing user_id or plan_id in session metadata');
          return Response.json({ error: 'Missing metadata' }, { status: 400 });
        }

        // Laufzeit je Plan: friends = 1 Jahr, trial_10_10 = 10 Tage, alle anderen = 30 Tage
        let durationDays = 30;
        if (planId === 'friends') durationDays = 365;
        else if (planId === 'trial_10_10') durationDays = 10;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        // Normalisiere elite/trial -> ultimate
        let normalizedPlan = planId;
        if (planId === 'elite') normalizedPlan = 'ultimate';
        if (planId === 'trial_10_10') normalizedPlan = 'ultimate';

        // Aktiviere Premium-Plan für den User
        await base44.entities.User.update(userId, {
          premium_plan_id: normalizedPlan,
          premium_expires_at: expiresAt.toISOString()
        });

        console.log(`Plan activated: ${normalizedPlan} (${durationDays}d) for user ${userId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;
        
        if (!userId) break;

        // Bei Abo-Verlängerung das Ablaufdatum aktualisieren
        if (subscription.status === 'active') {
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          
          await base44.entities.User.update(userId, {
            premium_expires_at: currentPeriodEnd.toISOString()
          });
          
          console.log(`✅ Subscription renewed for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;
        
        if (!userId) break;

        // Abo wurde gekündigt - setze auf Free
        await base44.entities.User.update(userId, {
          premium_plan_id: 'free',
          premium_expires_at: null
        });
        
        console.log(`❌ Subscription canceled for user ${userId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscription = invoice.subscription;
        
        if (subscription) {
          // Hole User ID über Subscription Metadata
          const sub = await stripe.subscriptions.retrieve(subscription);
          const userId = sub.metadata?.user_id;
          
          if (userId) {
            console.warn(`⚠️ Payment failed for user ${userId}`);
            // Optional: Benachrichtige den User über fehlgeschlagene Zahlung
          }
        }
        break;
      }
    }

    return Response.json({ received: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});