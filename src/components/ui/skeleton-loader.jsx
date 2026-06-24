import React from 'react';
import { cn } from '@/lib/utils';

const SkeletonBase = ({ className }) => (
  <div className={cn(
    'animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded',
    className
  )} />
);

export const MapSkeleton = () => (
  <div className="relative h-[calc(100vh-250px)] min-h-[500px] rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 space-y-2 p-4">
    <SkeletonBase className="h-10 w-32" />
    <SkeletonBase className="w-full h-full" />
  </div>
);

export const ChartSkeleton = () => (
  <div className="space-y-4">
    <SkeletonBase className="h-8 w-40" />
    <SkeletonBase className="w-full h-64" />
  </div>
);

export const MetricsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {Array(3).fill(null).map((_, i) => (
      <div key={i} className="space-y-2">
        <SkeletonBase className="h-4 w-24" />
        <SkeletonBase className="h-8 w-16" />
      </div>
    ))}
  </div>
);

export const VideoPanelSkeleton = () => (
  <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
    <SkeletonBase className="w-full h-full" />
  </div>
);

export const DataTableSkeleton = ({ rows = 5 }) => (
  <div className="space-y-2">
    {Array(rows).fill(null).map((_, i) => (
      <SkeletonBase key={i} className="h-12 w-full" />
    ))}
  </div>
);