import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from "@/api/auth";
import { createPageUrl } from '@/utils';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { LanguageProvider } from '@/components/i18n/LanguageContext';
import TutorialModal from '@/components/tutorial/TutorialModal';
import DeleteAccountSection from '@/components/settings/DeleteAccountSection';
import WaterScene from '@/components/home/WaterScene';
import LandingAuthPanel from '@/components/home/LandingAuthPanel';
import { maybeShowEventPopup, EVENT_POPUP_DWELL_MS } from '@/lib/loginEventPopup';

const features = [
  'KI-Fischidentifikation aus Fotos',
  'Interaktive Gewasserkarte mit Binnengewassern',
  'Echtzeit-Wetteranalyse fur Angelspots',
  'KI-Fangberatung mit personlichen Tipps',
  'Ranglisten und Community-Wettbewerbe',
  'GPS-Navigation zu deinen Lieblingsplatzen',
  'Angelschein-Pruefungstrainer mit Ubungsfragen',
  'Wasseranalyse mit Satellitendaten',
  'Ködermixer fur individuelle Rezepte',
  'Tiefenkarten fur deine Angelspots',
  'Schonzeiten und Mindestmasse im Uberblick',
  'Community-Fangfotos und Wettbewerbe',
  'Offline-Modus fur Gebiete ohne Empfang',
  'Tripplaner mit KI-Erfolgsprognose',
  'Fangbuch mit automatischer KI-Analyse',
  'Wetteralarme fur optimale Angelbedingungen',
  'Gerateintegration fur Echolote und Sensoren',
  'Angelparks und Vereine in deiner Nahe finden',
  'Deine Fangdaten bleiben privat - keine Weitergabe an Dritte',
  'Private Logs: dein Fangbuch ist nur fur dich sichtbar',
  'Datenschutz nach DSGVO - du behaltst die Kontrolle uber deine Daten',
  'Optional: Fange in der Community teilen oder privat behalten',
];

const morningGreetings = [
  (name) => `Guten Morgen${name ? `, ${name}` : ''}. Heute koennte dein bester Fangtag werden.`,
  (name) => `Morgen${name ? `, ${name}` : ''}. Die Fische warten schon auf dich.`,
  (name) => `Frueh aufgestanden${name ? `, ${name}` : ''}? Die besten Bisse kommen jetzt.`,
  (name) => `Guten Morgen${name ? `, ${name}` : ''}. Petri Heil fuer heute.`,
];

const dayGreetings = [
  (name) => `Hallo${name ? `, ${name}` : ''}. Wo wirfst du heute die Angel aus?`,
  (name) => `${name ? `Hey ${name}` : 'Hallo'}. Bereit fuer den naechsten Fang?`,
  (name) => `Schoener Tag zum Angeln${name ? `, ${name}` : ''}. Lass uns raus.`,
  (name) => `${name ? `${name}, bist` : 'Bist'} du heute am Wasser?`,
];

const eveningGreetings = [
  (name) => `Guten Abend${name ? `, ${name}` : ''}. Wie war die heutige Angelsession?`,
  (name) => `${name ? `Hey ${name}` : 'Guten Abend'}. Zeit fuer die Abendbisse.`,
  (name) => `Abendangeln${name ? `, ${name}` : ''}? Die besten Zeiten kommen noch.`,
  (name) => `Guten Abend${name ? `, ${name}` : ''}. Petri Heil fuer heut Nacht.`,
];

const nightGreetings = [
  (name) => `Nachtangler${name ? ` ${name}` : ''}? Die grossen kommen im Dunkeln.`,
  (name) => `Gute Nacht${name ? `, ${name}` : ''}. Traumhafter Fang morgen.`,
  (name) => `${name ? `${name}, noch` : 'Noch'} wach? Welse laufen gerade am besten.`,
];

function RotatingGreeting({ userName }) {
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [key, setKey] = useState(0);

  const getGreetingPool = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return morningGreetings;
    if (hour >= 12 && hour < 17) return dayGreetings;
    if (hour >= 17 && hour < 21) return eveningGreetings;
    return nightGreetings;
  };

  useEffect(() => {
    const pool = getGreetingPool();
    setGreetingIndex(Math.floor(Math.random() * pool.length));
    
    const interval = setInterval(() => {
      setGreetingIndex(prev => (prev + 1) % pool.length);
      setKey(k => k + 1);
    }, 3600000);
    return () => clearInterval(interval);
  }, []);

  const pool = getGreetingPool();
  if (!pool || pool.length === 0) return null;
  const greeting = pool[greetingIndex % pool.length];
  if (typeof greeting !== 'function') return null;
  const text = greeting(userName);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={key}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.5 }}
        className="text-lg sm:text-xl md:text-2xl font-semibold text-cyan-300"
      >
        {text}
      </motion.p>
    </AnimatePresence>
  );
}

