import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const biteActivityLabels = {
  'sehr_gering': 'Sehr gering',
  'gering': 'Gering',
  'mittel': 'Mittel',
  'hoch': 'Hoch',
  'sehr_hoch': 'Sehr hoch'
};

export default function ReviewsList({ spotId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    loadReviews();
  }, [spotId]);

  const loadReviews = async () => {
    try {
      const data = await base44.entities.WaterReview.filter({ spot_id: spotId }, '-reviewed_at', 10);
      setReviews(data);
      
      if (data.length > 0) {
        const avg = (data.reduce((sum, r) => sum + r.rating, 0) / data.length).toFixed(1);
        setAvgRating(avg);
      }
    } catch (error) {
      console.error('Reviews load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-gray-500">Laden...</div>;
  }

  if (reviews.length === 0) {
    return <div className="text-xs text-gray-500">Noch keine Bewertungen</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-amber-400">{avgRating}</span>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={avgRating >= star ? 'text-amber-400' : 'text-gray-600'}>
              *
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-500">({reviews.length})</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {reviews.map((review) => (
          <div key={review.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-start justify-between mb-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={review.rating >= star ? 'text-amber-400' : 'text-gray-600'}>
                    *
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(review.reviewed_at).toLocaleDateString('de-DE')}
              </span>
            </div>
            <div className="text-xs text-cyan-400 mb-1">
              Beisse: {biteActivityLabels[review.bite_activity]}
            </div>
            {review.comment && (
              <p className="text-xs text-gray-300">{review.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}