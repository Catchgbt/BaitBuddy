import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useBuddyPreferences } from '@/lib/BuddyPreferencesContext';
import BuddySettings from '@/components/settings/BuddySettings';
export default function BuddyOnboarding() {
  const { buddy, canSave } = useBuddyPreferences();
  const [dismissed, setDismissed] = useState(false);
  return <Dialog open={canSave && !buddy.chosen && !dismissed} onOpenChange={open => { if (!open) setDismissed(true); }}><DialogContent className="bb-app max-h-[85vh] overflow-y-auto max-w-xl border-slate-700"><DialogTitle>Dein Angelbegleiter</DialogTitle><DialogDescription>Wähle deinen Buddy. In den Einstellungen kannst du ihn jederzeit ändern.</DialogDescription><BuddySettings onSaved={() => setDismissed(true)}/></DialogContent></Dialog>;
}
