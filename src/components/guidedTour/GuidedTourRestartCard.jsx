import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { useGuidedTour } from '@/contexts/GuidedTourContext';

// Wiedereinstieg in die geführte Tour aus dem Profil.
// =============================================================================
// Das Profil muss die Tour jederzeit neu startbar machen. Der Auto-Start auf
// dem Dashboard läuft nur, solange sie nicht abgeschlossen ist — danach ist
// dies der einzige Weg zurück.
export default function GuidedTourRestartCard() {
  const { language } = useLanguage();
  const { tutorialCompleted, isLoading, resetTour, startTour } = useGuidedTour();
  const [starting, setStarting] = useState(false);

  const isEnglish = language === 'en';
  const t = isEnglish
    ? {
        title: 'Guided tour',
        done: 'You have completed the tour. You can run it again any time.',
        open: 'Sabrina walks you through the app and points at what each element does.',
        start: 'Start tour',
        restart: 'Restart tour',
        hint: 'The tour opens on the dashboard.',
      }
    : {
        title: 'Geführte Tour',
        done: 'Du hast die Tour abgeschlossen. Du kannst sie jederzeit erneut starten.',
        open: 'Sabrina führt dich durch die App und zeigt dir, was jedes Element tut.',
        start: 'Tour starten',
        restart: 'Tour erneut starten',
        hint: 'Die Tour beginnt auf dem Dashboard.',
      };

  // resetTour setzt den gespeicherten Abschluss zurück; startTour greift erst
  // danach, weil es einen abgeschlossenen Zustand bewusst ignoriert.
  const handleStart = async () => {
    setStarting(true);
    try {
      await resetTour();
      startTour();
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardContent className="p-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-cyan-300" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{t.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{tutorialCompleted ? t.done : t.open}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{t.hint}</p>
        </div>

        <Button
          onClick={handleStart}
          disabled={isLoading || starting}
          variant="outline"
          className="border-cyan-700/50 text-cyan-300 flex-shrink-0"
        >
          {tutorialCompleted ? t.restart : t.start}
        </Button>
      </CardContent>
    </Card>
  );
}
