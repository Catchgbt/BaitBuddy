import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/i18n/LanguageContext';
import {
  markTutorialCompleted,
  markTutorialPrompted,
  shouldOfferTutorial,
} from '@/lib/tutorialState';
import TutorialModal from './TutorialModal';

// Bietet neuen Nutzern die App-Tour genau einmal an.
// =============================================================================
// Diese Komponente war ein leerer Stub (`return null`), wurde aber in
// Layout.jsx für jeden angemeldeten Nutzer gerendert — das Tutorial existierte
// vollständig (33 Schritte, zweisprachig, mit Vorlesefunktion), wurde aber
// niemandem angeboten. Erreichbar war es nur über einen schwebenden Button auf
// der Landingpage und in den Einstellungen.
//
// Ton und Häufigkeit folgen der Produktvorgabe: keine aggressive Erinnerung,
// keine Zwangsführung. Wer „Später" wählt, wird nicht erneut gefragt — die Tour
// bleibt über Profil und Einstellungen jederzeit startbar.

// Kurze Verzögerung, damit der Hinweis nicht mit Splash-Screen, Buddy-Begrüßung
// und Referral-Popup um dieselbe erste Sekunde konkurriert.
const APPEAR_DELAY_MS = 2500;

export default function FirstLoginTutorialPrompt() {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const isEnglish = language === 'en';
  const t = isEnglish
    ? {
        title: 'New here?',
        body: 'A short tour walks you through every page of BaitBuddy — logbook, map, weather and the AI buddy.',
        start: 'Start tour',
        later: 'Later',
        dismiss: 'Dismiss',
        hint: 'You can start it any time from your profile.',
      }
    : {
        title: 'Neu dabei?',
        body: 'Eine kurze Tour zeigt dir jede Seite von BaitBuddy — Fangbuch, Karte, Wetter und den KI-Buddy.',
        start: 'Tour starten',
        later: 'Später',
        dismiss: 'Ausblenden',
        hint: 'Du kannst sie jederzeit im Profil starten.',
      };

  useEffect(() => {
    if (!shouldOfferTutorial()) return undefined;
    const id = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  // „Später" und das Schließen sind dasselbe Versprechen: einmal gefragt,
  // danach nie wieder von allein.
  const dismiss = () => {
    markTutorialPrompted();
    setVisible(false);
  };

  const start = () => {
    markTutorialPrompted();
    setVisible(false);
    setTutorialOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="fixed left-4 right-4 bottom-24 z-[9000] mx-auto max-w-sm"
            role="dialog"
            aria-label={t.title}
          >
            <div className="relative rounded-2xl border border-cyan-500/30 bg-gray-950/95 backdrop-blur-xl p-4 shadow-2xl">
              <button
                type="button"
                onClick={dismiss}
                aria-label={t.dismiss}
                className="absolute top-2 right-2 p-2 rounded-lg text-gray-500 active:text-gray-300 focus:ring-2 focus:ring-cyan-400"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>

              <div className="flex items-start gap-3 pr-6">
                <span className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-cyan-300" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-white">{t.title}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{t.body}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={start}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white"
                >
                  {t.start}
                </Button>
                <Button variant="outline" onClick={dismiss} className="border-gray-700 text-gray-300">
                  {t.later}
                </Button>
              </div>

              <p className="text-[11px] text-gray-500 text-center mt-2">{t.hint}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TutorialModal
        isOpen={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        onComplete={markTutorialCompleted}
      />
    </>
  );
}
