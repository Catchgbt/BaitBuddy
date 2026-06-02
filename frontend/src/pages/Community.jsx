import { useState } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trophy, Heart } from 'lucide-react';

export default function Community() {
  const qc = useQueryClient();
  const [selectedComp, setSelectedComp] = useState(null);

  const { data: comps } = useQuery({
    queryKey: ['competitions'],
    queryFn: () => api.get('/api/competitions')
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', selectedComp],
    queryFn: () => api.get(`/api/competitions/${selectedComp}/leaderboard`),
    enabled: !!selectedComp
  });

  const like = useMutation({
    mutationFn: (id) => api.post(`/api/submissions/${id}/like`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaderboard'] }); toast.success('Geliked!'); },
    onError: e => toast.error(e.message)
  });

  const competitions = comps?.competitions || [];
  const board = leaderboard?.leaderboard || [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-white">Community</h1>

      {/* Wettbewerbe */}
      <div className="space-y-3">
        {competitions.map(comp => (
          <div key={comp.id}
            onClick={() => setSelectedComp(comp.id === selectedComp ? null : comp.id)}
            className={`rounded-2xl p-4 border cursor-pointer transition-all ${
              selectedComp === comp.id ? 'bg-cyan-900/20 border-cyan-600' : 'bg-gray-900/80 border-gray-800'
            }`}>
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-400" size={18} />
              <p className="font-semibold text-white">{comp.title}</p>
            </div>
            {comp.description && <p className="text-gray-400 text-sm mt-1">{comp.description}</p>}
            {comp.end_date && (
              <p className="text-gray-600 text-xs mt-1">
                Bis: {new Date(comp.end_date).toLocaleDateString('de-DE')}
              </p>
            )}
          </div>
        ))}
        {competitions.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-4">🏆</p>
            <p>Keine aktiven Wettbewerbe</p>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {selectedComp && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Rangliste</h2>
          {board.map((entry, i) => (
            <div key={entry.id} className="rounded-xl bg-gray-900/80 p-3 border border-gray-800 flex items-center gap-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                i === 0 ? 'bg-yellow-400 text-black' :
                i === 1 ? 'bg-gray-300 text-black' :
                i === 2 ? 'bg-orange-400 text-black' : 'bg-gray-800 text-gray-400'
              }`}>{i + 1}</span>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{entry.species || '?'} · {entry.length_cm}cm</p>
                <p className="text-gray-500 text-xs">{entry.user_id}</p>
              </div>
              <button onClick={() => like.mutate(entry.id)}
                className="flex items-center gap-1 text-gray-500 hover:text-red-400 transition-colors">
                <Heart size={16} />
                <span className="text-xs">{entry.community_likes || 0}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
