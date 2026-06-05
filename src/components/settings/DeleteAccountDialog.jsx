import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAccountDeletion = async () => {
    if (confirmText !== 'DELETE') {
      toast.error('Bitte gib "DELETE" ein, um fortzufahren.');
      return;
    }

    setIsDeleting(true);
    try {
      toast.info('Lösche Account-Daten...');
      const response = await base44.functions.invoke('deleteAccount');

      if (response.data?.success) {
        toast.success('Account erfolgreich gelöscht!');
        setOpen(false);
        setConfirmText('');
        setTimeout(() => {
          base44.auth.logout('/');
        }, 2000);
      } else {
        toast.error(response.data?.message || 'Fehler beim Löschen der Account-Daten');
      }
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error('Fehler beim Löschen des Accounts. Bitte kontaktiere den Support.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Account löschen
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-morphism border-gray-800 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-400">Account wirklich löschen?</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300 space-y-3">
            <p>
              Möchtest du dein Konto wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <p className="text-sm">
              Alle deine Daten werden permanent gelöscht:
            </p>
            <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
              <li>Fänge und Angelplaetze</li>
              <li>Einstellungen und Profil</li>
              <li>Chat-Verlauf</li>
              <li>Alle persoenlichen Daten</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="confirm-text" className="text-gray-300">
              Gib "DELETE" ein, um das Löschen zu bestätigen:
            </Label>
            <Input
              id="confirm-text"
              placeholder="DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              className="mt-2 bg-gray-800/50 border-gray-700 text-white uppercase"
              disabled={isDeleting}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            disabled={isDeleting}
          >
            Abbrechen
          </AlertDialogCancel>
          <Button
            onClick={handleAccountDeletion}
            disabled={confirmText !== 'DELETE' || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Wird gelöscht...' : 'Account löschen'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}