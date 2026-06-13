import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { events } from '@/api/frontendClient';
import { auth } from '@/api/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Trophy,
  Users,
  Zap,
  Clock,
  Target,
  Send,
  Loader2,
  ChevronLeft,
  Camera,
  Trash2,
  Mail,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';

export default function EventDetails() {
  useFeatureTracking('event_details');
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [isParticipant, setIsParticipant] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Form state
  const [submissionData, setSubmissionData] = useState({
    species: '',
    length_cm: '',
    weight_kg: '',
    photo_url: ''
  });

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [user, eventData, participantsData, leaderboardData] = await Promise.all([
        auth.me(),
        events.get(eventId),
        events.participants(eventId),
        events.leaderboard(eventId)
      ]);

      setCurrentUser(user);
      setEvent(eventData);
      setParticipants(participantsData);
      setLeaderboard(leaderboardData);
      setIsParticipant(participantsData.some(p => p.user_id === user.email));
    } catch (error) {
      console.error('Fehler beim Laden des Events:', error);
      toast.error('Fehler beim Laden des Events');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    try {
      await events.join(eventId);
      toast.success('Du bist dem Event beigetreten!');
      await loadData();
    } catch (error) {
      console.error('Fehler beim Beitreten:', error);
      toast.error('Fehler beim Beitreten des Events');
    }
  };

  const handleSubmitCatch = async () => {
    if (!submissionData.species || !submissionData.length_cm) {
      toast.error('Art und Länge erforderlich');
      return;
    }

    try {
      setSubmitting(true);
      await events.submit(eventId, {
        species: submissionData.species,
        length_cm: parseFloat(submissionData.length_cm),
        weight_kg: submissionData.weight_kg ? parseFloat(submissionData.weight_kg) : null,
        photo_url: submissionData.photo_url || null,
        catch_time: new Date().toISOString()
      });

      toast.success('Fang erfolgreich eingereicht!');
      setSubmissionData({ species: '', length_cm: '', weight_kg: '', photo_url: '' });
      await loadData();
    } catch (error) {
      console.error('Fehler beim Einreichen:', error);
      toast.error('Fehler beim Einreichen des Fangs');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInvite = async () => {
    const emailList = inviteEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emailList.length === 0) {
      toast.error('Bitte gib gültige E-Mail-Adressen ein');
      return;
    }

    try {
      setInviting(true);
      await events.invite(eventId, emailList);
      toast.success(`${emailList.length} Einladung(en) versendet!`);
      setInviteEmails('');
      setShowInviteDialog(false);
    } catch (error) {
      console.error('Fehler beim Versenden von Einladungen:', error);
      toast.error('Fehler beim Versenden von Einladungen');
    } finally {
      setInviting(false);
    }
  };

  const getEventStatus = () => {
    if (!event) return '';
    const now = new Date();
    const endDate = new Date(event.end_date);
    if (endDate < now) return 'Beendet';
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return `${daysLeft} Tage verbleibend`;
  };

  const canInvite = event && currentUser && event.created_by === currentUser.email;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 flex items-center justify-center">
        <Card className="glass-morphism border-gray-600/30 bg-gradient-to-br from-gray-800/20 to-gray-900/20 max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-white text-lg">Event nicht gefunden</p>
            <Button
              onClick={() => navigate('/events')}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Zurück zu Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Button
          variant="ghost"
          onClick={() => navigate('/events')}
          className="mb-6 text-gray-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-amber-400" />
            {event.name}
          </h1>
          {event.description && (
            <p className="text-gray-400 text-lg">{event.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Info */}
            <Card className="glass-morphism border-amber-600/30 bg-gradient-to-br from-amber-900/10 to-orange-900/10">
              <CardHeader>
                <CardTitle className="text-amber-400">Event-Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <p className="text-white font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      {getEventStatus()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Basispunkte</p>
                    <p className="text-white font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      {event.base_points || 100}
                    </p>
                  </div>
                </div>

                {event.target_species && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Zielfisch</p>
                    <p className="text-white font-semibold flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-400" />
                      {event.target_species}
                    </p>
                  </div>
                )}

                {event.prize_description && (
                  <div className="pt-2 border-t border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-2">Preis</p>
                    <p className="text-white">{event.prize_description}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-700/50 flex gap-2">
                  {!isParticipant && (
                    <Button
                      onClick={handleJoinEvent}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Dem Event beitreten
                    </Button>
                  )}
                  {canInvite && (
                    <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                      <DialogTrigger asChild>
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                          <Mail className="w-4 h-4 mr-2" />
                          Einladungen senden
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">User einladen</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-gray-400">
                            E-Mail-Adressen durch Kommas getrennt eingeben
                          </p>
                          <Input
                            placeholder="user1@example.com, user2@example.com"
                            value={inviteEmails}
                            onChange={(e) => setInviteEmails(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white"
                          />
                          <Button
                            onClick={handleInvite}
                            disabled={inviting}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            {inviting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Wird versendet...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Einladungen senden
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit Catch */}
            {isParticipant && (
              <Card className="glass-morphism border-green-600/30 bg-gradient-to-br from-green-900/10 to-emerald-900/10">
                <CardHeader>
                  <CardTitle className="text-green-400 flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Fang einreichen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Fischart
                      </label>
                      <Input
                        placeholder="z.B. Hecht"
                        value={submissionData.species}
                        onChange={(e) => setSubmissionData({ ...submissionData, species: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Länge (cm)
                      </label>
                      <Input
                        type="number"
                        placeholder="z.B. 75"
                        step="0.5"
                        value={submissionData.length_cm}
                        onChange={(e) => setSubmissionData({ ...submissionData, length_cm: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Gewicht (kg) - optional
                    </label>
                    <Input
                      type="number"
                      placeholder="z.B. 3.5"
                      step="0.1"
                      value={submissionData.weight_kg}
                      onChange={(e) => setSubmissionData({ ...submissionData, weight_kg: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Foto-URL - optional
                    </label>
                    <Input
                      placeholder="https://..."
                      value={submissionData.photo_url}
                      onChange={(e) => setSubmissionData({ ...submissionData, photo_url: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  <Button
                    onClick={handleSubmitCatch}
                    disabled={submitting}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Wird eingereicht...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Fang einreichen
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Leaderboard */}
            <Card className="glass-morphism border-gray-600/30 bg-gradient-to-br from-gray-800/20 to-gray-900/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Event-Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          entry.user_id === currentUser?.email
                            ? 'bg-amber-900/20 border-amber-600/50'
                            : 'bg-gray-700/20 border-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-lg font-bold text-gray-400 w-6 text-center">
                            #{index + 1}
                          </span>
                          <div>
                            <p className="text-white font-medium">
                              {entry.user_id === currentUser?.email ? 'Du' : entry.user_id.split('@')[0]}
                            </p>
                            <p className="text-xs text-gray-400">
                              {entry.submission_count} Einreichung{entry.submission_count !== 1 ? 'en' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-400">
                            {Math.round(entry.total_points * 100) / 100}
                          </p>
                          <p className="text-xs text-gray-400">Punkte</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-gray-400">Noch keine Einreichungen</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <Card className="glass-morphism border-blue-600/30 bg-gradient-to-br from-blue-900/10 to-cyan-900/10">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Teilnehmer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {participants.map((p) => (
                    <div
                      key={p.user_id}
                      className="p-2 rounded bg-blue-900/20 border border-blue-600/30"
                    >
                      <p className="text-sm text-white font-medium">
                        {p.user_id === currentUser?.email ? 'Du (Organisator)' : p.user_id.split('@')[0]}
                      </p>
                      <p className="text-xs text-blue-400">
                        {Math.round(p.total_points * 100) / 100} Punkte
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-400 mt-4 text-center font-semibold">
                  {participants.length} Teilnehmer
                </p>
              </CardContent>
            </Card>

            {/* Points Info */}
            <Card className="glass-morphism border-cyan-600/30 bg-gradient-to-br from-cyan-900/10 to-blue-900/10">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Punkte-Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-300">
                <div>
                  <p className="font-semibold text-white mb-1">Basispunkte</p>
                  <p className="text-xs">+100 für jede Einreichung</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Längenboni</p>
                  <p className="text-xs">+5 Punkte pro cm</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Like-Punkte</p>
                  <p className="text-xs">+1 Punkt pro Community-Like</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
