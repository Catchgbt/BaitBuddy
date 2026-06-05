import React, { useEffect, useState } from 'react';
import { isOnline, onOnlineStatusChange } from '@/components/utils/OfflineDataCache';

export default function OfflineWrapper({ children }) {
  const [online, setOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Initial status
    setOnline(isOnline());
    
    // Listen to online/offline changes
    const unsubscribe = onOnlineStatusChange((status) => {
      setOnline(status);
      setShowBanner(!status);
      
      // Auto-hide banner nach 5 Sekunden wenn online
      if (status) {
        setTimeout(() => setShowBanner(false), 3000);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <>
      {showBanner && !online && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-900/80 border-b border-amber-700 px-4 py-2">
          <p className="text-sm text-amber-100">
            Offline-Modus. Einige Funktionen sind eingeschraenkt. Gecachte Daten werden angezeigt.
          </p>
        </div>
      )}
      {showBanner && online && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-900/80 border-b border-emerald-700 px-4 py-2">
          <p className="text-sm text-emerald-100">
            Online. Daten werden synchronisiert.
          </p>
        </div>
      )}
      {children}
    </>
  );
}