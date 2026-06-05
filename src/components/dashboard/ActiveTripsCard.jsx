import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ActiveTripsCard({ trips, stats }) {
    const nextTrip = trips && trips.length > 0 ? trips[0] : null;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    };

    return (
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:border-cyan-500/30 transition-all">
            <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 text-cyan-400">Aktive Trips</h3>
                
                {nextTrip ? (
                    <div className="space-y-3">
                        <div className="text-center mb-3">
                            <div className="text-4xl font-bold text-white mb-1">
                                {stats.activeTrips}
                            </div>
                            <p className="text-gray-400 text-sm">Geplante Trips</p>
                        </div>
                        
                        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <h4 className="text-white font-semibold text-sm truncate">
                                        {nextTrip.title}
                                    </h4>
                                    <p className="text-cyan-400 text-xs mt-1">
                                        Zielfisch: {nextTrip.target_fish}
                                    </p>
                                </div>
                                {nextTrip.created_date && (
                                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                                        {formatDate(nextTrip.created_date)}
                                    </span>
                                )}
                            </div>
                            
                            {nextTrip.spot_info && (
                                <p className="text-gray-400 text-xs truncate">
                                    {nextTrip.spot_info}
                                </p>
                            )}
                        </div>
                        
                        <Link to={createPageUrl('TripPlanner')}>
                            <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-sm">
                                Alle Trips anzeigen
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="text-4xl font-bold text-white mb-2">
                            {stats.activeTrips || 0}
                        </div>
                        <p className="text-gray-400 text-sm mb-4">Noch keine geplanten Trips</p>
                        <Link to={createPageUrl('TripPlanner')}>
                            <Button className="w-full bg-cyan-600 hover:bg-cyan-700">
                                Trip planen
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}