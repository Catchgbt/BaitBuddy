import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Newspaper } from 'lucide-react';
import { useOptimisticMutation } from '@/lib/useOptimisticMutation';

export default function TickerSettings() {
    const [speed, setSpeed] = useState(100);
    const [initialSpeed, setInitialSpeed] = useState(100);

    useEffect(() => {
        (async () => {
            try {
                const user = await base44.auth.me();
                if (user && user.settings && user.settings.ticker_speed) {
                    setSpeed(user.settings.ticker_speed);
                    setInitialSpeed(user.settings.ticker_speed);
                }
            } catch (error) {
                toast.error("Fehler beim Laden der Ticker-Einstellungen.");
            }
        })();
    }, []);

    const tickerMutation = useOptimisticMutation({
        mutationFn: async (newSpeed) => {
            await base44.auth.updateMe({ settings: { ticker_speed: newSpeed } });
            return newSpeed;
        },
        optimisticUpdate: () => speed,
        onSuccess: () => {
            setInitialSpeed(speed);
            toast.success("Ticker-Einstellungen gespeichert!");
            window.dispatchEvent(new CustomEvent('tickerSettingsChanged', { detail: { speed } }));
        },
        onError: () => {
            toast.error("Fehler beim Speichern der Ticker-Einstellungen.");
        },
        invalidateOnSettle: false
    });

    const handleSave = () => {
        tickerMutation.mutate(speed);
    };
    
    const hasChanges = speed !== initialSpeed;

    return (
        <div className="border-t border-gray-800 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-gray-400" />
                Nachrichten-Ticker
            </h3>
            <div className="space-y-2">
                <label htmlFor="ticker-speed" className="text-sm text-gray-400">
                    Scroll-Geschwindigkeit
                </label>
                <div className="flex items-center gap-3">
                     <input
                        id="ticker-speed"
                        type="range"
                        min="25"
                        max="200"
                        step="5"
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                        className="w-full accent-emerald-500"
                    />
                    <span className="text-sm text-gray-300 w-16 text-center">{speed}%</span>
                </div>
            </div>
             <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleSave} 
                  disabled={tickerMutation.isPending || !hasChanges}
                  className="active:scale-95 focus:ring-2 focus:ring-emerald-400"
                  aria-label="Ticker Einstellungen speichern"
                >
                    <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                    {tickerMutation.isPending ? 'Speichert...' : 'Änderungen speichern'}
                </Button>
             </div>
        </div>
    );
}