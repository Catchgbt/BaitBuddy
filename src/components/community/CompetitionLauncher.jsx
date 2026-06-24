import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { functions } from "@/api/frontendClient";

const TEMPLATES = [
  {
    id: 'biggest_pike_week',
    title: 'Größter Hecht der Woche',
    desc: 'Wer fängt diese Woche den längsten Hecht?',
    duration: '7 Tage',
    species: 'Hecht'
  },
  {
    id: 'biggest_carp_month',
    title: 'Größter Karpfen des Monats',
    desc: 'Wer hat den dicksten Karpfen?',
    duration: '30 Tage',
    species: 'Karpfen'
  },
  {
    id: 'most_catches_week',
    title: 'Fängiger Angler der Woche',
    desc: 'Wer fängt die meisten Fische?',
    duration: '7 Tage',
    species: 'Alle'
  },
  {
    id: 'biggest_catch_week',
    title: 'Größter Fang der Woche',
    desc: 'Der längste Fisch dieser Woche gewinnt.',
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
    desc: 'Wer fängt den größten Zander?',
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
      console.log('Starting competition with templateId:', templateId);

      const res = await functions.invoke('startCommunityCompetition', {
        template_id: templateId
      });

      console.log('Competition start response:', res);

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
      const errorMsg = error?.message || 'Wettbewerb konnte nicht gestartet werden';
      toast.error(`Fehler: ${errorMsg}`);
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
          Wähle eine Vorlage und starte einen Community-Wettbewerb. Andere können direkt mitmachen.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="p-4 bg-gray-800/40 border border-gray-700 rounded-lg flex flex-col gap-2 hover:border-gray-600 transition"
            >
              <div>
                <p className="text-white font-semibold text-sm mb-1">{tpl.title}</p>
                <p className="text-xs text-gray-400">{tpl.desc}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span className="px-2 py-0.5 bg-gray-700/50 rounded">{tpl.duration}</span>
                <span className="px-2 py-0.5 bg-gray-700/50 rounded">{tpl.species}</span>
              </div>
              <button
                onClick={() => handleStart(tpl.id)}
                disabled={loadingId === tpl.id || !currentUser}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                {loadingId === tpl.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starte...
                  </>
                ) : (
                  "Starten / Beitreten"
                )}
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