function FeatureHints() {
  const [currentFeature, setCurrentFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={currentFeature}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-xs sm:text-sm font-medium text-cyan-400 text-center max-w-md px-2">
          {features[currentFeature]}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

function SideLinks() {
  return (
    <div className="flex flex-col gap-6 max-w-[280px]">
      <a
        href="https://catchgbt-q7scna.manus.space"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-left"
      >
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="flex flex-col items-start gap-1">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.3em] uppercase text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
              Website
            </span>
            <motion.span
              animate={{
                textShadow: [
                  '0 0 30px rgba(16, 185, 129, 0.9), 0 0 60px rgba(16, 185, 129, 0.6)',
                  '0 0 50px rgba(34, 211, 238, 0.9), 0 0 80px rgba(34, 211, 238, 0.6)',
                  '0 0 30px rgba(16, 185, 129, 0.9), 0 0 60px rgba(16, 185, 129, 0.6)'
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-lg sm:text-xl font-bold text-cyan-400 drop-shadow-2xl break-all"
              style={{
                backgroundSize: '200% auto',
                animation: 'gradient-wave 3s ease infinite'
              }}
            >
              catchgbt-q7scna.manus.space
            </motion.span>
          </div>
        </motion.div>
      </a>

      <a
        href="https://bit.ly/4d97tHI"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-left"
      >
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="flex flex-col items-start gap-1">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.3em] uppercase text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
              Store Android App
            </span>
            <motion.span
              animate={{
                textShadow: [
                  '0 0 30px rgba(168, 85, 247, 0.9), 0 0 60px rgba(168, 85, 247, 0.6)',
                  '0 0 50px rgba(59, 130, 246, 0.9), 0 0 80px rgba(59, 130, 246, 0.6)',
                  '0 0 30px rgba(168, 85, 247, 0.9), 0 0 60px rgba(168, 85, 247, 0.6)'
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-lg sm:text-xl font-bold text-purple-400 drop-shadow-2xl break-all"
              style={{
                backgroundSize: '200% auto',
                animation: 'gradient-wave 3s ease infinite'
              }}
            >
              bit.ly/4d97tHI
            </motion.span>
          </div>
        </motion.div>
      </a>
    </div>
  );
}

function LandingPageContent() {
    const [tutorialOpen, setTutorialOpen] = useState(false);
    const [userName, setUserName] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);

    useEffect(() => {
        loadUserName();
        auth.isAuthenticated().then(setIsAuthenticated).catch(() => setIsAuthenticated(false));

        // Referral-Code aus der URL (?ref=CODE) persistieren — beim ersten Login
        // löst ReferralInvitePopup den Code ein und schaltet die 7-Tage-Belohnung
        // für den Einladenden frei.
        try {
            const params = new URLSearchParams(window.location.search);
            const ref = params.get('ref');
            if (ref) {
                const cleaned = ref.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
                if (cleaned) localStorage.setItem('bb_pending_referral_code', cleaned);
            }
        } catch { /* Storage optional */ }

        const prevBg = document.body.style.backgroundColor;
        const prevHtmlBg = document.documentElement.style.backgroundColor;
        document.body.style.backgroundColor = '#020f1a';
        document.documentElement.style.backgroundColor = '#020f1a';
        return () => {
            document.body.style.backgroundColor = prevBg;
            document.documentElement.style.backgroundColor = prevHtmlBg;
        };
    }, []);

    const loadUserName = async () => {
        try {
            const isAuth = await auth.isAuthenticated();
            if (isAuth) {
                const user = await auth.me();
                if (user && user.full_name) {
                    setUserName(user.full_name.split(' ')[0]);
                }
            }
        } catch (error) {
            console.debug('Home: Benutzername konnte nicht geladen werden:', error);
        }
    };

    // Button "Zum Dashboard" fuer bereits angemeldete Nutzer.
    const handleLogin = async () => {
        try {
            const isAuth = await auth.isAuthenticated();
            if (!isAuth) {
                auth.redirectToLogin(createPageUrl('Dashboard'));
                return;
            }
            if (await maybeShowEventPopup()) {
                await new Promise(resolve => setTimeout(resolve, EVENT_POPUP_DWELL_MS));
            }
            window.location.href = createPageUrl('Dashboard');
        } catch (error) {
            console.error('Login error:', error);
            auth.redirectToLogin(createPageUrl('Dashboard'));
        }
    };


    return (
        <div className="bg-[#020f1a] text-white min-h-screen w-full overflow-hidden fixed inset-0" style={{ minHeight: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}>

            <WaterScene />


            <div className="fixed top-4 left-4 sm:top-8 sm:left-8 z-50 flex flex-col items-start gap-2">
                <motion.button
                    onClick={() => setTutorialOpen(true)}
                    animate={{
                        scale: [1, 1.08, 1],
                        opacity: [0.9, 1, 0.9],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="cursor-pointer bg-transparent border-none outline-none"
                >
                    <motion.span
                        animate={{
                            backgroundImage: [
                                'linear-gradient(90deg, #a855f7, #3b82f6, #06b6d4)',
                                'linear-gradient(90deg, #3b82f6, #06b6d4, #a855f7)',
                                'linear-gradient(90deg, #06b6d4, #a855f7, #3b82f6)',
                                'linear-gradient(90deg, #a855f7, #3b82f6, #06b6d4)'
                            ]
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="text-xl font-bold text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] hover:drop-shadow-[0_0_20px_rgba(255,255,255,1)] transition-all"
                    >
                        Tutorial
                    </motion.span>
                </motion.button>
            </div>

            <div className="fixed top-4 right-4 sm:top-8 sm:right-8 z-50">
                <LanguageSwitcher />
            </div>

            <motion.div
                className="fixed top-[30%] left-[30%] -translate-x-1/2 -translate-y-1/2 z-40 px-4 flex flex-col items-start gap-4 max-w-md"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
            >
                <RotatingGreeting userName={userName} />
            </motion.div>

            <div className="fixed top-16 sm:top-32 left-0 right-0 z-10 w-full overflow-hidden flex items-center pointer-events-none">
                <div
                    className="whitespace-nowrap flex items-center text-xl sm:text-4xl font-bold opacity-70 home-gold-scroll"
                    style={{
                        backgroundImage: 'linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24, #fde68a, #fbbf24)',
                        backgroundSize: '200% auto',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        color: 'transparent'
                    }}
                >
                    <span className="mr-24 pl-4">BaitBuddy wünscht dir viel Erfolg und Petri Heil</span>
                    <span className="mr-24">Deine Fangdaten werden niemals an Dritte weitergegeben</span>
                    <span className="mr-24">Private Logs: dein Fangbuch gehoert nur dir</span>
                    <span className="mr-24">Datenschutz nach DSGVO - volle Kontrolle uber deine Daten</span>
                    <span className="mr-24 pl-4">BaitBuddy wünscht dir viel Erfolg und Petri Heil</span>
                    <span className="mr-24">Deine Fangdaten werden niemals an Dritte weitergegeben</span>
                    <span className="mr-24">Private Logs: dein Fangbuch gehoert nur dir</span>
                    <span className="mr-24">Datenschutz nach DSGVO - volle Kontrolle uber deine Daten</span>
                </div>
                <style>{`
                    @keyframes homeGoldScroll {
                        0% { transform: translate3d(0, 0, 0); }
                        100% { transform: translate3d(-50%, 0, 0); }
                    }
                    .home-gold-scroll {
                        animation: homeGoldScroll 40s linear infinite;
                        will-change: transform;
                    }
                `}</style>
            </div>

            <motion.div
                className="fixed inset-0 z-40 overflow-y-auto px-4 py-6 pointer-events-none"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
            >
                <div className="min-h-full flex flex-col items-center justify-center gap-4">
                    <FeatureHints />

                    <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
                        <div className="pointer-events-auto order-2 lg:order-2">
                            <SideLinks />
                        </div>

                        {!isAuthenticated && <LandingAuthPanel />}
                    </div>
                </div>
            </motion.div>

            {isAuthenticated && (
                <div className="fixed bottom-24 sm:bottom-40 left-4 sm:left-8 z-50">
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            backgroundImage: [
                                'linear-gradient(135deg, #a855f7, #3b82f6, #06b6d4)',
                                'linear-gradient(135deg, #3b82f6, #06b6d4, #a855f7)',
                                'linear-gradient(135deg, #06b6d4, #a855f7, #3b82f6)',
                                'linear-gradient(135deg, #a855f7, #3b82f6, #06b6d4)'
                            ],
                            boxShadow: [
                                '0 0 20px rgba(168, 85, 247, 0.8)',
                                '0 0 40px rgba(59, 130, 246, 1)',
                                '0 0 40px rgba(6, 182, 212, 1)',
                                '0 0 20px rgba(168, 85, 247, 0.8)'
                            ]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                        onClick={handleLogin}
                        className="px-8 py-4 rounded-full text-white text-sm font-bold transform hover:scale-110 flex items-center justify-center whitespace-nowrap"
                    >
                        Zum Dashboard
                    </motion.button>
                </div>
            )}

            <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end gap-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                >
                    <motion.p
                        animate={{
                            opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="text-xs sm:text-sm font-light tracking-widest text-gray-400 uppercase"
                    >
                        Beta-Testphase
                    </motion.p>
                </motion.div>

            </div>

            {isAuthenticated && (
                <div className="fixed bottom-24 sm:bottom-40 right-4 sm:right-8 z-50">
                    {showDeleteAccount ? (
                        <div className="w-80">
                            <DeleteAccountSection />
                            <button type="button"
                                onClick={() => setShowDeleteAccount(false)}
                                className="mt-2 w-full text-xs text-gray-500 hover:text-gray-300 transition-colors text-center"
                            >
                                Abbrechen
                            </button>
                        </div>
                    ) : (
                        <button type="button"
                            onClick={() => setShowDeleteAccount(true)}
                            className="px-4 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/40 text-xs font-medium transition"
                        >
                            Konto löschen
                        </button>
                    )}
                </div>
            )}

            <TutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />

            <style>{`
                @keyframes gradient-wave {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }

            `}</style>
        </div>
    );
}

export default function LandingPage() {
    return (
        <LanguageProvider>
            <LandingPageContent />
        </LanguageProvider>
    );
}