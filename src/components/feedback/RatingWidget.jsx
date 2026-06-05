import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function RatingWidget({ functionName, title, onComplete }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Bitte vergeben Sie eine Bewertung');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.FunctionRating.create({
        function_name: functionName,
        rating: rating,
        comment: comment.trim() || undefined,
        user_email: user.email
      });

      toast.success('Vielen Dank für Ihre Bewertung!');
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Bewertung:', error);
      toast.error('Bewertung konnte nicht gespeichert werden');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg text-white">Bewerten Sie diese Funktion</CardTitle>
        <CardDescription className="text-gray-300">{title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoveredRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
        
        <Textarea
          placeholder="Optionaler Kommentar..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="bg-gray-950/50 border-gray-700 text-white placeholder:text-gray-500"
          rows={3}
        />

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          className="w-full bg-cyan-600 hover:bg-cyan-700"
        >
          {isSubmitting ? 'Wird gespeichert...' : 'Bewertung abschicken'}
        </Button>
      </CardContent>
    </Card>
  );
}