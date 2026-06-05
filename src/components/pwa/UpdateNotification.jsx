import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Nutze Progressier's Update-Management
    if (window.progressier) {
      window.progressier.on('update', () => {
        setShowUpdate(true);
        toast.info('Neue Version verfügbar! 🚀', {
          duration: 10000,
          description: 'Aktualisiere die App für neue Features'
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    // Reload App für Update
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-20 left-4 right-4 z-[100] sm:left-auto sm:right-6 sm:w-96"
        >
          <Card className="glass-morphism border-emerald-500/50 shadow-2xl shadow-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm mb-1">
                    Update verfügbar
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Neue Version mit Verbesserungen
                  </p>
                </div>

                <Button 
                  size="sm" 
                  onClick={handleUpdate}
                  className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-xs h-8"
                >
                  Aktualisieren
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}