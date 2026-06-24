import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, Clock } from 'lucide-react';
import { getPendingQueueCount } from '@/components/utils/offlineDataCache';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showIndicator, setShowIndicator] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = () => setPendingCount(getPendingQueueCount());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      refreshPending();
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
      refreshPending();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Queue-Aenderungen mithören
    window.addEventListener('catch-saved', refreshPending);

    if (!navigator.onLine) {
      setShowIndicator(true);
      refreshPending();
    }

    refreshPending();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('catch-saved', refreshPending);
    };
  }, []);

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full shadow-lg ${
            isOnline
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Wieder online
                  {pendingCount > 0 ? ` - ${pendingCount} Fang${pendingCount > 1 ? 'e' : ''} wird synchronisiert` : ''}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Offline-Modus
                  {pendingCount > 0 && (
                    <span className="ml-1 flex items-center gap-1 inline-flex">
                      - <Clock className="w-3 h-3" /> {pendingCount} ausstehend
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}