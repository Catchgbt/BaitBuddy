import React, { useState, useEffect } from 'react';
import { Trophy, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { functions } from '@/api/frontendClient';

export default function EventPointsDisplay() {
  const [points, setPoints] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentPoints, setRecentPoints] = useState([]);
  const [showTicker, setShowTicker] = useState(false);

  useEffect(() => {
    loadEventAndPoints();

    // Listen for point updates
    const handlePointUpdate = (event) => {
      const newPoints = event.detail?.points || 0;
      if (newPoints > 0) {
        addPointAnimation(newPoints);
        loadEventAndPoints();
      }
    };

    window.addEventListener('points-earned', handlePointUpdate);

    // Check every 5 seconds for updates
    const interval = setInterval(() => {
      loadEventAndPoints();
    }, 5000);

    return () => {
      window.removeEventListener('points-earned', handlePointUpdate);
      clearInterval(interval);
    };
  }, []);

  const loadEventAndPoints = async () => {
    try {
      const response = await functions.invoke('getUserEventPoints', {});
      if (response?.data) {
        setPoints(response.data.totalPoints || 0);
        setActiveEvent(response.data.activeEvent || null);
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Punkte:', error);
    }
    setLoading(false);
  };

  const addPointAnimation = (points) => {
    const id = Date.now();
    const newPoint = { id, points, timestamp: new Date() };
    setRecentPoints((prev) => [...prev, newPoint].slice(-5));
    setShowTicker(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setRecentPoints((prev) => prev.filter((p) => p.id !== id));
      if (recentPoints.length <= 1) {
        setShowTicker(false);
      }
    }, 3000);
  };

  if (loading) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {/* Trophy mit Punkte-Anzeige */}
      {activeEvent && (
        <Link to={createPageUrl('Community')}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600/40 to-orange-600/40 border border-amber-500/50 hover:border-amber-400/70 transition-all cursor-pointer">
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Trophy className="w-4 h-4 text-amber-400" />
              </motion.div>
              <span className="text-sm font-bold text-amber-300">{points}</span>
              <motion.div
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
              />
            </div>

            {/* Tooltip mit Event-Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileHover={{ opacity: 1, y: 0 }}
              className="absolute -bottom-12 left-0 w-max bg-gray-900 border border-amber-500/50 rounded-lg p-2 text-xs text-amber-300 pointer-events-none z-50 hidden group-hover:block"
            >
              {activeEvent.name}: {points} Punkte
            </motion.div>
          </motion.div>
        </Link>
      )}

      {/* Live Points Ticker */}
      <AnimatePresence>
        {showTicker && recentPoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-600/40 to-green-600/40 border border-emerald-500/50"
          >
            <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-300">
              +{recentPoints[recentPoints.length - 1].points}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
