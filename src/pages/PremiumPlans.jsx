import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star, Sparkles, Mail, Loader2, ShoppingBag, Smartphone, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import {
  startGooglePlayPurchase,
  isGooglePlayBillingAvailable,
  restoreGooglePlayPurchases
} from "@/components/premium/googlePlayBilling";
import TrialOfferPopup from "@/components/premium/TrialOfferPopup";
import WebCheckoutButton from "@/components/premium/WebCheckoutButton";

export default function PremiumPlans() {
  const [user, setUser] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [billingAvailable, setBillingAvailable] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadData();
    setBillingAvailable(isGooglePlayBillingAvailable());
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const planStatusResponse = await base44.functions.invoke('getPlanStatus');
      if (planStatusResponse.data && planStatusResponse.data.plan) {
        setCurrentPlan(planStatusResponse.data.plan);
      } else {
        setCurrentPlan({ id: 'free', name: 'Kostenlos' });
      }
    } catch (error) {
      console.error("[PremiumPlans] Fehler beim Laden:", error);
      setCurrentPlan({ id: 'free', name: 'Kostenlos' });
    }
    setLoading(false);
  };

  const handlePlayStorePurchase = async (planId) => {
    setProcessingPlan(planId);
    try {
      const result = await startGooglePlayPurchase(planId);

      if (result.success && result.activated) {
        toast.success('Plan aktiviert', {
          description: 'Dein Premium-Plan ist jetzt aktiv.'
        });
        await loadData();
        window.dispatchEvent(new CustomEvent('plan-updated'));
      } else if (result.cancelled) {
        toast.info('Kauf abgebrochen');
      } else if (result.pending) {
        toast.info('Kauf wird verarbeitet', {
          description: 'Falls der Kauf erfolgreich war, nutze "Käufe wiederherstellen".',
          duration: 8000
        });
      } else {
        toast.error('Kauf nicht möglich', {
          description: result.error || 'Unbekannter Fehler',
          duration: 6000
        });
      }
    } catch (error) {
      toast.error('Fehler', {
        description: error.message || 'Unbekannter Fehler'
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleRestorePurchases = async () => {
    setRestoring(true);
    try {
      const result = await restoreGooglePlayPurchases();

      if (result.success && result.restored > 0) {
        toast.success('Käufe wiederhergestellt', {
          description: result.message || `Plan ${result.planId} aktiviert.`
        });
        await loadData();
        window.dispatchEvent(new CustomEvent('plan-updated'));
      } else if (result.success) {
        toast.info('Keine Käufe gefunden', {
          description: result.message || 'Es wurden keine aktiven Google Play Käufe gefunden.'
        });
      } else {
        toast.error('Wiederherstellung fehlgeschlagen', {
          description: result.error,
          duration: 6000
        });
      }
    } catch (error) {
      toast.error('Fehler', {
        description: error.message || 'Unbekannter Fehler'
      });
    } finally {
      setRestoring(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      icon: Check,
      color: 'from-gray-600 to-gray-700',
      description: 'Kostenlos - alle Grundfunktionen',
      features: [
        'Dashboard mit Wetter & Spot-Karte',
        'Digitales Fangbuch (unbegrenzt)',
        'Interaktive Angelkarte mit Community-Spots',
        'Schonzeiten & Mindestmasse nachschlagen',
        'Angelschein-Pruefungsvorbereitung (Quiz)',
        'Tutorials & AR-Knotenassistent',
        'Fang-Statistiken (CatchStats)',
        'Profil & Einstellungen',
        'Community-Feed lesen & posten'
      ]
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 4.99,
      icon: Zap,
      color: 'from-blue-600 to-cyan-600',
      description: 'Mehr KI, mehr Daten',
      popular: false,
      features: [
        'Alles aus Free',
        'KI-Buddy Chat (unbegrenzt) - CatchGBT',
        'KI-Foto-Analyse von Faengen (unbegrenzt)',
        'Wetter 5 Tage + Wetter-Alarme',
        'Eigene Spots speichern & verwalten',
        'KI-Koeder-Mischer',
        'Gewaesser-Wasseranalyse',
        'Trip-Planer mit KI-Unterstuetzung',
        'Angelbedarf-Marktplatz (UsedGear)'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 9.99,
      icon: Star,
      color: 'from-purple-600 to-violet-600',
      description: 'Vollstaendige KI-Power',
      popular: true,
      features: [
        'Alles aus Basic',
        'KI-Fangprognosen & Hotspot-Erkennung',
        'Satelliten-Gewaesseranalyse (Echtdaten)',
        'AR-Gewaesser-Ansicht 3D',
        'Tiefenkarten & Bathymetrie-Crowdsourcing',
        'Geraete-Integration (Echolot, Bissanzeiger)',
        'Voice Control: Hey Buddy',
        'Digitale Lizenzverwaltung',
        'Community-Ranking, Clans & Events',
        'Fang-Export (PDF)',
        'KI-Trip-Detailbericht (Premium)'
      ]
    },
    {
      id: 'elite',
      name: 'Ultimate',
      price: 19.99,
      icon: Crown,
      color: 'from-amber-500 to-orange-600',
      description: 'Profi-Angler Level',
      popular: false,
      features: [
        'Alles aus Pro',
        'Live-Bissanzeiger per Smartphone-Kamera',
        'KI-Kamera: Echtzeit-Fischerkennung',
        'CatchCam - KI-Analyse direkt vom Foto',
        'Spot-Gruppen mit Freunden teilen',
        'Profi-Analyse: Zeitreihen & Trends',
        'Priorisierte KI-Antworten',
        'Fruehzeitiger Zugang zu neuen Features'
      ]
    },
    {
      id: 'friends',
      name: 'Freundschaft',
      price: 54.99,
      priceLabel: '54,99 / Jahr',
      icon: Sparkles,
      color: 'from-emerald-600 to-teal-600',
      description: 'Jahresplan mit Einladungen',
      popular: false,
      yearly: true,
      features: [
        'Alles aus Ultimate (12 Monate)',
        '3 Freundes-Einladungen inklusive (Basic)',
        'Gemeinsame Spot-Gruppen mit Freunden',
        'Geteilte Fangbuecher & Statistiken',
        'Freunde zu Clans & Events einladen',
        'Gruppen-Ranking & Team-Challenges',
        '~23% Ersparnis gegenueber monatlichem Ultimate'
      ]
    },
    {
      id: 'friends_monthly',
      name: 'Freundschaft Monatlich',
      price: 39.00,
      discountedPrice: 19.00,
      icon: Sparkles,
      color: 'from-pink-600 to-rose-600',
      description: 'Monatsplan - 19 EUR sobald ein Freund sich anmeldet',
      popular: false,
      yearly: false,
      features: [
        'Alles aus Ultimate (1 Monat)',
        'Regulaer 39 EUR/Monat',
        'NUR 19 EUR/Monat sobald ein eingeladener Freund sich anmeldet',
        'Freundes-Einladungen inklusive',
        'Gemeinsame Spot-Gruppen mit Freunden',
        'Geteilte Fangbuecher & Statistiken',
        'Freunde zu Clans & Events einladen',
        'Gruppen-Ranking & Team-Challenges',
        'Monatlich kuendbar'
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-cyan-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Lädt...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6 pb-32">
      <TrialOfferPopup currentPlan={currentPlan} onPurchaseSuccess={loadData} />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] mb-4">
            Premium-Pläne
          </h1>
          <p className="text-gray-400 text-lg">
            Wähle den Plan, der am besten zu deinem Angel-Abenteuer passt
          </p>
          {currentPlan && currentPlan.id !== 'free' && (
            <div className="mt-4">
              <Badge className="bg-emerald-600 text-white">
                Aktueller Plan: {currentPlan.name}
                {currentPlan.remaining_days && ` - Noch ${currentPlan.remaining_days} Tage`}
              </Badge>
            </div>
          )}

          {billingAvailable && (
            <div className="mt-6">
              <Button
                onClick={handleRestorePurchases}
                disabled={restoring}
                variant="outline"
                className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
              >
                {restoring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird wiederhergestellt...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Käufe wiederherstellen
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {!billingAvailable && (
          <div className="max-w-3xl mx-auto mb-8 p-4 rounded-xl border border-cyan-700/50 bg-cyan-900/20 flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-cyan-100">
              <strong className="block mb-1">Bezahlung im Browser</strong>
              Du kannst Premium-Plaene direkt hier mit Kreditkarte (Visa, Mastercard, Amex), Google Pay oder Apple Pay bezahlen.
              In der Android-App ist zusaetzlich Google Play Billing verfuegbar.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan?.id === plan.id;
            const isProcessing = processingPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`glass-morphism relative overflow-hidden ${
                  isCurrentPlan ? 'border-emerald-500 border-2' : 'border-gray-800'
                } ${plan.popular ? 'ring-2 ring-purple-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-purple-600 text-white">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Beliebt
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
                    {plan.name}
                  </CardTitle>
                  <p className="text-xs text-gray-400 mt-1">{plan.description}</p>
                  <CardDescription>
                    <div className="text-3xl font-bold text-white mt-2">
                      {plan.price === 0 ? 'Gratis' : `${plan.price}€`}
                      {plan.price > 0 && (
                        <span className="text-sm text-gray-400 font-normal">
                          {plan.yearly ? '/Jahr' : '/Monat'}
                        </span>
                      )}
                    </div>
                    {plan.discountedPrice && (
                      <div className="mt-2 text-sm text-emerald-400 font-semibold">
                        Mit Freund: nur {plan.discountedPrice}€/Monat
                      </div>
                    )}
                    {plan.yearly && (
                      <div className="mt-1">
                        <Badge className="bg-emerald-700 text-white text-xs">Jahresplan</Badge>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button disabled className="w-full bg-emerald-600">
                      Aktiver Plan
                    </Button>
                  ) : plan.price === 0 ? (
                    <Button disabled className="w-full bg-gray-700">
                      Kostenlos nutzen
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      {billingAvailable && (
                        <Button
                          onClick={() => handlePlayStorePurchase(plan.id)}
                          disabled={isProcessing}
                          className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50`}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Kauf wird gestartet...
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-4 h-4" />
                              Im Play Store kaufen
                            </>
                          )}
                        </Button>
                      )}
                      {!billingAvailable && (
                        <WebCheckoutButton planId={plan.id} disabled={isProcessing} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center space-y-4">
          <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-white mb-2 flex items-center justify-center gap-2">
              <Mail className="w-5 h-5 text-cyan-400" />
              Fragen zu Premium?
            </h3>
            <p className="text-gray-400 mb-4">
              Kontaktiere uns per E-Mail bei Fragen zu den Premium-Plänen oder zum Google Play Kauf.
            </p>
            <Button
              onClick={() => {
                window.location.href = `mailto:support@catchgbt.app?subject=Premium Anfrage&body=Hallo,%0D%0A%0D%0AIch interessiere mich für einen Premium-Plan.%0D%0A%0D%0AMeine E-Mail: ${user?.email || ''}`;
              }}
              variant="outline"
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
            >
              <Mail className="w-4 h-4 mr-2" />
              Support kontaktieren
            </Button>
          </div>

          <p className="text-gray-500 text-sm">
            {billingAvailable
              ? 'Alle Kaeufe erfolgen ueber deinen Google Play Account. Verwaltung & Kuendigung in den Play Store Einstellungen.'
              : 'Bezahlung per Kreditkarte, Google Pay oder Apple Pay laeuft sicher ueber Stripe.'}
          </p>
        </div>
      </div>
    </div>
  );
}