import React, { useState, useEffect } from 'react';
import { AlertCircle, Wifi, WifiOff, Database } from 'lucide-react';

export default function OfflineCacheIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDetail, setShowDetail] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const updateCacheInfo = async () => {
      try {
        const { getOfflineData } = await import('@/components/utils/OfflineDataCache');
        const [spots, weather] = await Promise.all([
          getOfflineData('spots'),
          getOfflineData('weather')
        ]);
        
        setCacheInfo({
          spotsCount: spots?.length || 0,
          weatherCount: weather?.length || 0
        });
      } catch (error) {
        console.error('Cache info error:', error);
      }
    };

    updateCacheInfo();
  }, [isOnline]);

  if (isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
        <Wifi className="w-3 h-3" />
        <span>Online</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors"
      >
        <WifiOff className="w-3 h-3" />
        <span>Offline</span>
      </button>

      {showDetail && cacheInfo && (
        <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg p-3 w-48 shadow-lg z-50">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <Database className="w-3 h-3 text-amber-400" />
              <span>Gecachte Daten verfuegbar:</span>
            </div>
            <div className="ml-5 space-y-1 text-gray-400">
              {cacheInfo.spotsCount > 0 && (
                <div>Angelplaetze: {cacheInfo.spotsCount}</div>
              )}
              {cacheInfo.weatherCount > 0 && (
                <div>Wetterdaten: {cacheInfo.weatherCount}</div>
              )}
              {cacheInfo.spotsCount === 0 && cacheInfo.weatherCount === 0 && (
                <div className="text-gray-500">Keine Daten gecacht</div>
              )}
            </div>
            <div className="pt-2 border-t border-gray-700 text-gray-500 text-xs">
              Verbindung wiederherstellen um neue Daten zu laden
            </div>
          </div>
        </div>
      )}
    </div>
  );
}