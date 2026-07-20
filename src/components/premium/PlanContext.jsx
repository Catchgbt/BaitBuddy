import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const loadingRef = useRef(false);

  const loadPlan = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await Promise.race([
          functions.invoke('getPlanStatus'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('getPlanStatus timeout')), 3000)
          ),
        ]);

        const payload = response?.data ?? response;
        if (payload?.plan) {
          setPlan(payload.plan);
        } else {
          setPlan({ id: 'free', name: 'Kostenlos', is_active: false });
        }
        setLoading(false);
        loadingRef.current = false;
        return;
      } catch (error) {
        if (error.message?.includes('Kein Token') && attempt < 2) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        setPlan({ id: 'free', name: 'Kostenlos', is_active: false });
        setLoading(false);
        loadingRef.current = false;
        return;
      }
    }
  }, []);

  useEffect(() => {
    loadPlan();
    window.addEventListener('plan-updated', loadPlan);
    return () => window.removeEventListener('plan-updated', loadPlan);
  }, [loadPlan]);

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
