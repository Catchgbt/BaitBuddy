import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SwipeToRefresh from "@/components/utils/SwipeToRefresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Heart, MessageCircle, Send, Camera, AlertTriangle, User, Loader2, X, Globe, Facebook, Trophy, Users, Activity, Compass, Fish, TrendingUp, FileImage } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CompetitionCard from "@/components/community/CompetitionCard";
import CompetitionLauncher from "@/components/community/CompetitionLauncher";
import VotingEventCard from "@/components/community/VotingEventCard";
import ClanLeaderboardCard from "@/components/community/ClanLeaderboardCard";
import LeaderboardCard from "@/components/community/LeaderboardCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ChatWidget from "@/components/community/ChatWidget";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

export default function Community() {
  useFeatureTracking("community");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [commenting, setCommenting] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [userCache, setUserCache] = useState({});
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [reportedPostIds, setReportedPostIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('reported_posts') || '[]'); } catch { return []; }
  });
  const [competitions, setCompetitions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStart, setPullStart] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [showCatchSelector, setShowCatchSelector] = useState(false);
  const [userCatches, setUserCatches] = useState([]);
  const [loadingCatches, setLoadingCatches] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [activeTab, setActiveTab] = useState("competitions");
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadCurrentUser();
    loadPosts();
    loadCompetitions();
    loadRecentActivity();
    loadActiveUserCount();
    const interval = setInterval(loadActiveUserCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        setPullStart(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e) => {
      if (pullStart > 0) {
        const distance = e.touches[0].clientY - pullStart;
        if (distance > 0 && distance < 150) {
          setPullDistance(distance);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > 80) {
        setIsRefreshing(true);
        await loadPosts();
        await loadCompetitions();
        await loadRecentActivity();
        setIsRefreshing(false);
      }
      setPullStart(0);
      setPullDistance(0);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullStart, pullDistance]);

  const loadCurrentUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Fehler beim Laden des Users:", error);
    }
  };

  const loadCompetitions = async () => {
    try {
      const comps = await base44.entities.Competition.list('-created_date', 20);
      setCompetitions(comps.filter(c => c.is_active));
    } catch (error) {
      console.error("Fehler beim Laden der Wettbewerbe:", error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activeComps = await base44.entities.Competition.filter({ is_active: true });
      setRecentActivity(activeComps);
    } catch (error) {
      console.error("Fehler beim Laden der Aktivitaten:", error);
    }
  };

  const loadActiveUserCount = async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const sessions = await base44.entities.ChatSession.filter({ is_active: true });
      const active = sessions.filter(s => new Date(s.last_activity) > new Date(fiveMinutesAgo));
      setActiveUserCount(active.length);
    } catch (error) {
      console.error("Fehler beim Laden aktiver User:", error);
    }
  };

  const votingCompetitions = competitions.filter(c => c.competition_type === 'photo_contest');
  const teamCompetitions = competitions.filter(c => c.competition_type === 'most_catches');
  const otherCompetitions = competitions.filter(c => c.competition_type !== 'photo_contest' && c.competition_type !== 'most_catches');

  const getUserDisplayName = (email) => {
    const user = userCache[email];
    return user?.full_name || user?.nickname || email?.split('@')[0] || 'Anonym';
  };

  const getUserProfilePicture = (email) => {
    const user = userCache[email];
    return user?.profile_picture_url || null;
  };

  const filteredPosts = posts.filter(post => {
    const query = searchQuery.toLowerCase();
    const matchesText = post.text.toLowerCase().includes(query);
    const matchesCreator = getUserDisplayName(post.created_by).toLowerCase().includes(query);
    return matchesText || matchesCreator;
  });

  const loadPosts = async () => {
    setLoading(true);
    try {
      const postsData = await base44.entities.Post.list("-created_date", 50);
      
      const newCache = {};
      const allEmails = new Set();
      
      postsData.forEach(post => allEmails.add(post.created_by));
      
      for (const email of allEmails) {
        try {
          const allUsers = await base44.entities.User.list('', 1000);
          const foundUser = allUsers.find(u => u.email === email);
          
          if (foundUser) {
            newCache[email] = foundUser;
          } else {
            newCache[email] = {
              email: email,
              nickname: null,
              full_name: null,
              profile_picture_url: null
            };
          }
        } catch (err) {
          console.error("Fehler beim Laden des Users:", err);
          newCache[email] = {
            email: email,
            nickname: null,
            full_name: null,
            profile_picture_url: null
          };
        }
      }
      
      setUserCache(newCache);

      const postsWithComments = await Promise.all(
        postsData.map(async (post) => {
          try {
            const comments = await base44.entities.Comment.filter({ post_id: post.id });
            
            for (const comment of comments) {
              if (!newCache[comment.created_by]) {
                try {
                  const allUsers = await base44.entities.User.list('', 1000);
                  const foundUser = allUsers.find(u => u.email === comment.created_by);
                  
                  if (foundUser) {
                    newCache[comment.created_by] = foundUser;
                  } else {
                    newCache[comment.created_by] = {
                      email: comment.created_by,
                      nickname: null,
                      full_name: null,
                      profile_picture_url: null
                    };
                  }
                } catch (err) {
                  console.error("Fehler beim Laden des Comment-Users:", err);
                }
              }
            }
            
            return { ...post, comments };
          } catch (error) {
            console.error("Fehler beim Laden der Kommentare:", error);
            return { ...post, comments: [] };
          }
        })
      );

      setPosts(postsWithComments);
      setUserCache(newCache);
    } catch (error) {
      console.error("Fehler beim Laden der Posts:", error);
      toast.error("Posts konnten nicht geladen werden");
    }
    setLoading(false);
  };

  const loadUserCatches = async () => {
    if (!currentUser) return;
    
    setLoadingCatches(true);
    try {
      const catches = await base44.entities.Catch.filter(
        { created_by: currentUser.email },
        '-catch_time',
        20
      );
      setUserCatches(catches.filter(c => c.photo_url));
    } catch (error) {
      console.error("Fehler beim Laden der Fänge:", error);
      toast.error("Fänge konnten nicht geladen werden");
    } finally {
      setLoadingCatches(false);
    }
  };

  const handleSelectCatch = async (catchData) => {
    setShowCatchSelector(false);
    
    const catchText = `Mein Fang: ${catchData.species}${catchData.length_cm ? ` (${catchData.length_cm}cm)` : ''}${catchData.weight_kg ? `, ${catchData.weight_kg}kg` : ''}${catchData.bait_used ? `\nKöder: ${catchData.bait_used}` : ''}${catchData.notes ? `\n\n${catchData.notes}` : ''}`;
    
    setNewPostText(catchText);
    setImagePreview(catchData.photo_url);
    
    try {
      const response = await fetch(catchData.photo_url);
      const blob = await response.blob();
      const file = new File([blob], "catch.jpg", { type: blob.type });
      setNewPostImage(file);
    } catch (error) {
      console.error("Fehler beim Laden des Bildes:", error);
      toast.error("Bild konnte nicht geladen werden");
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild ist zu groß (max 5MB)");
      return;
    }

    setNewPostImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim() && !newPostImage) {
      toast.error("Bitte Text oder Bild hinzufügen");
      return;
    }

    setUploading(true);
    let photoUrl = null;
    
    try {
      // FIXIERT: Nutze base44.integrations.Core.UploadFile statt dynamischen Import
      if (newPostImage) {
        toast.info("Lade Bild hoch...");
        
        const response = await base44.integrations.Core.UploadFile({ file: newPostImage });
        photoUrl = response.file_url;
        
        toast.success("Bild hochgeladen!");
      }

      toast.info("Erstelle Post...");
      await base44.entities.Post.create({
        text: newPostText.trim(),
        photo_url: photoUrl,
        likes: 0,
        reported: false
      });

      setNewPostText("");
      setNewPostImage(null);
      setImagePreview(null);
      toast.success("Post erstellt! 🎣");
      await loadPosts();
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Fehler beim Erstellen des Posts:", error);
      toast.error("Fehler: " + (error.message || "Post konnte nicht erstellt werden"));
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (postId, currentLikes) => {
    // Optimistic update
    setPosts(posts.map(p => 
      p.id === postId ? { ...p, likes: currentLikes + 1 } : p
    ));

    try {
      await base44.entities.Post.update(postId, { likes: currentLikes + 1 });
    } catch (error) {
      console.error("Fehler beim Liken:", error);
      // Revert on error
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, likes: currentLikes } : p
      ));
      toast.error("Like fehlgeschlagen");
    }
  };

  const handleComment = async (postId) => {
    if (!commentText.trim()) {
      toast.error("Kommentar darf nicht leer sein");
      return;
    }

    if (!currentUser?.email) {
      toast.error("Bitte melde dich an, um zu kommentieren");
      return;
    }

    const text = commentText.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      post_id: postId,
      text,
      created_by: currentUser.email,
      created_date: new Date().toISOString()
    };

    // Optimistic update mit functional setState (kein stale closure)
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: [...(p.comments || []), optimisticComment] }
        : p
    ));
    setCommentText("");

    try {
      const newComment = await base44.entities.Comment.create({
        post_id: postId,
        text
      });

      // Temp-Kommentar durch echten ersetzen
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, comments: (p.comments || []).map(c => c.id === tempId ? newComment : c) }
          : p
      ));
    } catch (error) {
      console.error("Fehler beim Kommentieren:", error);
      // Bei Fehler: optimistic comment entfernen
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, comments: (p.comments || []).filter(c => c.id !== tempId) }
          : p
      ));
      setCommentText(text);
      toast.error("Kommentar fehlgeschlagen: " + (error.message || "Unbekannter Fehler"));
    }
  };

  const handleReport = async (postId) => {
    if (reportedPostIds.includes(postId)) {
      toast.info("Du hast diesen Post bereits gemeldet");
      return;
    }
    try {
      await base44.entities.Post.update(postId, { reported: true });
      const updated = [...reportedPostIds, postId];
      setReportedPostIds(updated);
      localStorage.setItem('reported_posts', JSON.stringify(updated));
      toast.success("Post gemeldet");
    } catch (error) {
      console.error("Fehler beim Melden:", error);
      toast.error("Melden fehlgeschlagen");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Post wirklich löschen?")) return;

    setDeletingPostId(postId);
    try {
      await base44.entities.Post.delete(postId);
      toast.success("Post gelöscht");
      await loadPosts();
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      toast.error("Löschen fehlgeschlagen");
    } finally {
      setDeletingPostId(null);
    }
  };

  const queryClient = useQueryClient();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-cyan-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Lade Community...</span>
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['posts'] }),
      queryClient.invalidateQueries({ queryKey: ['competitions'] }),
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] })
    ]);
  };

  return (
    <SwipeToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-950 pb-safe-fixed">
        {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 transition-opacity"
          style={{ 
            height: `${pullDistance}px`,
            opacity: Math.min(pullDistance / 80, 1)
          }}
        >
          <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {isRefreshing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-cyan-600 text-white px-4 py-2 rounded-full shadow-lg">
          Aktualisiere...
        </div>
      )}
      
      <div className="max-w-4xl mx-auto p-6 space-y-8 pb-32">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
              Community
            </h1>
            <p className="text-gray-400 mt-1">Tausche dich mit anderen Anglern aus</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-gray-300">{activeUserCount} User online</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-gray-900/60 border border-gray-800 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setActiveTab("competitions")}
            className={`flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "competitions"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4" />
            Wettbewerbe
          </button>
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "feed"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Feed
          </button>
          <button
            onClick={() => setActiveTab("leaderboards")}
            className={`flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "leaderboards"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Bestenlisten
          </button>
        </div>

        {activeTab === "feed" && (<>
        {/* Suchleiste */}
        <Card className="glass-morphism border-gray-800">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche nach Beitraegen, Erstellern..."
                className="bg-gray-800/50 border-gray-700 text-white flex-1"
              />
              <Button
                onClick={() => setShowChat(!showChat)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Chat
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chat Widget */}
        {showChat && (
          <ChatWidget />
        )}

        {/* Neuer Post */}
         {currentUser && (
          <Card className="glass-morphism border-gray-800">
            <CardHeader>
              <h3 className="text-lg font-semibold text-cyan-400">Neuer Post</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Was möchtest du teilen?"
                className="bg-gray-800/50 border-gray-700 text-white min-h-[100px]"
                disabled={uploading}
              />

              {imagePreview && (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full rounded-lg max-h-64 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setNewPostImage(null);
                      setImagePreview(null);
                    }}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    disabled={uploading}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex-1 border-gray-700 text-gray-300"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {newPostImage ? "Bild ändern" : "Bild hinzufügen"}
                  </Button>

                  <Button
                    onClick={handleCreatePost}
                    disabled={uploading || (!newPostText.trim() && !newPostImage)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Wird hochgeladen...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Posten
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts Feed */}
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const profilePic = getUserProfilePicture(post.created_by);
            const displayName = getUserDisplayName(post.created_by);
            const isOwnPost = currentUser && post.created_by === currentUser.email;

            return (
              <div key={post.id}>
                <Card className="glass-morphism border-gray-800">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {profilePic ? (
                          <img 
                            src={profilePic} 
                            alt={displayName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center border-2 border-emerald-400">
                            <User className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white">{displayName}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(post.created_date).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      {isOwnPost && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                          disabled={deletingPostId === post.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          {deletingPostId === post.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-gray-200 whitespace-pre-wrap">{post.text}</p>

                    {post.photo_url && (
                      <img 
                        src={post.photo_url} 
                        alt="Post" 
                        className="w-full rounded-lg max-h-96 object-cover"
                      />
                    )}

                    <div className="flex items-center gap-4 pt-2 border-t border-gray-800">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id, post.likes || 0)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Heart className="w-4 h-4 mr-1" />
                        {post.likes || 0}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCommenting(commenting === post.id ? null : post.id)}
                        className="text-gray-400 hover:text-cyan-400"
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {post.comments?.length || 0}
                      </Button>

                      {!isOwnPost && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReport(post.id)}
                          className={`ml-auto ${reportedPostIds.includes(post.id) ? 'text-amber-400 cursor-default' : 'text-gray-400 hover:text-amber-400'}`}
                          title={reportedPostIds.includes(post.id) ? 'Bereits gemeldet' : 'Post melden'}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Kommentare */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-gray-800">
                        {post.comments.map((comment) => {
                          const commentProfilePic = getUserProfilePicture(comment.created_by);
                          const commentDisplayName = getUserDisplayName(comment.created_by);

                          return (
                            <div key={comment.id} className="flex gap-2">
                              {commentProfilePic ? (
                                <img 
                                  src={commentProfilePic} 
                                  alt={commentDisplayName}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-white" />
                                </div>
                              )}
                              <div className="flex-1 bg-gray-800/50 rounded-lg p-2">
                                <p className="text-xs font-semibold text-emerald-400 mb-1">
                                  {commentDisplayName}
                                </p>
                                <p className="text-sm text-gray-300">{comment.text}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Kommentar-Eingabe */}
                    {commenting === post.id && (
                      <div className="flex gap-2 pt-2">
                        <Input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Dein Kommentar..."
                          className="bg-gray-800/50 border-gray-700 text-white"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleComment(post.id);
                            }
                          }}
                        />
                        <Button
                          onClick={() => handleComment(post.id)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
            </div>
            );
          })}
        </div>

        {filteredPosts.length === 0 && posts.length > 0 && (
          <Card className="glass-morphism border-gray-800">
            <CardContent className="text-center py-12">
              <p className="text-gray-400 mb-4">Keine Beitraege gefunden</p>
              <p className="text-sm text-gray-500">Versuche einen anderen Suchbegriff</p>
            </CardContent>
          </Card>
        )}

        {posts.length === 0 && (
          <Card className="glass-morphism border-gray-800">
            <CardContent className="text-center py-12">
              <p className="text-gray-400 mb-4">Noch keine Posts vorhanden</p>
              <p className="text-sm text-gray-500">Sei der Erste und teile deinen Fang</p>
            </CardContent>
          </Card>
        )}
        </>)}

        {activeTab === "competitions" && (<>
        {/* Wettbewerbe starten */}
        <CompetitionLauncher 
          currentUser={currentUser}
          onStarted={async () => {
            await loadCompetitions();
            await loadRecentActivity();
          }}
        />

        {/* Aktuelle Aktivitaten */}
         {recentActivity.length > 0 && (
          <Card className="glass-morphism border-gray-800 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Aktuelle Aktivitaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">
                      {comp.title}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {comp.competition_type === 'photo_contest' && 'Community Voting'}
                      {comp.competition_type === 'most_catches' && 'Team Wettbewerb'}
                      {comp.competition_type === 'biggest_catch' && 'Groesster Fang'}
                      {comp.competition_type === 'specific_species' && `Spezies: ${comp.target_species || 'Alle'}`}
                      {' • '}
                      bis {new Date(comp.end_date).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Community-Voting Events */}
        {votingCompetitions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-purple-400">Community-Voting Events</h2>
            </div>
            <div className="space-y-4">
              {votingCompetitions.map((comp) => (
                <VotingEventCard 
                  key={comp.id} 
                  competition={comp} 
                  currentUser={currentUser}
                />
              ))}
            </div>
          </div>
        )}

        {/* Team-Wettbewerbe */}
        {teamCompetitions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-emerald-400">Team-Wettbewerbe</h2>
            </div>
            <div className="space-y-4">
              {teamCompetitions.map((comp) => (
                <ClanLeaderboardCard 
                  key={comp.id} 
                  competition={comp} 
                  currentUser={currentUser}
                />
              ))}
            </div>
          </div>
        )}

        {/* Andere Wettbewerbe */}
        {otherCompetitions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-amber-400">Aktuelle Wettbewerbe</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherCompetitions.map((comp) => (
                <CompetitionCard 
                  key={comp.id} 
                  competition={comp} 
                  currentUser={currentUser}
                  onUpdate={loadCompetitions}
                />
              ))}
            </div>
          </div>
        )}

        {competitions.length === 0 && (
          <Card className="glass-morphism border-gray-800">
            <CardContent className="text-center py-12">
              <Trophy className="w-12 h-12 text-amber-400/40 mx-auto mb-4" />
              <p className="text-gray-300 mb-2 font-semibold">Noch keine aktiven Wettbewerbe</p>
              <p className="text-sm text-gray-500">Starte selbst einen Wettbewerb oben oder schaue spaeter wieder vorbei</p>
            </CardContent>
          </Card>
        )}
        </>)}

        {activeTab === "leaderboards" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-cyan-400">Bestenlisten</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LeaderboardCard 
              type="points" 
              title="Top Angler nach Punkten" 
              icon={Trophy}
            />
            <LeaderboardCard 
              type="catches" 
              title="Top Angler nach Faengen" 
              icon={Fish}
            />
            <LeaderboardCard 
              type="biggest" 
              title="Top Angler nach groesstem Fang" 
              icon={TrendingUp}
            />
          </div>
        </div>
        )}

        {/* Externe Links Sektion */}
        <Card className="glass-morphism border-cyan-600/30 bg-gradient-to-br from-cyan-900/10 to-blue-900/10 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Finde uns online!
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <a 
              href="https://www.facebook.com/profile.php?id=61571109995877" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2">
                <Facebook className="w-4 h-4" />
                Unsere Facebook-Seite
              </Button>
            </a>
            <a 
              href="https://catchgbt-q7scna.manus.space" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2">
                <Globe className="w-4 h-4" />
                Zur Webseite
              </Button>
            </a>
          </CardContent>
        </Card>


      </div>

      <Dialog open={showCatchSelector} onOpenChange={setShowCatchSelector}>
       <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="text-cyan-400">Wähle einen Fang zum Teilen</DialogTitle>
         </DialogHeader>

         {loadingCatches ? (
           <div className="flex items-center justify-center py-8">
             <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
           </div>
         ) : userCatches.length === 0 ? (
           <div className="text-center py-8 text-gray-400">
             <p>Keine Fänge mit Fotos gefunden</p>
             <p className="text-sm mt-2">Logge zuerst einen Fang mit Foto ein</p>
           </div>
         ) : (
           <div className="grid grid-cols-2 gap-4">
             {userCatches.map((catchData) => (
               <button
                 key={catchData.id}
                 onClick={() => handleSelectCatch(catchData)}
                 className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-700 hover:border-cyan-400 transition-all"
               >
                 <img 
                   src={catchData.photo_url} 
                   alt={catchData.species}
                   className="w-full h-48 object-cover"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
                   <p className="text-white font-semibold">{catchData.species}</p>
                   <p className="text-xs text-gray-300">
                     {catchData.length_cm && `${catchData.length_cm}cm`}
                     {catchData.weight_kg && ` • ${catchData.weight_kg}kg`}
                   </p>
                   <p className="text-xs text-gray-400 mt-1">
                     {new Date(catchData.catch_time).toLocaleDateString('de-DE')}
                   </p>
                 </div>
               </button>
             ))}
           </div>
         )}
       </DialogContent>
      </Dialog>
      </div>
      </SwipeToRefresh>
      );
      }