import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, X, Send } from "lucide-react";
import { User } from "@/entities/User";
import { toast } from "sonner";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useSound } from "@/components/utils/SoundManager";

const FEATURE_NAMES = {
  catch_logging: "Fangbuch",
  ai_chat: "KI-Buddy",
  spot_management: "Spot-Verwaltung",
  weather_info: "Wetter-Infos",
  photo_analysis: "Foto-Analyse"
};

const FEATURE_EMOJIS = {
  catch_logging: "🎣",
  ai_chat: "🤖",
  spot_management: "📍",
  weather_info: "🌤️",
  photo_analysis: "📸"
};

export default function FeedbackDialog({ feature, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { triggerHaptic } = useHaptic();
  const { playSound } = useSound();

  const handleStarClick = (star) => {
    triggerHaptic('light');
    playSound('pop');
    setRating(star);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Bitte wähle eine Bewertung aus");
      triggerHaptic('light');
      playSound('error');
      return;
    }

    setIsSaving(true);
    triggerHaptic('medium');
    
    try {
      const user = await User.me();
      
      const updatedRatings = {
        ...(user.feature_ratings || {}),
        [feature]: {
          rating,
          feedback,
          rated_at: new Date().toISOString()
        }
      };

      await User.updateMyUserData({
        feature_ratings: updatedRatings
      });

      playSound('success');
      toast.success("Danke für dein Feedback! 🙏", {
        description: `Du hast ${FEATURE_NAMES[feature]} mit ${rating} ${rating === 1 ? 'Stern' : 'Sternen'} bewertet.`
      });

      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error("Fehler beim Speichern des Feedbacks:", error);
      playSound('error');
      toast.error("Feedback konnte nicht gespeichert werden");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    triggerHaptic('light');
    playSound('click');
    onClose();
  };

  const featureName = FEATURE_NAMES[feature] || feature;
  const featureEmoji = FEATURE_EMOJIS[feature] || "✨";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="w-full max-w-md glass-morphism border-gray-700 relative overflow-hidden">
            {/* Schließen-Button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <CardHeader className="text-center pb-4">
              <div className="text-5xl mb-3 animate-bounce">
                {featureEmoji}
              </div>
              <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
                Wie gefällt dir {featureName}?
              </CardTitle>
              <p className="text-sm text-gray-400 mt-2">
                Dein Feedback hilft uns, CatchGbt zu verbessern
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Sterne-Rating */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => handleStarClick(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 transition-all ${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-600'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>

              {/* Rating-Text */}
              {rating > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm text-gray-300"
                >
                  {rating === 1 && "😟 Schade, was können wir besser machen?"}
                  {rating === 2 && "😐 Okay, aber es gibt Verbesserungspotenzial"}
                  {rating === 3 && "🙂 Ganz gut! Was fehlt dir noch?"}
                  {rating === 4 && "😊 Super! Fast perfekt!"}
                  {rating === 5 && "🤩 Fantastisch! Das freut uns riesig!"}
                </motion.div>
              )}

              {/* Optionales Feedback-Textfeld */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300">
                  Möchtest du uns mehr erzählen? (optional)
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Dein Feedback hilft uns sehr..."
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px] resize-none"
                  maxLength={500}
                />
                <div className="text-xs text-gray-400 text-right">
                  {feedback.length}/500
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-1 border-gray-700 hover:bg-gray-800"
                >
                  Überspringen
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={rating === 0 || isSaving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Speichern...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Absenden
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}