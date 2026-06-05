import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';

function QuickStatsCard({ stats, user }) {
    const calculateWeeklyProgress = useMemo(() => {
        if (!stats?.weekCatches) return 0;
        const target = 5;
        return Math.min((stats.weekCatches / target) * 100, 100);
    }, [stats?.weekCatches]);

    const statsData = useMemo(() => [
        {
            label: 'Gesamt Fänge',
            value: stats.totalCatches || 0,
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-500/10',
            borderColor: 'border-cyan-500/20'
        },
        {
            label: 'Diese Woche',
            value: stats.weekCatches || 0,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/20'
        },
        {
            label: 'Gespeicherte Spots',
            value: stats.totalSpots || 0,
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/20'
        },
        {
             label: 'Angel-Punkte',
             value: user?.points || 0,
             color: 'text-purple-400',
             bgColor: 'bg-purple-500/10',
             borderColor: 'border-purple-500/20'
         }
        ], [stats, user?.points]);

    return (
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 text-purple-400">Deine Statistiken</h3>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {statsData.map((stat, index) => (
                        <div
                            key={index}
                            className={`${stat.bgColor} ${stat.borderColor} border rounded-lg p-3 text-center`}
                        >
                            <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                                {stat.value}
                            </div>
                            <p className="text-gray-400 text-xs">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>

                {calculateWeeklyProgress > 0 && (
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-400">Wochen-Ziel</span>
                            <span className="text-xs text-emerald-400 font-semibold">
                                {Math.round(calculateWeeklyProgress)}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${calculateWeeklyProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            {stats?.weekCatches || 0} von 5 Fängen diese Woche
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default React.memo(QuickStatsCard, (prevProps, nextProps) => {
    return (
        prevProps.stats?.totalCatches === nextProps.stats?.totalCatches &&
        prevProps.stats?.weekCatches === nextProps.stats?.weekCatches &&
        prevProps.stats?.totalSpots === nextProps.stats?.totalSpots &&
        prevProps.user?.points === nextProps.user?.points
    );
});