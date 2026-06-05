import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function FunctionRatings() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      
      if (user?.role !== 'admin') {
        setIsAdmin(false);
        toast.error('Nur Admins können Bewertungen einsehen');
        return;
      }

      setIsAdmin(true);
      const allRatings = await base44.entities.FunctionRating.list();
      setRatings(allRatings);
    } catch (error) {
      console.error('Fehler beim Laden der Bewertungen:', error);
      toast.error('Bewertungen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const groupedByFunction = ratings.reduce((acc, rating) => {
      if (!acc[rating.function_name]) {
        acc[rating.function_name] = [];
      }
      acc[rating.function_name].push(rating);
      return acc;
    }, {});

    return Object.entries(groupedByFunction).map(([functionName, functionRatings]) => {
      const avgRating = functionRatings.reduce((sum, r) => sum + r.rating, 0) / functionRatings.length;
      return {
        functionName,
        avgRating: avgRating.toFixed(1),
        count: functionRatings.length,
        ratings: functionRatings.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      };
    }).sort((a, b) => b.count - a.count);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-slate-400">Lade Bewertungen...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-400">Zugriff verweigert. Nur Admins können diese Seite sehen.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-50">Funktionsbewertungen</h1>
        <Badge variant="outline" className="text-slate-300">
          <Users className="w-4 h-4 mr-2" />
          {ratings.length} Bewertungen
        </Badge>
      </div>

      <div className="grid gap-6">
        {stats.map((stat) => (
          <Card key={stat.functionName} className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-slate-50">{stat.functionName}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span className="text-lg font-bold text-slate-50">{stat.avgRating}</span>
                  </div>
                  <Badge variant="secondary">
                    {stat.count} Bewertung{stat.count !== 1 ? 'en' : ''}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {stat.ratings.map((rating) => (
                <div
                  key={rating.id}
                  className="p-4 bg-gray-950/50 rounded-lg border border-gray-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= rating.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-slate-400">{rating.user_email}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(rating.created_date).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-slate-300 mt-2">{rating.comment}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.length === 0 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-400">Noch keine Bewertungen vorhanden</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}