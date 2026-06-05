import React, { useState } from 'react';

export default function LazyImage({ src, alt, className = '', fallback = null }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) {
    return fallback || <div className={`${className} bg-gray-700 flex items-center justify-center`} />;
  }

  return (
    <>
      {!isLoaded && (
        <div className={`${className} bg-gray-700 animate-pulse`} />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0 absolute'} transition-opacity duration-300`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}