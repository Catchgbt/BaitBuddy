import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { feature_id } = body;
    
    if (!feature_id) {
      return Response.json({ error: 'feature_id required' }, { status: 400 });
    }

    const planId = user.premium_plan_id || 'free';
    const expiresAt = user.premium_expires_at;
    
    let isPlanActive = true;
    if (planId !== 'free' && expiresAt) {
      const now = new Date();
      const expires = new Date(expiresAt);
      isPlanActive = expires > now;
    }

    const effectivePlan = isPlanActive ? planId : 'free';
    
    const allPlans = ['free', 'basic', 'pro', 'elite', 'ultimate'];
    const featureAccess = {
      'dashboard': allPlans,
      'logbook': allPlans,
      'ranking': allPlans,
      'community': allPlans,
      'profile': allPlans,
      'settings': allPlans,
      'weather_basic': allPlans,
      'arcade': allPlans,
      'gear': allPlans,
      'weather_alerts_basic': allPlans,
      'map_advanced': allPlans,
      'rules': allPlans,
      'trips': allPlans,
      'ai_chat_standard': allPlans,
      'ai_voice_standard': allPlans,
      'licenses': allPlans,
      'devices': allPlans,
      'ai_chat_deluxe': allPlans,
      'ai_voice_deluxe': allPlans,
      'exam_prep': allPlans,
      'ai_chat_deluxe_detailed': allPlans,
      'ai_voice_deluxe_hd': allPlans,
      'camera_analysis': allPlans,
      'bite_detector': allPlans,
      'ar_view': allPlans
    };

    const allowedPlans = featureAccess[feature_id] || [];
    const hasAccess = allowedPlans.includes(effectivePlan);
    
    const requiredPlanName = hasAccess ? effectivePlan : getMinimumRequiredPlan(feature_id);

    return Response.json({
      ok: true,
      has_access: hasAccess,
      current_plan: effectivePlan,
      feature_id: feature_id,
      required_plan_name: requiredPlanName
    });

  } catch (error) {
    console.error('Check Feature Access Error:', error);
    return Response.json({ 
      ok: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

function getMinimumRequiredPlan(featureId) {
  const featurePlanMap = {
    'map_advanced': 'Basic',
    'rules': 'Basic',
    'trips': 'Basic',
    'ai_chat_standard': 'Basic',
    'ai_voice_standard': 'Basic',
    
    'licenses': 'Pro',
    'devices': 'Pro',
    'ai_chat_deluxe': 'Pro',
    'ai_voice_deluxe': 'Pro',
    'exam_prep': 'Pro',
    
    'ai_chat_deluxe_detailed': 'Ultimate',
    'ai_voice_deluxe_hd': 'Ultimate',
    'camera_analysis': 'Ultimate',
    'bite_detector': 'Ultimate',
    'ar_view': 'Ultimate'
  };
  
  return featurePlanMap[featureId] || 'Free';
}