import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const FALLBACK_ICON = '🗺️';

function HeroImage({
  src,
  alt = 'Hero image',
  onError,
  fallbacks = [],
  typeIcon = FALLBACK_ICON
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(!!src);
  const [showFallback, setShowFallback] = useState(!src);
  const [imageIndex, setImageIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    setCurrentSrc(src);
    setIsLoading(!!src);
    setShowFallback(!src);
    setImageIndex(0);
  }, [src]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setShowFallback(false);
  };

  const handleImageError = () => {
    onError?.();

    if (imageIndex < fallbacks.length) {
      setCurrentSrc(fallbacks[imageIndex]);
      setImageIndex(imageIndex + 1);
    } else {
      setShowFallback(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 overflow-hidden flex items-center justify-center"
    >
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse" />
      )}

      {/* Fallback Icon */}
      {showFallback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center w-full h-full"
        >
          <div className="text-6xl sm:text-8xl drop-shadow-lg">{typeIcon}</div>
        </motion.div>
      )}

      {/* Actual Image */}
      {currentSrc && !showFallback && (
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          src={currentSrc}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="w-full h-full object-cover"
        />
      )}

      {/* Gradient Overlay (für bessere Lesbarkeit des Close-Buttons) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

export default HeroImage;
