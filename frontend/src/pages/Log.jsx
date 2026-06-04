import { useState } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X, Trash2 } from 'lucide-react';

const SPECIES = ['Hecht', 'Zander', 'Barsch', 'Karpfen', 'Forelle', 'Schleie', 'Aal', 'Wels', 'Sonstige'];
const BAITS = ['Gummifisch', 'Wobbler', 'Spinner', 'Blinker', 'Boilies', 'Mais', 'Wurm', 'Fliege'];

export default function Log() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ species: '', length_cm: '', weight_kg: '', bait_used: '', notes: '', is_released: false });

  const { data } = useQuery({ queryKey: ['catches'], queryFn: () => api.get('/api/catches') });

  const add = useMutation({
    mutationFn: (body) => api.post('/api/catches', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catches'] }); setShowForm(false); setForm({ species: '', length_cm: '', weight_kg: '', bait_used: '', notes: '', is_released: false }); toast.success('Fang eingetragen!'); },
    onError: e => toast.error(e.message)
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/api/catches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catches'] }); toast.success('Gelöscht'); },
    onError: e => toast.error(e.message)
  });

  const catches = data?.catches || [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Fangbuch ({catches.length})</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors">
          <Plus size={16} /> Fang eintragen
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-lg bg-gray-900 rounded-2xl p-6 border border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Neuer Fang</h2>
              <button onClick={() => setShowForm(false)}><X className="text-gray-400" size={20} /></button>
            </div>
            <select value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white">
              <option value="">Fischart wählen</option>
              {SPECIES.map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Länge (cm)" value={form.length_cm}
                onChange={e => setForm(f => ({ ...f, length_cm: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500" />
              <input type="number" placeholder="Gewicht (kg)" value={form.weight_kg}
                onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500" />
            </div>
            <select value={form.bait_used} onChange={e => setForm(f => ({ ...f, bait_used: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white">
              <option value="">Köder wählen</option>
              {BAITS.map(b => <option key={b}>{b}</option>)}
            </select>
            <textarea placeholder="Notizen (optional)" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 resize-none" rows={2} />
            <label className="flex items-center gap-3 text-gray-400">
              <input type="checkbox" checked={form.is_released} onChange={e => setForm(f => ({ ...f, is_released: e.target.checked }))} className="w-4 h-4" />
              Zurückgesetzt
            </label>
            <button onClick={() => add.mutate({ ...form, catch_time: new Date().toISOString() })}
              disabled={!form.species || add.isPending}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-50 transition-colors">
              {add.isPending ? 'Speichern...' : 'Fang eintragen'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {catches.length === 0
        ? <div className="text-center py-20 text-gray-500"><p className="text-4xl mb-4">🎣</p><p>Noch keine Fänge</p></div>
        : <div className="space-y-3">
          {catches.map(c => (
            <div key={c.id} className="rounded-2xl bg-gray-900/80 p-4 border border-gray-800 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{c.species || 'Unbekannt'}</p>
                  {c.is_released && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">Zurückgesetzt</span>}
                </div>
                <p className="text-gray-400 text-sm mt-1">{c.length_cm && `${c.length_cm}cm`} {c.weight_kg && `· ${c.weight_kg}kg`} {c.bait_used && `· ${c.bait_used}`}</p>
                <p className="text-gray-600 text-xs mt-1">{new Date(c.catch_time).toLocaleString('de-DE')}</p>
                {c.notes && <p className="text-gray-500 text-xs mt-1 italic">{c.notes}</p>}
              </div>
              <button onClick={() => del.mutate(c.id)} className="text-gray-600 hover:text-red-400 p-1 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
