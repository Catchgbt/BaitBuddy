import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useOptimisticMutation } from '@/lib/useOptimisticMutation';
import { toast } from 'sonner';

export default function DeleteAccountSection() {
  const [step, setStep] = useState('idle');
  const [error, setError] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  const deleteAccountMutation = useOptimisticMutation({
    mutationFn: async () => {
      const response = await fetch('/api/functions/deleteAccount', { method: 'POST' });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Delete failed');
      return data;
    },
    onSuccess: () => {
      setStep('success');
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    },
    onError: (err) => {
      setError(err.message || 'Unbekannter Fehler beim Löschen des Kontos.');
      setStep('error');
    },
    invalidateOnSettle: false
  });

  const handleInitiateDelete = () => {
    setError(null);
    setConfirmText('');
    setStep('step1');
  };

  const handleProceedToStep2 = () => {
    setStep('step2');
  };

  const handleConfirmDelete = () => {
    if (!confirmText.trim()) {
      setError('Bitte geben Sie die Bestätigung ein, um fortzufahren.');
      return;
    }
    deleteAccountMutation.mutate();
  };

  const handleCancel = () => {
    setStep('idle');
    setError(null);
    setConfirmText('');
  };

  return (
    <>
      <Card className="glass-morphism border-red-900/40 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-red-400 text-base">Konto löschen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">
            Durch das Löschen deines Kontos werden alle deine Daten unwiderruflich entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
          </p>

          {step === 'idle' && (
            <button
              aria-label="Konto löschen starten"
              onClick={handleInitiateDelete}
              className="min-h-[44px] w-full px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50 text-sm font-medium transition"
            >
              Konto löschen
            </button>
          )}

          {step === 'success' && (
            <div className="p-4 bg-emerald-950/30 rounded-lg border border-emerald-800/40">
              <p className="text-sm text-emerald-400">
                Konto erfolgreich gelöscht. Du wirst in Kürze weitergeleitet...
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="p-4 bg-red-950/30 rounded-lg border border-red-800/40">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-300 font-medium">Fehler beim Löschen</p>
                  {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                </div>
              </div>
              <button
                onClick={handleInitiateDelete}
                className="mt-4 w-full min-h-[44px] px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50 text-sm font-medium transition"
              >
                Erneut versuchen
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 1: Warning modal */}
      <Dialog open={step === 'step1'} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Konto wirklich löschen?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-red-950/30 rounded-lg border border-red-800/40">
              <p className="text-sm text-red-300">
                Durch das Löschen deines Kontos werden gelöscht:
              </p>
              <ul className="text-xs text-gray-300 mt-3 space-y-1 ml-4">
                <li>Alle Fangdaten und Fangbucheinträge</li>
                <li>Alle Angelplätze und Gruppen</li>
                <li>Alle Community-Beiträge und Kommentare</li>
                <li>Alle persönlichen Einstellungen</li>
                <li>Alle verknüpften Geräte und Sessions</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 min-h-[44px]"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleProceedToStep2}
              className="bg-red-700 hover:bg-red-600 text-white min-h-[44px]"
            >
              Fortfahren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: Final confirmation with text input */}
      <Dialog open={step === 'step2'} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Bestätigung erforderlich</DialogTitle>
            <DialogDescription className="text-gray-400">
              Geben Sie das Wort unten ein, um das Löschen zu bestätigen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-sm font-mono text-cyan-400">MEINKONTO_LÖSCHEN</p>
            </div>

            <input
              type="text"
              placeholder="Geben Sie die Bestätigung ein..."
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (error) setError(null);
              }}
              className="w-full px-3 py-2 min-h-[44px] rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />

            {error && (
              <div className="p-3 bg-red-950/30 rounded-lg border border-red-800/40">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Diese Aktion löscht dauerhaft alle deine Daten und kann nicht rückgängig gemacht werden.
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={deleteAccountMutation.isPending}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 min-h-[44px]"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleteAccountMutation.isPending || !confirmText.trim()}
              className="bg-red-700 hover:bg-red-600 text-white min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteAccountMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                'Konto unwiderruflich löschen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}