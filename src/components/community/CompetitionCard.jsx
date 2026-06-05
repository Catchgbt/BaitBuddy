import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Users, Award } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function CompetitionCard({ competition, currentUser, onUpdate }) {
  const isParticipating = competition.participants?.includes(currentUser?.email);
  const isActive = new Date(competition.end_date) > new Date() && competition.is_active;
  const hasStarted = new Date(competition.start_date) <= new Date();

  const getTypeLabel = (type) => {
    const labels = {
      biggest_catch: 'Groesster Fang',
      most_catches: 'Meiste Faenge',
      specific_species: 'Bestimmte Fischart',
      photo_contest: 'Foto-Wettbewerb'
    };
    return labels[type] || type;
  };

  const handleJoin = async () => {
    try {
      const updatedParticipants = [...(competition.participants || []), currentUser.email];
      await base44.entities.Competition.update(competition.id, {
        participants: updatedParticipants
      });
      toast.success('Du nimmst jetzt am Wettbewerb teil!');
      onUpdate();
    } catch (error) {
      console.error('Fehler beim Beitreten:', error);
      toast.error('Fehler beim Beitreten');
    }
  };

  const handleLeave = async () => {
    try {
      const updatedParticipants = competition.participants.filter(p => p !== currentUser.email);
      await base44.entities.Competition.update(competition.id, {
        participants: updatedParticipants
      });
      toast.success('Du nimmst nicht mehr am Wettbewerb teil');
      onUpdate();
    } catch (error) {
      console.error('Fehler beim Verlassen:', error);
      toast.error('Fehler beim Verlassen');
    }
  };

  return (
    <Card className="glass-morphism border-amber-600/30 bg-gradient-to-br from-amber-900/10 to-orange-900/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-amber-600/20 border border-amber-500/30">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]">
                {competition.title}
              </CardTitle>
              <p className="text-xs text-gray-400 mt-1">{getTypeLabel(competition.competition_type)}</p>
            </div>
          </div>
          {!isActive && <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">Beendet</span>}
          {isActive && !hasStarted && <span className="text-xs text-cyan-400 px-2 py-1 bg-cyan-900/30 rounded">Bald</span>}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-gray-300 text-sm">{competition.description}</p>

        {competition.target_species && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Award className="w-4 h-4" />
            Zielfisch: {competition.target_species}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date(competition.start_date).toLocaleDateString('de-DE')} - {new Date(competition.end_date).toLocaleDateString('de-DE')}
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {competition.participants?.length || 0} Teilnehmer
          </div>
        </div>

        {competition.prize && (
          <div className="p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg">
            <p className="text-xs text-amber-400 mb-1">Preis</p>
            <p className="text-sm text-white font-semibold">{competition.prize}</p>
          </div>
        )}

        {isActive && hasStarted && (
          <div>
            {isParticipating ? (
              <Button 
                variant="outline" 
                className="w-full border-amber-600/50 text-amber-400 hover:bg-amber-900/20"
                onClick={handleLeave}
              >
                Teilnahme beenden
              </Button>
            ) : (
              <Button 
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                onClick={handleJoin}
              >
                Jetzt teilnehmen
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}