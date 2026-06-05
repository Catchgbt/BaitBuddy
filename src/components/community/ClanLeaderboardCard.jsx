import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Trophy, TrendingUp, Fish } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function ClanLeaderboardCard({ competition, currentUser }) {
  const [clans, setClans] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userClan, setUserClan] = useState(null);
  const [newClanName, setNewClanName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [competition.id]);

  const loadData = async () => {
    try {
      const allClans = await base44.entities.Clan.filter({
        competition_id: competition.id
      });
      
      setClans(allClans);
      
      const myClan = allClans.find(c => c.members.includes(currentUser?.email));
      setUserClan(myClan);

      const response = await base44.functions.invoke('getClanLeaderboard', {
        competition_id: competition.id
      });
      
      setLeaderboard(response.leaderboard || []);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClan = async () => {
    if (!newClanName.trim()) {
      toast.error('Clanname erforderlich');
      return;
    }

    try {
      await base44.functions.invoke('createClan', {
        name: newClanName,
        description: '',
        competition_id: competition.id
      });
      
      toast.success('Clan erstellt');
      setNewClanName('');
      setShowCreateForm(false);
      await loadData();
    } catch (error) {
      toast.error(error.message || 'Fehler beim Erstellen');
    }
  };

  const handleJoinClan = async (clanId) => {
    try {
      await base44.functions.invoke('joinClan', {
        clan_id: clanId
      });
      
      toast.success('Clan beigetreten');
      await loadData();
    } catch (error) {
      toast.error(error.message || 'Fehler beim Beitreten');
    }
  };

  return (
    <Card className="glass-morphism border-emerald-600/30 bg-gradient-to-br from-emerald-900/10 to-teal-900/10">
      <CardHeader>
        <CardTitle className="text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)] flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team-Wettbewerb: {competition.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {userClan ? (
          <div className="p-3 bg-emerald-900/20 border border-emerald-600/30 rounded-lg">
            <p className="text-emerald-400 font-semibold">Dein Clan: {userClan.name}</p>
            <p className="text-gray-300 text-sm">Mitglieder: {userClan.members.length}/10</p>
            <p className="text-gray-300 text-sm">Punkte: {userClan.total_event_score}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {!showCreateForm ? (
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setShowCreateForm(true)}
              >
                Clan gruenden
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Clanname"
                  value={newClanName}
                  onChange={(e) => setNewClanName(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreateClan} className="flex-1 bg-emerald-600">
                    Erstellen
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1"
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-white font-semibold text-sm">Rangliste</h4>
          {loading ? (
            <p className="text-gray-400 text-center py-4">Lade Rangliste...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Noch keine Clans</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((clan) => (
                <div 
                  key={clan.clan_id}
                  className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                >
                  <div className="text-emerald-400 font-bold text-lg w-8">#{clan.rank}</div>
                  
                  <div className="flex-1">
                    <p className="text-white font-semibold">{clan.clan_name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {clan.member_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Fish className="w-3 h-3" />
                        {clan.total_catches}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {clan.average_size} cm
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-amber-400 font-bold text-lg">{clan.total_score}</p>
                    {!userClan && clan.member_count < 10 && (
                      <Button
                        size="sm"
                        onClick={() => handleJoinClan(clan.clan_id)}
                        className="mt-1"
                      >
                        Beitreten
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}