import React, { useState, useEffect } from 'react';
import { events, leaderboards } from '@/api/frontendClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EventsWidget() {
  const [activeEvent, setActiveEvent] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyRank, setMonthlyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const [eventsList, leaderboardData] = await Promise.all([
        events.list(),
        leaderboards.monthly(year, month)
      ]);

      // Get first active event
      const active = eventsList?.find(e => new Date(e.end_date) > new Date() && e.status === 'active');
      setActiveEvent(active);

      // Get user's current monthly rank
      const user = await import('@/api/auth').then(m => m.auth.me());
      const rank = leaderboardData?.find(l => l.user_id === user.email);
      setMonthlyRank(rank);
    } catch (error) {
      console.error('Fehler beim Laden von Event-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-morphism border-amber-600/30 bg-gradient-to-br from-amber-900/10 to-orange-900/10">
        <CardHeader>
          <CardTitle className="text-amber-400 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Events & Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-morphism border-amber-600/30 bg-gradient-to-br from-amber-900/10 to-orange-900/10">
      <CardHeader>
        <CardTitle className="text-amber-400 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Events & Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Event */}
        {activeEvent && (
          <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-600/30">
            <p className="text-xs text-amber-400 font-semibold mb-1">AKTIVES EVENT</p>
            <p className="text-white font-semibold text-sm mb-2">{activeEvent.name}</p>
            <div className="flex items-center gap-1 text-xs text-amber-300 mb-3">
              <Calendar className="w-3 h-3" />
              {Math.ceil((new Date(activeEvent.end_date) - new Date()) / (1000 * 60 * 60 * 24))} Tage verbleibend
            </div>
            <Link to={`/events/${activeEvent.id}`}>
              <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm py-1">
                Zum Event
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Monthly Rank */}
        {monthlyRank && (
          <div className="p-3 rounded-lg bg-green-900/20 border border-green-600/30">
            <p className="text-xs text-green-400 font-semibold mb-1">MONATLICHES RANKING</p>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-semibold text-sm">
                Platz #{monthlyRank.rank}
              </p>
              <p className="text-lg font-bold text-green-400">
                {Math.round(monthlyRank.total_points * 100) / 100}
              </p>
            </div>
            {monthlyRank.rank === 1 && monthlyRank.reward_status === 'claimed' && (
              <p className="text-xs text-green-300 font-semibold">
                ✓ Reward aktiv - +30 Tage Basic Plan
              </p>
            )}
            {monthlyRank.rank === 1 && monthlyRank.reward_status !== 'claimed' && (
              <p className="text-xs text-green-300 font-semibold">
                🎉 Du bist Sieger diesen Monat!
              </p>
            )}
          </div>
        )}

        {!activeEvent && !monthlyRank && (
          <div className="text-center py-4 text-gray-400 text-sm">
            <p>Keine aktiven Events oder Rankings</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-700/50">
          <Link to="/events-catalog" className="flex-1">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1">
              Events durchsuchen
            </Button>
          </Link>
          <Link to="/leaderboards/monthly" className="flex-1">
            <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-sm py-1">
              Leaderboard
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
