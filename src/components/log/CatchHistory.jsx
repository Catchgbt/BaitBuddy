import React, { memo, useCallback } from 'react';
import { FixedSizeList } from 'react-window';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import CatchCard from './CatchCard';
import { Badge } from '@/components/ui/badge';
import SwipeToRefresh from '@/components/utils/SwipeToRefresh';

// Threshold above which the list is virtualized.
const VIRTUALIZE_THRESHOLD = 20;
// Estimated height of a single CatchCard row (px).
const ITEM_HEIGHT = 340;
// Max height of the virtualized list container.
const LIST_MAX_HEIGHT = 640;

/**
 * Row renderer for react-window.
 * Data is passed via the `data` prop to avoid closure staleness.
 */
const VirtualRow = ({ index, style, data }) => {
  const { catches, onEdit, onDelete } = data;
  return (
    <div style={{ ...style, paddingBottom: 16 }}>
      <CatchCard catchItem={catches[index]} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
};

function CatchHistory({ catches, isLoading, onEdit, onDelete, onRefresh }) {
  const itemData = { catches, onEdit, onDelete };

  if (isLoading) {
    return (
      <Card className="glass-morphism border-gray-800 rounded-2xl mt-6">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
            Meine Fänge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="glass-morphism border-gray-800 overflow-hidden">
                <div className="h-48 bg-gray-800 animate-pulse" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 bg-gray-700 rounded w-2/3 animate-pulse" />
                  <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-8 bg-gray-700 rounded flex-1 animate-pulse" />
                    <div className="h-8 w-10 bg-gray-700 rounded animate-pulse" />
                    <div className="h-8 w-10 bg-gray-700 rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const listHeight = Math.min(LIST_MAX_HEIGHT, catches.length * ITEM_HEIGHT);
  const shouldVirtualize = catches.length > VIRTUALIZE_THRESHOLD;

  return (
    <SwipeToRefresh onRefresh={onRefresh || (() => Promise.resolve())}>
      <Card className="glass-morphism border-gray-800 rounded-2xl mt-6" role="region" aria-label="Meine Fänge">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
            Meine Fänge
            <Badge variant="outline" className="ml-2 text-emerald-400 border-emerald-500/30" aria-label={`${catches.length} Fänge`}>
              {catches.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {catches.length > 0 ? (
            shouldVirtualize ? (
              // Virtualized list for large datasets (> VIRTUALIZE_THRESHOLD items)
              <FixedSizeList
                height={listHeight}
                itemCount={catches.length}
                itemSize={ITEM_HEIGHT}
                width="100%"
                itemData={itemData}
                overscanCount={3}
              >
                {VirtualRow}
              </FixedSizeList>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catches.map(c => (
                  <CatchCard key={c.id} catchItem={c} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            )
          ) : (
            <Card className="glass-morphism border-gray-800 rounded-2xl text-center p-12">
              <h3 className="text-xl font-semibold text-white">Noch keine Fänge erfasst</h3>
              <p className="text-gray-400 mt-2">
                Lade oben ein Bild deines ersten Fangs hoch, um dein Fangbuch zu starten!
              </p>
            </Card>
          )}
        </CardContent>
      </Card>
    </SwipeToRefresh>
  );
}

export default memo(CatchHistory);