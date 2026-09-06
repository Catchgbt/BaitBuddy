import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ToolLockPanel from './ToolLockPanel';

/**
 * Zeigt die Freischalt-Erklärung als Dialog — z. B. wenn ein gesperrter
 * Menüeintrag angetippt wird.
 */
export default function ToolLockModal({ toolId, open, onOpenChange, onUnlocked }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-950 border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Tool noch nicht freigeschaltet</DialogTitle>
        </DialogHeader>
        {toolId && (
          <ToolLockPanel
            toolId={toolId}
            onUnlocked={(id) => {
              onUnlocked?.(id);
              onOpenChange?.(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
