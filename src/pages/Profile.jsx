import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { UploadFile } from '@/integrations/Core';
import { User as UserIcon, Camera, Copy, Check, Edit3, Calendar, Clock, MessageSquare, Crown, Link as LinkIcon, Mail, Volume2, AlertTriangle } from 'lucide-react';
import { toast } from "sonner";
import { MobileSelect } from "@/components/ui/mobile-select";
import { Separator } from "@/components/ui/separator";
import RatingWidget from "@/components/feedback/RatingWidget";
import { useOptimisticMutation } from "@/lib/useOptimisticMutation";
import DeleteAccountDialog from "@/components/settings/DeleteAccountDialog";
import { Trash2 } from "lucide-react";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

export default function ProfilePage() {
   useFeatureTracking('profil');
   const navigate = useNavigate();
   const [user, setUser] = useState(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isEditing, setIsEditing] = useState(false);
   const [nickname, setNickname] = useState('');
   const [isUploading, setIsUploading] = useState(false);
   const [isSaving, setIsSaving] = useState(false);
   const [copiedReferral, setCopiedReferral] = useState(false);
   const [postsCount, setPostsCount] = useState(0);
   const [currentPlan, setCurrentPlan] = useState(null);
   const [chatHistory, setChatHistory] = useState([]);
   const [loadingHistory, setLoadingHistory] = useState(false);
   const [expandedConversation, setExpandedConversation] = useState(null);
   const [navigationAnnouncement, setNavigationAnnouncement] = useState('');

  const loadUserProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setNickname(currentUser.nickname || '');
      
      // Generiere Referral-Code falls nicht vorhanden
      if (!currentUser.referral_code) {
        const code = generateReferralCode();
        await base44.auth.updateMe({ referral_code: code });
        const updatedUser = await base44.auth.me();
        setUser(updatedUser);
      }

      // Lade Posts-Anzahl
      try {
        const posts = await base44.entities.Post.filter({ created_by: currentUser.email });
        setPostsCount(posts.length);
      } catch (error) {
        console.error('Fehler beim Laden der Posts:', error);
      }

      // Lade Plan-Status
      try {
        const planResponse = await base44.functions.invoke('getPlanStatus');
        if (planResponse.data?.plan) {
          setCurrentPlan(planResponse.data.plan);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Plans:', error);
      }

      // Lade Chat-Historie (letzte 5 Konversationen)
      try {
        const messages = await base44.entities.ChatMessage.list('-created_date', 100);
        
        // Gruppiere nach conversation_id
        const groupedConversations = {};
        messages.forEach(msg => {
          if (!groupedConversations[msg.conversation_id]) {
            groupedConversations[msg.conversation_id] = [];
          }
          groupedConversations[msg.conversation_id].push(msg);
        });
        
        // Konvertiere zu Array und sortiere
        const conversations = Object.entries(groupedConversations).map(([id, msgs]) => ({
          id,
          messages: msgs.sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime()),
          lastMessage: msgs.sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime())[msgs.length - 1],
          messageCount: msgs.length
        })).sort((a, b) => new Date(b.lastMessage.created_date).getTime() - new Date(a.lastMessage.created_date).getTime());
        
        setChatHistory(conversations.slice(0, 5));
      } catch (error) {
        console.error('Fehler beim Laden der Chat-Historie:', error);
      }

    } catch (error) {
      toast.error('Profil konnte nicht geladen werden.');
      console.error('Error loading profile:', error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Datei zu groß. Maximal 5MB erlaubt.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Nur Bilder sind erlaubt.');
      return;
    }

    setIsUploading(true);
    try {
      const response = await UploadFile({ file });
      const imageUrl = response.file_url;
      
      await base44.auth.updateMe({ profile_picture_url: imageUrl });
      setUser(prev => ({ ...prev, profile_picture_url: imageUrl }));
      toast.success('Profilbild erfolgreich aktualisiert!');
    } catch (error) {
      toast.error('Fehler beim Hochladen des Bildes.');
      console.error('Upload error:', error);
    }
    setIsUploading(false);
  };

  const saveProfileMutation = useOptimisticMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
      return data;
    },
    optimisticUpdate: (oldUser, newData) => ({
      ...oldUser,
      ...newData
    }),
    onSuccess: () => {
      setIsEditing(false);
      toast.success('Profil erfolgreich aktualisiert!');
    },
    onError: () => {
      toast.error('Fehler beim Speichern des Profils.');
    },
    invalidateOnSettle: false
  });

  const handleSaveProfile = async () => {
    if (!nickname.trim()) {
      toast.error('Nickname darf nicht leer sein.');
      return;
    }
    saveProfileMutation.mutate({ nickname: nickname.trim() });
  };

  const voiceGenderMutation = useOptimisticMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
      return data;
    },
    optimisticUpdate: (oldUser, newData) => ({
      ...oldUser,
      ...newData
    }),
    onSuccess: () => {
      toast.success('Stimme aktualisiert!');
    },
    onError: () => {
      toast.error('Fehler beim Ändern der Stimme');
    },
    invalidateOnSettle: false
  });

  const handleVoiceGenderChange = (gender) => {
    voiceGenderMutation.mutate({
      settings: { ...user?.settings, voice_gender: gender }
    });
  };

  const copyReferralLink = async () => {
    if (!user?.referral_code) return;
    
    const referralLink = `${window.location.origin}?ref=${user.referral_code}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedReferral(true);
      toast.success('Einladungslink kopiert!');
      setTimeout(() => setCopiedReferral(false), 2000);
    } catch (error) {
      toast.error('Kopieren fehlgeschlagen.');
    }
  };

  const handleCancelSubscription = () => {
    toast.info('Abo-Kündigung', {
      description: 'Bitte kontaktiere den Support, um dein Abo zu kündigen.',
      duration: 5000
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unbekannt';
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Nie';
    return new Date(dateString).toLocaleString('de-DE', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="text-center py-12">
          <div className="animate-pulse text-gray-400">Profil wird geladen...</div>
        </div>
      </div>
    );
  }

  const planBadgeColor = {
    free: 'bg-gray-600',
    basic: 'bg-blue-600',
    pro: 'bg-purple-600',
    ultimate: 'bg-amber-600'
  }[currentPlan?.id || 'free'] || 'bg-gray-600';

  return (
    <div className="min-h-screen w-full px-4 sm:px-6 lg:px-8 py-6 pb-20 space-y-6 max-w-5xl mx-auto">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {navigationAnnouncement}
      </div>
      
      {/* Profil-Header mit Bild und Basis-Info */}
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            
            {/* Profilbild */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 rounded-full bg-gray-800 border-4 border-gray-700 overflow-hidden flex items-center justify-center">
                {user?.profile_picture_url ? (
                  <img 
                    src={user.profile_picture_url} 
                    alt="Profilbild"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-16 h-16 text-gray-500" />
                )}
              </div>
              
              <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-cyan-600 hover:bg-cyan-700 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-lg">
                <Camera className="w-5 h-5 text-white" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </label>
              
              {isUploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent"></div>
                </div>
              )}
            </div>
            
            {/* Profil-Info und Edit */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-3">
                  <Label className="text-gray-300">Nickname</Label>
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Dein Nickname"
                    className="bg-gray-800/50 border-gray-700 text-white"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      {isSaving ? 'Speichern...' : 'Speichern'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setNickname(user?.nickname || '');
                      }}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <h2 className="text-3xl font-bold text-white">
                      {user?.nickname || 'Unbenannt'}
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setIsEditing(true)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-400 justify-center md:justify-start">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{user?.email}</span>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap justify-center md:justify-start">
                    <Badge className={`${planBadgeColor} text-white px-3 py-1`}>
                      <Crown className="w-3 h-3 mr-1" />
                      {currentPlan?.name || 'Free'} Plan
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Mitgliedschaft Details */}
        <Card className="glass-morphism border-gray-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
              Mitgliedschaft
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Mitglied seit</span>
              </div>
              <span className="text-white font-medium">
                {formatDate(user?.created_date)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Letzte Aktivität</span>
              </div>
              <span className="text-white font-medium">
                {formatDateTime(user?.last_active)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">Beiträge</span>
              </div>
              <span className="text-white font-medium">{postsCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Premium Plan Details */}
        <Card className="glass-morphism border-gray-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Premium Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentPlan ? (
              <>
                <div className="p-4 bg-gradient-to-r from-cyan-900/30 to-emerald-900/30 rounded-lg border border-cyan-700/50">
                  <div className="text-2xl font-bold text-white mb-1">
                    {currentPlan.name}
                  </div>
                  <div className="text-sm text-gray-400">
                    {currentPlan.price_eur > 0 ? `${currentPlan.price_eur}€ / Monat` : 'Kostenlos'}
                  </div>
                </div>

                {currentPlan.id !== 'free' && currentPlan.expires_at && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Läuft ab am</span>
                        <span className="text-white font-medium">
                          {formatDate(currentPlan.expires_at)}
                        </span>
                      </div>
                      
                      {currentPlan.remaining_days !== null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Verbleibende Tage</span>
                          <span className={`font-medium ${
                            currentPlan.remaining_days < 7 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {currentPlan.remaining_days} Tage
                          </span>
                        </div>
                      )}
                    </div>

                    <Separator className="bg-gray-700" />

                    <Button
                      variant="outline"
                      className="w-full border-red-600/50 text-red-400 hover:bg-red-600/10"
                      onClick={handleCancelSubscription}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Abo kündigen
                    </Button>
                  </>
                )}

                {currentPlan.id === 'free' && (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm mb-3">
                      Upgrade jetzt und erhalte Zugriff auf Premium-Features!
                    </p>
                    <Button
                      className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-700 hover:to-emerald-700"
                      onClick={() => {
                        setNavigationAnnouncement('Navigiere zu Premium-Plaenen');
                        navigate('/PremiumPlans');
                      }}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Jetzt upgraden
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Plan-Daten werden geladen...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stimmeneinstellung */}
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Spracheinstellungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Label className="text-white text-base">KI-Buddy Stimme</Label>
              <p className="text-sm text-gray-400 mt-1">
                Wähle zwischen männlicher oder weiblicher Stimme
              </p>
            </div>
            
            <MobileSelect
              value={user?.settings?.voice_gender || 'female'}
              onValueChange={handleVoiceGenderChange}
              label="Stimme waehlen"
              options={[
                { value: 'female', label: 'Weiblich' },
                { value: 'male', label: 'Maennlich' },
              ]}
              className="w-full sm:w-48 bg-gray-800/50 border-gray-700"
            />
          </div>
        </CardContent>
      </Card>

      {/* Chat-Historie Card */}
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Meine Chat-Verläufe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {chatHistory.length > 0 ? (
            <>
              {chatHistory.map((conv) => (
                <div key={conv.id} className="space-y-2">
                  <div
                    className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setExpandedConversation(expandedConversation === conv.id ? null : conv.id);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm text-gray-400 mb-1">
                          {formatDateTime(conv.lastMessage.created_date)}
                        </div>
                        <div className="text-white text-sm line-clamp-2">
                          {conv.lastMessage.content ? conv.lastMessage.content.substring(0, 100) + (conv.lastMessage.content.length > 100 ? '...' : '') : ''}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {conv.messageCount} Nachrichten
                      </Badge>
                    </div>
                    
                    {conv.lastMessage.context && conv.lastMessage.context !== 'general' && (
                      <div className="text-xs text-gray-500 mt-2">
                        Kontext: {conv.lastMessage.context}
                      </div>
                    )}
                  </div>

                  {/* Expanded Messages View */}
                  {expandedConversation === conv.id && (
                    <div className="ml-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700/30 space-y-3 max-h-96 overflow-y-auto">
                      {conv.messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                              msg.role === 'user'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-700 text-gray-200'
                            }`}
                          >
                            <div className="text-xs opacity-70 mb-1">
                              {new Date(msg.created_date).toLocaleTimeString('de-DE', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              <div className="text-center text-xs text-gray-500 pt-2">
                Deine letzten 5 Konversationen mit dem KI-Buddy
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Noch keine Chat-Verläufe vorhanden</p>
              <p className="text-sm mt-2">Starte eine Unterhaltung mit dem KI-Buddy!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Freunde einladen */}
      <Card className="glass-morphism border-emerald-600/50 bg-gradient-to-br from-emerald-900/10 to-cyan-900/10 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)] flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Freunde einladen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-white font-semibold">Premium Bonus!</span>
            </div>
            <p className="text-sm text-gray-300">
              Lade Freunde ein und erhalte <span className="text-emerald-400 font-bold">1 Woche Premium</span> für jeden Freund, der sich registriert!
            </p>
          </div>

          <div>
            <Label className="text-gray-300 mb-2 block">Dein Einladungslink</Label>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}?ref=${user?.referral_code || ''}`}
                readOnly
                className="bg-gray-800/50 border-gray-700 text-white font-mono text-sm flex-1"
              />
              <Button
                variant="outline"
                onClick={copyReferralLink}
                className={`flex-shrink-0 ${copiedReferral ? 'text-green-400 border-green-400' : 'border-gray-700'}`}
              >
                {copiedReferral ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>💡 Teile diesen Link mit deinen Freunden über WhatsApp, E-Mail oder Social Media</p>
            <p>💡 Dein Premium wird automatisch verlängert, sobald sie sich registrieren</p>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Widget */}
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
            Feedback geben
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RatingWidget 
            functionName="Profile"
            onComplete={() => {}}
          />
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="glass-morphism border-red-600/50 bg-gradient-to-br from-red-900/10 to-gray-900/10 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)] flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Gefahrenzone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-900/20 rounded-lg border border-red-700/50">
            <p className="text-sm text-gray-300">
              Das Löschen deines Accounts ist permanent und kann nicht rückgängig gemacht werden. Alle deine Daten werden gelöscht.
            </p>
          </div>

          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}