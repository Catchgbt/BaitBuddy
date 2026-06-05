import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlan } from './PlanContext';

const PLAN_LABELS = {
  basic: 'Basic',
  pro: 'Pro',
  elite: 'Ultimate',
  ultimate: 'Ultimate',
  friends_monthly: 'Freundschaft',
  friends: 'Freundschaft'
};

export default function PlanGuard({ children, requiredPlan = 'basic', fallback = null, featureName }) {
  const { hasFeature, loading } = usePlan();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasFeature(requiredPlan)) {
    return children;
  }

  if (fallback) return fallback;

  const planLabel = PLAN_LABELS[requiredPlan] || requiredPlan;

  return (
    <Card className="glass-morphism border-amber-700/50">
      <CardContent className="p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-600/20 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {featureName ? `${featureName} ist gesperrt` : 'Diese Funktion ist gesperrt'}
          </h3>
          <p className="text-sm text-gray-400">
            Benötigt mindestens den {planLabel}-Plan.
          </p>
        </div>
        <Link to="/PremiumPlans">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            Plan upgraden
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}