import React, { useState, useEffect } from "react";
import { Download, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { downloadMapArea, getOfflineMapSize } from "@/components/utils/offlineMapDownload";
import { toast } from "sonner";

export default function MapDownloadDialog({ isOpen, onClose, bounds, currentZoom }) {
  const [selectedZooms, setSelectedZooms] = useState([currentZoom]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [offlineSize, setOfflineSize] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadOfflineSize();
    }
  }, [isOpen]);

  const loadOfflineSize = async () => {
    try {
      const size = await getOfflineMapSize();
      setOfflineSize(size);
    } catch (error) {
      console.error("Error getting offline map size:", error);
    }
  };

  const handleZoomToggle = (zoom) => {
    setSelectedZooms(prev => 
      prev.includes(zoom) 
        ? prev.filter(z => z !== zoom)
        : [...prev, zoom].sort()
    );
  };

  const handleDownload = async () => {
    if (!bounds || selectedZooms.length === 0) {
      toast.error("Bitte Zoom-Level auswaehlen");
      return;
    }

    setIsDownloading(true);
    setProgress({ status: 'starting' });

    try {
      const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      
      const result = await downloadMapArea(
        bounds,
        selectedZooms,
        tileUrl,
        (prog) => setProgress(prog)
      );

      await loadOfflineSize();
      toast.success(`${result.downloadedTiles} Kartenkacheln heruntergeladen`);
      setIsDownloading(false);
      setProgress(null);
      onClose();
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download fehlgeschlagen");
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Karte offline laden</h2>
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Bereich Info */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <p className="text-xs text-gray-400 mb-2">Karten-Bereich:</p>
            <p className="text-sm text-gray-300">
              {bounds ? (
                <>
                  Nord: {bounds.north.toFixed(4)} - Sued: {bounds.south.toFixed(4)}
                  <br />
                  Ost: {bounds.east.toFixed(4)} - West: {bounds.west.toFixed(4)}
                </>
              ) : (
                "Laden Sie die Karte um einen Bereich zu definieren"
              )}
            </p>
          </div>

          {/* Zoom-Level Auswahl */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Zoom-Level waehlen
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 12, 14, 16].map(zoom => (
                <button
                  key={zoom}
                  onClick={() => handleZoomToggle(zoom)}
                  disabled={isDownloading}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                    selectedZooms.includes(zoom)
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {zoom}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Hoehere Zoom-Level = bessere Details aber groesserer Download
            </p>
          </div>

          {/* Offline Storage Info */}
          {offlineSize && (
            <div className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-700/30">
              <p className="text-xs text-emerald-400 mb-1">Offline-Speicher:</p>
              <p className="text-sm text-emerald-300">
                {offlineSize.tiles} Kacheln ({offlineSize.sizeInMB} MB)
              </p>
            </div>
          )}

          {/* Download Progress */}
          {progress && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              {progress.status === 'starting' && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <p className="text-sm text-gray-300">Starte Download...</p>
                </div>
              )}
              {progress.status === 'downloading' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <p className="text-sm text-gray-300">
                      {progress.downloadedTiles} / {progress.totalTiles}
                    </p>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.round((progress.downloadedTiles / progress.totalTiles) * 100)}%`
                      }}
                    />
                  </div>
                  {progress.failedTiles > 0 && (
                    <p className="text-xs text-orange-400 mt-2">
                      {progress.failedTiles} Fehler
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="flex-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading || selectedZooms.length === 0}
              className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}