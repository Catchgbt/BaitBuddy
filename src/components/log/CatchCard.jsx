import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Ruler, Weight, Fish, Edit, Trash2, Eye, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import CatchDetailModal from './CatchDetailModal';
import ShareCatchDialog from './ShareCatchDialog';
import { base44 } from '@/api/base44Client';

function CatchCard({ catchItem, onEdit, onDelete }) {
  const [showDetailModal, setShowDetailModal] = React.useState(false);
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [spots, setSpots] = React.useState([]);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const loadSpots = async () => {
    try {
      const spotsData = await base44.entities.Spot.list();
      setSpots(spotsData);
    } catch (error) {
      console.error("Fehler beim Laden der Spots:", error);
    }
  };

  const handleShowDetails = () => {
    loadSpots();
    setShowDetailModal(true);
  };

  return (
    <>
      <Card className="glass-morphism border-gray-800 hover:border-cyan-500/50 transition-all overflow-hidden group">
        {catchItem.photo_url && !imageError && (
          <div className="relative h-48 overflow-hidden bg-gray-800">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-800 animate-pulse" />
            )}
            <img
              src={catchItem.photo_url}
              alt={catchItem.species || 'Fang'}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transition: 'opacity 0.3s ease-in-out' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
            {catchItem.species && (
              <div className="absolute bottom-3 left-3">
                <Badge className="bg-cyan-600/90 text-white backdrop-blur-sm">
                  {catchItem.species}
                </Badge>
              </div>
            )}
          </div>
        )}
        
        <CardContent className="p-4 space-y-3">
          {!catchItem.photo_url && catchItem.species && (
            <h3 className="text-lg font-semibold text-cyan-400">
              {catchItem.species}
            </h3>
          )}

          <div className="space-y-2 text-sm">
            {catchItem.catch_time && (
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="truncate">{format(new Date(catchItem.catch_time), 'PPP', { locale: de })}</span>
              </div>
            )}

            {catchItem.length_cm && (
              <div className="flex items-center gap-2 text-gray-300">
                <Ruler className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>{catchItem.length_cm} cm</span>
              </div>
            )}

            {catchItem.weight_kg && (
              <div className="flex items-center gap-2 text-gray-300">
                <Weight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{catchItem.weight_kg} kg</span>
              </div>
            )}

            {catchItem.bait_used && (
              <div className="flex items-center gap-2 text-gray-300">
                <Fish className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="truncate">{catchItem.bait_used}</span>
              </div>
            )}

            {catchItem.spot_id && (
              <div className="flex items-center gap-2 text-gray-300">
                <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="truncate">Spot: {catchItem.spot_id}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleShowDetails}
              className="flex-1 border-gray-700 hover:border-cyan-500/50"
            >
              <Eye aria-hidden="true" className="w-4 h-4 mr-1" />
              Details
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label={`${catchItem.species || 'Fang'} teilen`}
              onClick={() => setShowShareDialog(true)}
              className="border-gray-700 hover:border-emerald-500/50"
            >
              <Share2 aria-hidden="true" className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label={`${catchItem.species || 'Fang'} bearbeiten`}
              onClick={() => onEdit(catchItem)}
              className="border-gray-700 hover:border-blue-500/50"
            >
              <Edit aria-hidden="true" className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label={`${catchItem.species || 'Fang'} loeschen`}
              onClick={() => onDelete(catchItem.id)}
              className="border-gray-700 hover:border-red-500/50"
            >
              <Trash2 aria-hidden="true" className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {showDetailModal && (
        <CatchDetailModal
          catchItem={catchItem}
          spots={spots}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      <ShareCatchDialog
        catchItem={catchItem}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />
    </>
  );
}

export default memo(CatchCard);