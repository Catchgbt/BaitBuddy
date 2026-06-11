import React, { createContext, useContext, useState, useEffect } from 'react';
import { functions } from "@/api/frontendClient";
import { planMeetsRequirement, getPlanLevel } from './planHierarchy';

const PlanContext = createContext();

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within PlanProvider');
  }
  return context;
}

export function PlanProvider({ children }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const response = await functions.invoke('getPlanStatus');
      // /api/premium/status liefert { ok, plan } direkt (kein data-Wrapper);
      // ältere Aufrufer erwarteten response.data.plan -> beide Formen tolerieren.
      const payload = response?.data ?? response;
      console.log('[PlanContext] loadPlan response:', { payload, ok: payload?.ok, plan: payload?.plan });
      if (payload && payload.plan) {
        console.log('[PlanContext] Setting plan to:', payload.plan);
        setPlan(payload.plan);
      } else {
        console.log('[PlanContext] No plan in response, setting to free');
        setPlan({ id: 'free', name: 'Kostenlos', is_active: false });
      }
    } catch (error) {
      console.error('[PlanContext] Error loading plan:', error);
      setPlan({ id: 'free', name: 'Kostenlos', is_active: false });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPlan();
    window.addEventListener('plan-updated', loadPlan);
    return () => window.removeEventListener('plan-updated', loadPlan);
  }, []);

  const hasFeature = (requiredPlan = 'basic') => {
    const currentPlanId = plan?.id || 'free';
    return planMeetsRequirement(currentPlanId, requiredPlan);
  };

  const planLevel = getPlanLevel(plan?.id || 'free');

  return (
    <PlanContext.Provider value={{ plan, loading, hasFeature, planLevel, reload: loadPlan }}>
      {children}
    </PlanContext.Provider>
  );
}