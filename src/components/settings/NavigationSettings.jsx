import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useBuddyPreferences } from '@/lib/BuddyPreferencesContext';
import { DEFAULT_NAVIGATION, NAVIGATION_OPTIONS } from '@/lib/buddyPreferences';
import { navigationItems } from '@/components/navigation/navigationItems';
export default function NavigationSettings() {
  const { navigation, saveNavigation, saving, canSave } = useBuddyPreferences();
  const [draft, setDraft] = useState(navigation);
  useEffect(() => setDraft(navigation), [navigation]);
  const move = (index, delta) => setDraft(previous => { const next = [...previous]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next; });
  const save = async () => { try { await saveNavigation(draft); toast.success('Navigation gespeichert'); } catch (error) { toast.error(error.message || 'Navigation konnte nicht gespeichert werden.'); } };
  return <section className="bb-app bb-card space-y-5"><div><h2 className="text-xl font-semibold">Deine Navigation</h2><p className="bb-muted mt-2">Bis zu vier Favoriten und die feste Schnellaktion in der Mitte.</p></div>
    <ol className="space-y-2">{draft.map((key, index) => <li key={key} className="flex items-center gap-2 bg-white/5 rounded-xl pl-4"><span className="flex-1">{navigationItems[key].name}</span>
      <button type="button" className="p-3 disabled:opacity-25" disabled={index === 0} aria-label={`${navigationItems[key].name} nach vorne`} onClick={() => move(index, -1)}><ArrowUp size={18}/></button>
      <button type="button" className="p-3 disabled:opacity-25" disabled={index === draft.length - 1} aria-label={`${navigationItems[key].name} nach hinten`} onClick={() => move(index, 1)}><ArrowDown size={18}/></button>
      <button type="button" className="p-3 disabled:opacity-25" disabled={draft.length === 1} aria-label={`${navigationItems[key].name} entfernen`} onClick={() => setDraft(draft.filter(item => item !== key))}><X size={18}/></button>
    </li>)}</ol>
    <div className="flex flex-wrap gap-2">{NAVIGATION_OPTIONS.filter(key => !draft.includes(key)).map(key => <button type="button" key={key} className="bb-secondary disabled:opacity-40" disabled={draft.length >= 4} onClick={() => setDraft([...draft, key])}><Plus size={16}/>{navigationItems[key].name}</button>)}</div>
    <div className="flex flex-wrap gap-3"><button type="button" className="bb-action" onClick={save} disabled={!canSave || saving}>{saving ? 'Wird gespeichert …' : 'Navigation speichern'}</button><button type="button" className="bb-secondary" onClick={() => setDraft([...DEFAULT_NAVIGATION])}>Standard wiederherstellen</button></div>
    {!canSave && <p className="bb-muted">Zum Speichern bitte anmelden.</p>}
  </section>;
}
