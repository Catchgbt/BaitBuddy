import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from "@/api/frontendClient";

export default function EventLauncher({ currentUser, onStarted }) {
  const [templates, setTemplates] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await api.get('/api/events/templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fehler beim Laden der Templates:', err);
      toast.error('Templates konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvent = async (template) => {
    if (!currentUser) {
      toast.error('Bitte melde dich an');
      return;
    }

    setLoadingId(template.template_id || template.id);
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + (template.duration_days || 14));

      console.log('Starting event with data:', {
        name: template.name,
        description: template.description,
        template_id: template.template_id || template.id,
        start_date: now.toISOString(),
        end_date: endDate.toISOString()
      });

      const response = await api.post('/api/events', {
        name: template.name,
        description: template.description,
        template_id: template.template_id || template.id,
        start_date: now.toISOString(),
        end_date: endDate.toISOString()
      });

      console.log('Event creation response:', response);

      if (response && (response.id || response.success)) {
        toast.success(`"${template.name}" gestartet! Andere können jetzt mitmachen.`);
        if (onStarted) await onStarted();
      } else {
        toast.success(`"${template.name}" aktiviert!`);
        if (onStarted) await onStarted();
      }
    } catch (error) {
      console.error('Fehler beim Starten des Events:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Event konnte nicht gestartet werden';
      toast.error(`Fehler: ${errorMsg}`);
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="glass-morphism border-cyan-600/30 bg-gradient-to-br from-cyan-900/10 to-blue-900/10 rounded-2xl">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-morphism border-cyan-600/30 bg-gradient-to-br from-cyan-900/10 to-blue-900/10 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-cyan-400 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Event-Vorlagen
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Starte ein vorgegebenes Event mit Freunden. Punkte sammeln und gewinnen!
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((template) => (
            <div
              key={template.id || template.template_id}
              className="bg-gray-900/40 border border-cyan-500/20 rounded-xl p-4 hover:border-cyan-500/40 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {template.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
                  {template.duration_days || 14} Tage
                </span>
                <button
                  onClick={() => handleStartEvent(template)}
                  disabled={loadingId === (template.template_id || template.id) || !currentUser}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded transition flex items-center gap-1"
                >
                  {loadingId === (template.template_id || template.id) ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Startet...
                    </>
                  ) : (
                    "Starten"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <p className="text-center text-gray-400 py-4">
            Keine Event-Vorlagen verfügbar
          </p>
        )}
      </CardContent>
    </Card>
  );
}
