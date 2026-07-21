import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star, Sparkles, Mail, Loader2, ShoppingBag, Smartphone, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { functions } from "@/api/frontendClient";
import { auth } from "@/api/auth";
import {
  startGooglePlayPurchase,
  isGooglePlayBillingAvailable,
  restoreGooglePlayPurchases
} from "@/components/premium/googlePlayBilling";
import WebCheckoutButton from "@/components/premium/WebCheckoutButton";

export default function PremiumPlans() {
  const [user, setUser] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [billingAvailable, setBillingAvailable] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadData();
    setBillingAvailable(isGooglePlayBillingAvailable());
  }, []);

  // Rücksprung vom Stripe-Checkout: /PremiumPlans?checkout=success&plan_id=...
  // &session_id=cs_... — die Aktivierung läuft serverseitig verifiziert über
  // /api/premium/activate. Params sofort entfernen, damit ein Reload die
  // Aktivierung nicht erneut anstößt (der Server ist zusätzlich idempotent).
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout) return;
    const planId = searchParams.get('plan_id');
    const sessionId = searchParams.get('session_id');
    setSearchParams({}, { replace: true });

    if (checkout === 'cancelled') {
      toast.info('Kauf abgebrochen');
      return;
    }
    if (checkout === 'success' && planId && sessionId) {
      finalizeStripeCheckout(planId, sessionId);
    }
  }, []);

  const finalizeStripeCheckout = async (planId, sessionId) => {
    setProcessingPlan(planId);
    try {
      const response = await functions.invoke('activatePlan', {
        plan_id: planId,
        transaction_id: sessionId,
        payment_method: 'stripe'
      });
      const data = response?.data ?? response;
      if (!data?.ok) {
        throw new Error(data?.error || 'Plan-Aktivierung fehlgeschlagen');
      }
      toast.success('Plan aktiviert', {
        description: 'Deine Zahlung wurde bestätigt. Dein Premium-Plan ist jetzt aktiv.'
      });
      await loadData();
      window.dispatchEvent(new CustomEvent('plan-updated'));
    } catch (error) {
      toast.error('Aktivierung fehlgeschlagen', {
        description: error?.message
          ? `${error.message} — falls die Zahlung abgebucht wurde, kontaktiere den Support.`
          : 'Falls die Zahlung abgebucht wurde, kontaktiere den Support.',
        duration: 10000
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const loadData = async () => {
    try {
      const currentUser = await auth.me();
      setUser(currentUser);

      const planStatusResponse = await functions.invoke('getPlanStatus');
      const planPayload = planStatusResponse?.data ?? planStatusResponse;
      if (planPayload && planPayload.plan) {
        setCurrentPlan(planPayload.plan);
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

  // Pläne bewusst nach Funktionswert priorisiert: Free ist werbefinanziert und
  // enthält nur die Einstiegs-Funktionen (der KI-Buddy ist dabei, aber
  // eingeschränkt). Die wirklich starken KI-, AR- und Analyse-Features steigen
  // mit dem Preis. Preise sind Source-of-Truth-gespiegelt in
  // backend/src/routes/premium.js (CHECKOUT_PLANS/PRODUCTS).
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      icon: Check,
      color: 'from-gray-600 to-gray-700',
      description: 'Kostenlos mit Werbung - zum Reinschnuppern',
      features: [
        'Mit Werbeeinblendungen',
        'KI-Buddy Chat eingeschraenkt (5 Nachrichten/Tag)',
        'Digitales Fangbuch (unbegrenzt)',
        'Angelkarte mit Community-Spots (Basis)',
        'Schonzeiten & Mindestmasse nachschlagen',
        'Angelschein-Pruefungsvorbereitung (Quiz)',
        'Tutorials & AR-Knotenassistent',
        'Aktuelles Wetter (heute)',
        'Community-Feed lesen'
      ]
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 8.99,
      icon: Zap,
      color: 'from-blue-600 to-cyan-600',
      description: 'Werbefrei mit vollem KI-Buddy',
      popular: false,
      features: [
        'Alles aus Free - komplett werbefrei',
        'KI-Buddy Chat unbegrenzt - BaitBuddy',
        'KI-Foto-Analyse von Faengen',
        'Wetter 5 Tage + Wetter-Alarme',
        'Eigene Spots speichern & verwalten',
        'Fang-Statistiken (CatchStats)',
        'Gewaesser-Wasseranalyse',
        'Trip-Planer mit KI-Unterstuetzung',
        'Angelbedarf-Marktplatz (UsedGear)'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 18,
      icon: Star,
      color: 'from-purple-600 to-violet-600',
      description: 'Vollstaendige KI- & AR-Power',
      popular: true,
      features: [
        'Alles aus Basic',
        'KI-Fangprognosen & Hotspot-Erkennung',
        'Satelliten-Gewaesseranalyse (Echtdaten)',
        'AR-Gewaesser-Ansicht 3D & 3D-Koederanimation',
        'Tiefenkarten & Bathymetrie-Crowdsourcing',
        'Geraete-Integration (Echolot, Bissanzeiger)',
        'KI-Koeder-Mischer',
        'Digitale Lizenzverwaltung',
        'Community-Ranking, Clans & Events',
        'Fang-Export (PDF)',
        'KI-Trip-Detailbericht'
      ]
    },
    {
      id: 'elite',
      name: 'Ultimate',
      price: 36,
      icon: Crown,
      color: 'from-amber-500 to-orange-600',
      description: 'Alles inklusive - jede Funktion ohne Limit',
      popular: false,
      features: [
        'Alles aus Pro - jede Funktion ohne Einschraenkung',
        'KI Voice Live Chat (nur Ultimate)',
        'Live-Bissanzeiger per Smartphone-Kamera',
        'KI-Kamera: Echtzeit-Fischerkennung',
        'CatchCam - KI-Analyse direkt vom Foto',
        'Weibliche KI-Stimme "Matilda" (ElevenLabs)',
        'KI-Buddy Chat & Foto-Analyse unbegrenzt',
        'KI-Fangprognosen, Hotspots & Satelliten-Analyse',
        '3D-Koederfuehrung, AR-Gewaesser & AR-Knotenassistent',
        'Tiefenkarten, Wasseranalyse & KI-Koeder-Mischer',
        'Geraete-Integration (Echolot, Bissanzeiger)',
        'Live-Trip-Tracking, Trip-Planer & Lizenzverwaltung',
        'Community-Ranking, Clans, Events & Marktplatz',
        'Spot-Gruppen teilen, Profi-Analyse & Fang-Export',
        'Priorisierte KI-Antworten & frueher Feature-Zugang',
        '3 Freundes-Einladungen inklusive',
        '10 EUR Rabatt auf deinen naechsten Ultimate-Plan pro Freund, der Basic kauft (bis zu 3x = 30 EUR)',
        'Alle weiteren App-Funktionen ohne Einschraenkung'
      ]
    },
    {
      id: 'friends',
      name: 'Freundschaft',
      price: 150,
      priceLabel: '150 / Jahr',
      icon: Sparkles,
      color: 'from-emerald-600 to-teal-600',
      description: 'Ultimate als Jahresabo mit Einladungen',
      popular: false,
      yearly: true,
      features: [
        'Alles aus Ultimate (12 Monate)',
        'Freundes-Einladungen inklusive',
        'Gemeinsame Spot-Gruppen mit Freunden',
        'Geteilte Fangbuecher & Statistiken',
        'Freunde zu Clans & Events einladen',
        'Gruppen-Ranking & Team-Challenges',
        '~72% Ersparnis gegenueber monatlichem Ultimate'
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

            // Referral-Rabatt (10€ je eingeladenem Freund, der Basic kauft) gilt
            // nur für den Ultimate-Plan und nur beim Web-Checkout. Betrag kommt
            // aus dem Plan-Status (ultimate_discount_cents).
            const discountEuro = Math.min(
              (currentPlan?.ultimate_discount_cents || 0) / 100,
              30
            );
            const showUltimateDiscount = plan.id === 'elite' && !billingAvailable && discountEuro > 0;
            const discountedPrice = showUltimateDiscount
              ? Math.max(plan.price - discountEuro, 9.99).toFixed(2)
              : null;

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
                      {plan.price === 0 ? 'Gratis' : (
                        <>
                          {showUltimateDiscount && (
                            <span className="text-lg text-gray-500 line-through mr-2 font-normal">
                              {plan.price}€
                            </span>
                          )}
                          {`${showUltimateDiscount ? discountedPrice : plan.price}€`}
                        </>
                      )}
                      {plan.price > 0 && (
                        <span className="text-sm text-gray-400 font-normal">
                          {plan.yearly ? '/Jahr' : '/Monat'}
                        </span>
                      )}
                    </div>
                    {showUltimateDiscount && (
                      <div className="mt-2 text-sm text-emerald-400 font-semibold">
                        Freundschafts-Rabatt: {discountEuro.toFixed(2)}€ gespart
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