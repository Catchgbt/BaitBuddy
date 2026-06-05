import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
      const response = await base44.functions.invoke('getPlanStatus');
      if (response.data && response.data.plan) {
        setPlan(response.data.plan);
      } else {
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