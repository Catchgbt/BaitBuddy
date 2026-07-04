import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { entities } from "@/api/frontendClient";
import LazyImage from "@/components/images/LazyImage";

const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    color: 'text-pink-500',
    bgColor: 'bg-pink-950/20',
    borderColor: 'border-pink-500/30',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: 'text-blue-500',
    bgColor: 'bg-blue-950/20',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    color: 'text-gray-400',
    bgColor: 'bg-gray-950/20',
    borderColor: 'border-gray-500/30',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: 'text-blue-600',
    bgColor: 'bg-blue-950/20',
    borderColor: 'border-blue-600/30',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: 'text-black dark:text-white',
    bgColor: 'bg-gray-950/20',
    borderColor: 'border-gray-500/30',
  },
];

export default function SocialMediaShareDialog({ open, onOpenChange, catchData }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [message, setMessage] = useState('');
  const [includePhoto, setIncludePhoto] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const generateDefaultMessage = () => {
    if (!catchData) return '';
    return `Mein Fang: ${catchData.species}${catchData.length_cm ? ` (${catchData.length_cm}cm)` : ''}${catchData.weight_kg ? `, ${catchData.weight_kg}kg` : ''}${catchData.bait_used ? `\nKöder: ${catchData.bait_used}` : ''}`;
  };

  const handleShare = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Bitte mindestens eine Plattform auswählen');
      return;
    }

    if (!catchData?.id) {
      toast.error('Fehler: Fang-ID nicht gefunden');
      return;
    }

    setIsSharing(true);
    try {
      const finalMessage = message || generateDefaultMessage();
      let successCount = 0;

      for (const platform of selectedPlatforms) {
        try {
          const result = await entities.SocialMediaShare.create({
            catch_id: catchData.id,
            platform,
            message: finalMessage,
            include_photo: includePhoto,
          });

          if (result?.id) {
            successCount++;
            generateShareLink(platform, result.share_link);
          }
        } catch (error) {
          console.error(`Fehler bei ${platform}:`, error);
        }
      }

      if (successCount === selectedPlatforms.length) {
        toast.success(`Auf ${successCount} Plattform${successCount !== 1 ? 'en' : ''} geteilt!`);
      } else if (successCount > 0) {
        toast.warning(`Auf ${successCount} von ${selectedPlatforms.length} Plattformen geteilt`);
      } else {
        toast.error('Fehler beim Teilen auf Social Media');
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Fehler beim Teilen');
      console.error(error);
    } finally {
      setIsSharing(false);
    }
  };

  const generateShareLink = (platform, shareLink) => {
    if (shareLink && shareLink !== 'https://www.tiktok.com/') {
      window.open(shareLink, '_blank');
    }
  };

  const resetForm = () => {
    setSelectedPlatforms([]);
    setMessage('');
    setIncludePhoto(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">Auf Social Media teilen</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {catchData?.photo_url && (
            <div className="relative w-full h-40 rounded-lg overflow-hidden">
              <LazyImage src={catchData.photo_url} alt={catchData.species} className="w-full h-full object-cover" />
            </div>
          )}

          {catchData && (
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-1">
              <p className="text-white font-semibold text-sm">{catchData.species}</p>
              {catchData.length_cm && <p className="text-gray-400 text-xs">Länge: {catchData.length_cm}cm</p>}
              {catchData.weight_kg && <p className="text-gray-400 text-xs">Gewicht: {catchData.weight_kg}kg</p>}
              {catchData.bait_used && <p className="text-gray-400 text-xs">Köder: {catchData.bait_used}</p>}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Plattformen</label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map(platform => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedPlatforms.includes(platform.id)
                      ? `${platform.bgColor} ${platform.borderColor} border-opacity-100`
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className={`text-sm font-medium ${selectedPlatforms.includes(platform.id) ? platform.color : 'text-gray-400'}`}>
                    {platform.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Nachricht (optional)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={generateDefaultMessage()}
              className="bg-gray-800 border-gray-700 text-white text-sm min-h-[80px]"
            />
            <p className="text-xs text-gray-400">Wenn leer: Standard-Nachricht wird verwendet</p>
          </div>

          {catchData?.photo_url && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include-photo"
                checked={includePhoto}
                onChange={(e) => setIncludePhoto(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 cursor-pointer"
              />
              <label htmlFor="include-photo" className="text-sm text-gray-300 cursor-pointer">
                Foto mitteilen
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSharing}
            className="border-gray-700 text-gray-300 hover:bg-gray-700 min-h-[44px]"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleShare}
            disabled={isSharing || selectedPlatforms.length === 0}
            className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white min-h-[44px]"
          >
            {isSharing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird geteilt...</>
            ) : (
              `Auf ${selectedPlatforms.length} Plattform${selectedPlatforms.length !== 1 ? 'en' : ''} teilen`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
