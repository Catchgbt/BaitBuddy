import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { events } from '@/api/frontendClient';
import { auth } from '@/api/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Trophy,
  Users,
  Zap,
  Plus,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';

export default function EventCatalog() {
  useFeatureTracking('events');
  const [templates, setTemplates] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [customEventData, setCustomEventData] = useState({
    name: '',
    description: '',
    target_species: '',
    duration_days: 14
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [user, templates, activeEvents] = await Promise.all([
        auth.me(),
        events.templates(),
        events.list()
      ]);
      setCurrentUser(user);
      setTemplates(templates);
      setActiveEvents(activeEvents);
    } catch (error) {
      console.error('Fehler beim Laden von Events:', error);
      toast.error('Fehler beim Laden der Events');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTemplate = async (templateId) => {
    try {
      const result = await events.startCompetition(templateId);
      toast.success('Wettbewerb erfolgreich gestartet!');
      await loadData();
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (error) {
      console.error('Fehler beim Starten des Wettbewerbs:', error);
      toast.error('Fehler beim Starten des Wettbewerbs');
    }
  };

  const handleCreateCustomEvent = async () => {
    if (!customEventData.name || !customEventData.duration_days) {
      toast.error('Name und Dauer erforderlich');
      return;
    }

    try {
      setCreatingEvent(true);
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + parseInt(customEventData.duration_days));

      const result = await events.create({
        name: customEventData.name,
        description: customEventData.description,
        target_species: customEventData.target_species || null,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        event_type: 'custom',
        scoring_method: 'points'
      });

      toast.success('Event erfolgreich erstellt! Du kannst jetzt User einladen.');
      setShowCreateDialog(false);
      setCustomEventData({ name: '', description: '', target_species: '', duration_days: 14 });
      await loadData();
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (error) {
      console.error('Fehler beim Erstellen des Events:', error);
      toast.error('Fehler beim Erstellen des Events');
    } finally {
      setCreatingEvent(false);
    }
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const endDate = new Date(event.end_date);
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft} Tage verbleibend` : 'Beendet';
  };

  const categoryEvents = {
    all: activeEvents,
    ongoing: activeEvents.filter(e => new Date(e.end_date) > new Date() && e.status === 'active'),
    upcoming: activeEvents.filter(e => new Date(e.start_date) > new Date()),
    custom: activeEvents.filter(e => e.event_type === 'custom')
  };

  const displayedEvents = categoryEvents[filter] || activeEvents;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Trophy className="w-10 h-10 text-amber-400" />
                Events & Wettbewerbe
              </h1>
              <p className="text-gray-400">
                Tritt bestehenden Events bei oder starte deinen eigenen Wettbewerb mit deinen Freunden
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Neues Event
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Eigenes Event erstellen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Event-Name
                    </label>
                    <Input
                      placeholder="z.B. Mein Sommer-Hecht-Turnier"
                      value={customEventData.name}
                      onChange={(e) => setCustomEventData({ ...customEventData, name: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Beschreibung
                    </label>
                    <Textarea
                      placeholder="Beschreibe dein Event..."
                      value={customEventData.description}
                      onChange={(e) => setCustomEventData({ ...customEventData, description: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Zielfisch (optional)
                    </label>
                    <Input
                      placeholder="z.B. Hecht"
                      value={customEventData.target_species}
                      onChange={(e) => setCustomEventData({ ...customEventData, target_species: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Dauer (Tage)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={customEventData.duration_days}
                      onChange={(e) => setCustomEventData({ ...customEventData, duration_days: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <Button
                    onClick={handleCreateCustomEvent}
                    disabled={creatingEvent}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                  >
                    {creatingEvent ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Wird erstellt...
                      </>
                    ) : (
                      'Event erstellen'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['all', 'ongoing', 'custom'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                filter === tab
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab === 'all' && 'Alle'}
              {tab === 'ongoing' && 'Laufend'}
              {tab === 'custom' && 'Eigene'}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {displayedEvents.length > 0 ? (
            displayedEvents.map((event) => (
              <Card
                key={event.id}
                className="glass-morphism border-amber-600/30 bg-gradient-to-br from-amber-900/10 to-orange-900/10 hover:border-amber-500/60 transition-all cursor-pointer group"
                onClick={() => window.location.href = `/events/${event.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-amber-400 text-lg mb-1">
                        {event.name}
                      </CardTitle>
                      <p className="text-xs text-gray-400">
                        {event.event_type === 'custom' ? 'Benutzerveranstaltet' : 'Template'}
                      </p>
                    </div>
                    {new Date(event.end_date) > new Date() && event.status === 'active' && (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.description && (
                    <p className="text-sm text-gray-300">{event.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {event.target_species && (
                      <span className="px-2 py-1 bg-emerald-900/30 border border-emerald-600/30 rounded text-xs text-emerald-400">
                        <Target className="w-3 h-3 inline mr-1" />
                        {event.target_species}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-300">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {getEventStatus(event)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-gray-700/50">
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>Teilnehmer</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Zap className="w-4 h-4" />
                      <span>{event.base_points || 100} Punkte</span>
                    </div>
                  </div>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartTemplate(event.template_id || event.id);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Beitreten / Starten
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Keine Events gefunden</p>
              <p className="text-gray-500 text-sm mt-2">Erstelle ein neues Event oder warte auf neue Templates</p>
            </div>
          )}
        </div>

        {/* Event Templates Section */}
        {templates.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              Verfügbare Wettbewerbs-Templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card
                  key={template.template_id}
                  className="glass-morphism border-blue-600/30 bg-gradient-to-br from-blue-900/10 to-cyan-900/10 hover:border-blue-500/60 transition-all"
                >
                  <CardHeader>
                    <CardTitle className="text-blue-400 text-lg">
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-300">{template.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-300">
                        {template.duration_days} Tage
                      </span>
                      <span className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-300">
                        {template.base_points} Basispunkte
                      </span>
                    </div>
                    <Button
                      onClick={() => handleStartTemplate(template.template_id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Starten / Beitreten
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
