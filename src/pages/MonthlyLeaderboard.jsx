import React, { useState, useEffect } from 'react';
import { leaderboards, rewards } from '@/api/frontendClient';
import { auth } from '@/api/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Trophy,
  Zap,
  Gift,
  Crown,
  Medal,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';

export default function MonthlyLeaderboard() {
  useFeatureTracking('monthly_leaderboard');
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRewards, setMyRewards] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimingReward, setClaimingReward] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await auth.me();
      setCurrentUser(user);

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const [boardData, rewardsData] = await Promise.all([
        leaderboards.monthly(year, month),
        rewards.myActivations()
      ]);

      setLeaderboard(boardData || []);
      setMyRewards(rewardsData || []);
    } catch (error) {
      console.error('Fehler beim Laden des Leaderboards:', error);
      toast.error('Fehler beim Laden des Leaderboards');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (leaderboardId) => {
    try {
      setClaimingReward(leaderboardId);
      const result = await rewards.claim(leaderboardId);
      toast.success('Reward erfolgreich beansprucht! Dein Basic Plan ist aktiviert.');
      await loadData();
    } catch (error) {
      console.error('Fehler beim Beanspruchen des Rewards:', error);
      toast.error('Reward konnte nicht beansprucht werden');
    } finally {
      setClaimingReward(null);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    if (nextMonth <= new Date()) {
      setCurrentMonth(nextMonth);
    }
  };

  const monthString = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const canGoPrev = true;
  const canGoNext = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1) <= new Date();

  const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-400" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-amber-400" />
            Monatliches Leaderboard
          </h1>
          <p className="text-gray-400">
            Der Sieger jedes Monats gewinnt einen kostenlosen Basic Plan für 30 Tage!
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
            disabled={!canGoPrev}
            className="border-gray-700 hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 text-xl font-semibold text-white">
            <Calendar className="w-5 h-5 text-amber-400" />
            {monthString}
            {isCurrentMonth && <span className="text-sm text-amber-400">(Aktuell)</span>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className="border-gray-700 hover:bg-gray-800"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Top 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {leaderboard.slice(0, 3).map((entry, index) => (
            <Card
              key={entry.id}
              className={`glass-morphism border-b-4 transition-all ${
                index === 0
                  ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-900/20 to-amber-900/20'
                  : index === 1
                  ? 'border-gray-400/50 bg-gradient-to-br from-gray-700/20 to-gray-800/20'
                  : 'border-orange-500/50 bg-gradient-to-br from-orange-900/20 to-amber-900/20'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getRankIcon(entry.rank)}
                    <span className="text-lg font-bold text-white">#{entry.rank}</span>
                  </div>
                  {entry.reward_status === 'claimed' && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  {entry.user_id === currentUser?.email ? 'Du' : entry.user_id}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-amber-400">
                    {Math.round(entry.total_points * 100) / 100}
                  </p>
                  <p className="text-xs text-gray-400">Punkte</p>
                </div>
                <div className="text-xs text-gray-400 text-center">
                  {entry.event_count} {entry.event_count === 1 ? 'Event' : 'Events'}
                </div>
                {entry.rank === 1 && (
                  <div className="pt-2 border-t border-gray-700/50">
                    {entry.reward_status === 'claimed' ? (
                      <div className="bg-green-900/30 border border-green-600/30 rounded p-2 text-center">
                        <p className="text-xs text-green-400 font-semibold flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" />
                          Reward aktiviert
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleClaimReward(entry.id)}
                        disabled={claimingReward === entry.id || entry.user_id !== currentUser?.email}
                        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-sm py-1"
                      >
                        {claimingReward === entry.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Wird aktiviert...
                          </>
                        ) : (
                          <>
                            <Gift className="w-3 h-3 mr-1" />
                            Reward aktivieren
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Full Leaderboard */}
        <Card className="glass-morphism border-gray-600/30 bg-gradient-to-br from-gray-800/20 to-gray-900/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-400" />
              Vollständiges Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      entry.user_id === currentUser?.email
                        ? 'bg-amber-900/20 border-amber-600/50'
                        : 'bg-gray-700/20 border-gray-700/50 hover:border-gray-600/50'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-lg font-bold text-gray-400 w-8 text-center">
                        #{entry.rank}
                      </span>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {entry.user_id === currentUser?.email ? 'Du' : entry.user_id}
                        </p>
                        <p className="text-xs text-gray-400">
                          {entry.event_count} {entry.event_count === 1 ? 'Event' : 'Events'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-400">
                          {Math.round(entry.total_points * 100) / 100}
                        </p>
                        <p className="text-xs text-gray-400">Punkte</p>
                      </div>
                      {entry.reward_status === 'claimed' && (
                        <div className="flex items-center gap-1 bg-green-900/30 px-3 py-1 rounded">
                          <Gift className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-green-400 font-semibold">+30 Tage</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">Keine Einträge für diesen Monat</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Rewards */}
        {myRewards.length > 0 && (
          <Card className="glass-morphism border-green-600/30 bg-gradient-to-br from-green-900/10 to-emerald-900/10">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Deine aktiven Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {myRewards.map((reward) => {
                const expiresAt = new Date(reward.expires_at);
                const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div
                    key={reward.id}
                    className="p-4 rounded-lg bg-green-900/20 border border-green-600/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-semibold">{reward.plan_id.toUpperCase()} Plan</p>
                      <p className="text-sm text-green-400 flex items-center gap-1 mt-1">
                        <Clock className="w-4 h-4" />
                        {daysLeft} Tage verbleibend
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">{reward.duration_days}</p>
                      <p className="text-xs text-gray-400">Tage</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="glass-morphism border-blue-600/30 bg-gradient-to-br from-blue-900/10 to-cyan-900/10 mt-8">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Wie funktioniert das Punkte-System?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-300">
            <p>
              <span className="font-semibold text-white">Basispunkte:</span> Jede Einreichung bringt Basispunkte (Standard: 100)
            </p>
            <p>
              <span className="font-semibold text-white">Längenboni:</span> Längere Fische bringen zusätzliche Punkte (5 Punkte pro cm)
            </p>
            <p>
              <span className="font-semibold text-white">Art-Boni:</span> Bestimmte Fischarten haben Spezial-Boni
            </p>
            <p>
              <span className="font-semibold text-white">Like-Punkte:</span> Community-Likes bringen zusätzliche Punkte
            </p>
            <p className="pt-2 border-t border-blue-600/30">
              <span className="font-semibold text-white">Platzierungs-Bonus:</span> Die Top 3 Events-Gewinner bekommen zusätzliche Punkte (500/300/100)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
