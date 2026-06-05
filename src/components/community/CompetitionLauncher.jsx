import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const TEMPLATES = [
  {
    id: 'biggest_pike_week',
    title: 'Groesster Hecht der Woche',
    desc: 'Wer faengt diese Woche den laengsten Hecht?',
    duration: '7 Tage',
    species: 'Hecht'
  },
  {
    id: 'biggest_carp_month',
    title: 'Groesster Karpfen des Monats',
    desc: 'Wer hat den dicksten Karpfen?',
    duration: '30 Tage',
    species: 'Karpfen'
  },
  {
    id: 'most_catches_week',
    title: 'Faengiger Angler der Woche',
    desc: 'Wer faengt die meisten Fische?',
    duration: '7 Tage',
    species: 'Alle'
  },
  {
    id: 'biggest_catch_week',
    title: 'Groesster Fang der Woche',
    desc: 'Der laengste Fisch dieser Woche gewinnt.',
    duration: '7 Tage',
    species: 'Alle'
  },
  {
    id: 'photo_contest_week',
    title: 'Foto-Wettbewerb der Woche',
    desc: 'Reiche dein bestes Fangfoto ein.',
    duration: '7 Tage',
    species: 'Alle'
  },
  {
    id: 'zander_night_week',
    title: 'Zander-Nights',
    desc: 'Wer faengt den groessten Zander?',
    duration: '7 Tage',
    species: 'Zander'
  }
];

export default function CompetitionLauncher({ currentUser, onStarted }) {
  const [loadingId, setLoadingId] = useState(null);

  const handleStart = async (templateId) => {
    if (!currentUser) {
      toast.error('Bitte melde dich an');
      return;
    }
    setLoadingId(templateId);
    try {
      const res = await base44.functions.invoke('startCommunityCompetition', {
        template_id: templateId
      });
      if (res?.data?.error) {
        throw new Error(res.data.error);
      }
      const data = res?.data || res;
      if (data?.created) {
        toast.success('Wettbewerb gestartet. Du bist als Teilnehmer dabei.');
      } else if (data?.joined) {
        toast.success('Du bist dem laufenden Wettbewerb beigetreten.');
      } else {
        toast.success('Wettbewerb aktiviert.');
      }
      if (onStarted) await onStarted();
    } catch (error) {
      console.error('Fehler beim Starten des Wettbewerbs:', error);
      toast.error('Wettbewerb konnte nicht gestartet werden');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card className="glass-morphism border-amber-600/30 bg-gradient-to-br from-amber-900/10 to-orange-900/10 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-amber-400 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Wettbewerbe starten
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Waehle eine Vorlage und starte einen Community-Wettbewerb. Andere koennen direkt mitmachen.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="p-4 bg-gray-800/40 border border-gray-700 rounded-lg flex flex-col gap-2"
            >
              <div>
                <p className="text-white font-semibold">{tpl.title}</p>
                <p className="text-xs text-gray-400 mt-1">{tpl.desc}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-0.5 bg-gray-700/50 rounded">{tpl.duration}</span>
                <span className="px-2 py-0.5 bg-gray-700/50 rounded">{tpl.species}</span>
              </div>
              <Button
                size="sm"
                onClick={() => handleStart(tpl.id)}
                disabled={loadingId !== null}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 mt-1"
              >
                {loadingId === tpl.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starte...
                  </>
                ) : (
                  'Starten / Beitreten'
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}