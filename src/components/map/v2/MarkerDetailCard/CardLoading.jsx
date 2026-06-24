import React from 'react';

function CardLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Hero Skeleton */}
      <div className="h-56 sm:h-64 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse" />

      {/* Content Skeleton */}
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {/* Title Skeleton */}
        <div className="space-y-2">
          <div className="h-6 bg-gray-700 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2" />
        </div>

        {/* Info Rows Skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 bg-gray-800/30 rounded-lg space-y-2">
            <div className="h-4 bg-gray-700 rounded animate-pulse w-1/4" />
            <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4" />
          </div>
        ))}
      </div>

      {/* Action Skeleton */}
      <div className="p-4 sm:p-6 border-t border-gray-800 space-y-2">
        <div className="h-10 bg-gray-700 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export default CardLoading;
