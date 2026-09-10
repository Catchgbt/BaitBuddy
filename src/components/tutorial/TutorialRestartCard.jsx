import React, { Suspense, lazy, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { isTutorialCompleted, markTutorialCompleted } from '@/lib/tutorialState';
const TutorialModal = lazy(() => import('./TutorialModal'));

// Wiedereinstieg ins Tutorial aus dem Profil.
// =============================================================================
// Das Profil muss die Tour jederzeit neu startbar machen. Bisher lag der
// einzige Einstieg für angemeldete Nutzer auf der Einstellungen-Seite hinter
// einem schwebenden Warndreieck — als Hilfe kaum erkennbar.
export default function TutorialRestartCard() {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  // Beim ersten Rendern lesen: der Zustand ändert sich nur, wenn der Nutzer die
  // Tour hier durchläuft, und dann setzen wir ihn selbst.
  const [completed, setCompleted] = useState(() => isTutorialCompleted());

  const isEnglish = language === 'en';
  const t = isEnglish
    ? {
        title: 'App tutorial',
        done: 'You have completed the tour. You can run it again any time.',
        open: 'Walk through every page of the app step by step.',
        start: 'Start tutorial',
        restart: 'Restart tutorial',
      }
    : {
        title: 'App-Tutorial',
        done: 'Du hast die Tour abgeschlossen. Du kannst sie jederzeit erneut starten.',
        open: 'Geht Schritt für Schritt durch jede Seite der App.',
        start: 'Tutorial starten',
        restart: 'Tutorial erneut starten',
      };

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardContent className="p-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-cyan-300" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{t.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{completed ? t.done : t.open}</p>
        </div>

        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          className="border-cyan-700/50 text-cyan-300 flex-shrink-0"
        >
          {completed ? t.restart : t.start}
        </Button>
      </CardContent>

      {open && (
        <Suspense fallback={null}>
          <TutorialModal
            isOpen
            onClose={() => setOpen(false)}
            onComplete={() => {
              markTutorialCompleted();
              setCompleted(true);
            }}
          />
        </Suspense>
      )}
    </Card>
  );
}
