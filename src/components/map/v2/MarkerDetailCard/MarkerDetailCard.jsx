import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import CardLayout from './CardLayout';
import CardLoading from './CardLoading';

function MarkerDetailCard({
  marker,
  markerType,
  onClose,
  onAction,
  heroImage = null,
  isLoading = false
}) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleAction = useCallback((actionId, actionData) => {
    if (onAction) {
      onAction(actionId, actionData);
    }
  }, [onAction]);

  if (!marker) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
      >
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
            aria-label="Schließen"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Content */}
          {isLoading ? (
            <CardLoading />
          ) : (
            <CardLayout
              marker={marker}
              markerType={markerType}
              heroImage={heroImage}
              onImageError={handleImageError}
              imageError={imageError}
              onAction={handleAction}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default MarkerDetailCard;
