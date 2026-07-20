import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { auth } from "@/api/auth";
import { functions } from "@/api/frontendClient";
import { Users, Crown, Copy, Check, Share2, Gift, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "bb_referral_popup_last_shown";
const REDEEM_STORAGE_KEY = "bb_pending_referral_code";
// Cooldown zwischen den Popup-Einblendungen: nicht jeder Login soll nerven,
// aber häufig genug, damit die Aktion nicht vergessen wird.
const COOLDOWN_HOURS = 72;

function shouldShowPopup() {
  try {
    const last = localStorage.getItem(STORAGE_KEY);
    if (!last) return true;
    const lastMs = parseInt(last, 10);
    if (!Number.isFinite(lastMs)) return true;
    const hoursSince = (Date.now() - lastMs) / (1000 * 60 * 60);
    return hoursSince >= COOLDOWN_HOURS;
  } catch {
    return true;
  }
}

function markPopupShown() {
  try {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  } catch {
    /* Storage im WebView optional — Popup zeigt sich beim nächsten Start eben nochmal */
  }
}

export default function ReferralInvitePopup() {
  const [open, setOpen] = useState(false);
  const [referral, setReferral] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const shareUrl = referral?.code
    ? `${window.location.origin}?ref=${referral.code}`
    : "";

  const loadReferral = useCallback(async () => {
    setLoading(true);
    try {
      const data = await functions.invoke("getMyReferral");
      if (data && data.ok && data.code) {
        setReferral(data);
        return data;
      }
    } catch (error) {
      console.debug("Referral-Popup: Code konnte nicht geladen werden", error);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const isAuth = await auth.isAuthenticated().catch(() => false);
      if (!isAuth || cancelled) return;

      // Wurde beim Landen ?ref=CODE gespeichert (Home.jsx), erst einlösen —
      // dann Popup zeigen, damit der neue Nutzer die Belohnung sieht.
      const pendingCode = (() => {
        try { return localStorage.getItem(REDEEM_STORAGE_KEY); } catch { return null; }
      })();
      if (pendingCode) {
        try {
          await functions.invoke("redeemReferralCode", { code: pendingCode });
        } catch {
          /* schon eingelöst / ungültig — kein blockierender Fehler */
        }
        try { localStorage.removeItem(REDEEM_STORAGE_KEY); } catch { /* ignore */ }
      }

      if (!shouldShowPopup()) return;

      const data = await loadReferral();
      if (cancelled) return;
      // Ohne gültigen Code (offline, Backend down, Mock in E2E) nichts
      // öffnen — sonst blockiert der Radix-Overlay den restlichen Dashboard-
      // Content, ohne dem Nutzer echten Mehrwert zu bieten.
      if (!data?.code) return;

      // Kurzer Delay, damit das Dashboard erst montiert ist.
      const t = setTimeout(() => {
        if (!cancelled) {
          setOpen(true);
          markPopupShown();
        }
      }, 900);
      return () => clearTimeout(t);
    };

    init();
    return () => { cancelled = true; };
  }, [loadReferral]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Einladungslink kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen — Link bitte manuell markieren");
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    const shareData = {
      title: "BaitBuddy — Angel-App mit KI-Buddy",
      text: "Angel smarter mit BaitBuddy. Nutze meinen Einladungslink und wir bekommen beide Ultimate freigeschaltet.",
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error?.name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const rewardCount = referral?.referral_count ?? 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="border-0 bg-transparent p-0 shadow-none max-w-md sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="relative overflow-hidden rounded-3xl">
          <motion.div
            className="absolute inset-0 -z-10"
            animate={{
              background: [
                "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #a855f7 100%)",
                "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f59e0b 100%)",
                "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
                "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #a855f7 100%)",
              ],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-2 w-2 rounded-full bg-white/70"
                style={{
                  top: `${(i * 37) % 90 + 5}%`,
                  left: `${(i * 53) % 90 + 5}%`,
                }}
                animate={{
                  y: [0, -14, 0],
                  opacity: [0.2, 0.9, 0.2],
                  scale: [0.6, 1.2, 0.6],
                }}
                transition={{
                  duration: 3 + (i % 4),
                  repeat: Infinity,
                  delay: (i % 6) * 0.3,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <div className="relative flex flex-col items-center gap-5 rounded-3xl bg-black/55 px-6 py-8 text-white backdrop-blur-2xl sm:px-8">
            <motion.div
              initial={{ scale: 0.6, rotate: -18, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.05 }}
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 shadow-[0_0_40px_rgba(251,191,36,0.55)]"
            >
              <Gift className="h-10 w-10 text-white drop-shadow" />
              <motion.span
                className="absolute -right-2 -top-2"
                animate={{ rotate: [0, 20, -10, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="h-6 w-6 text-yellow-200 drop-shadow" />
              </motion.span>
            </motion.div>

            <div className="text-center space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-200">
                Freunde einladen
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                <span className="text-amber-200">
                  1 Woche Ultimate geschenkt
                </span>
              </h2>
              <p className="text-sm text-white/85 max-w-sm mx-auto">
                Für jeden Freund, der sich über deinen Link registriert und einloggt,
                verlängern wir deinen Ultimate-Plan automatisch um{" "}
                <span className="font-semibold text-amber-200">7 Tage</span>.
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/10 px-2 py-3 backdrop-blur">
                <Crown className="mx-auto mb-1 h-5 w-5 text-amber-300" />
                <p className="text-[10px] uppercase tracking-wider text-white/70">Belohnung</p>
                <p className="text-sm font-bold">Ultimate</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-2 py-3 backdrop-blur">
                <Users className="mx-auto mb-1 h-5 w-5 text-cyan-200" />
                <p className="text-[10px] uppercase tracking-wider text-white/70">Eingeladen</p>
                <p className="text-sm font-bold">{rewardCount}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-2 py-3 backdrop-blur">
                <Gift className="mx-auto mb-1 h-5 w-5 text-pink-200" />
                <p className="text-[10px] uppercase tracking-wider text-white/70">Pro Freund</p>
                <p className="text-sm font-bold">+7 Tage</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-11 w-full rounded-xl bg-white/10 animate-pulse"
                />
              ) : referral?.code ? (
                <motion.div
                  key="code"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="w-full"
                >
                  <p className="mb-1 text-xs text-white/70">Dein persönlicher Einladungslink</p>
                  <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/40 px-3 py-2">
                    <span className="flex-1 truncate font-mono text-sm text-white">
                      {shareUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      aria-label="Einladungslink kopieren"
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                        copied
                          ? "bg-emerald-500/80 text-white"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-white/70"
                >
                  Dein Einladungslink konnte nicht geladen werden. Bitte prüfe deine
                  Verbindung und öffne das Profil, um es erneut zu versuchen.
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button
                onClick={handleShare}
                disabled={loading || !referral?.code}
                className="w-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 py-6 text-base font-semibold text-white shadow-lg hover:opacity-95"
              >
                <Share2 className="mr-2 h-5 w-5" />
                Jetzt teilen
              </Button>
              <Button
                onClick={handleClose}
                variant="ghost"
                className="w-full text-white/70 hover:bg-white/10 hover:text-white sm:w-auto"
              >
                Später
              </Button>
            </div>

            <p className="text-center text-[11px] text-white/60">
              Belohnung wird automatisch gutgeschrieben, sobald sich dein Freund
              einloggt.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
