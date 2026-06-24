import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Wifi, AlertTriangle } from 'lucide-react';

export default function WakeWordIndicator({ isActive, mode, isListening, error, showAlways = false }) {
  if (!isActive && !showAlways) return null;

  const getIcon = () => {
    if (error) {
      // Unterscheide zwischen Fehlern und nicht unterstützten Features
      if (error.includes('nicht verfügbar') || error.includes('not available') || error.includes('unsupported')) {
        return <MicOff className="w-3 h-3 text-gray-400" />;
      }
      return <AlertTriangle className="w-3 h-3 text-red-400" />;
    }
    if (!isListening) return <MicOff className="w-3 h-3 text-gray-400" />;
    
    return mode === 'offline' 
      ? <Mic className="w-3 h-3 text-emerald-400" />
      : <Wifi className="w-3 h-3 text-blue-400" />;
  };

  const getBadgeProps = () => {
    if (error) {
      // Für "nicht unterstützt" weniger auffällig anzeigen
      if (error.includes('nicht verfügbar') || error.includes('not available') || error.includes('unsupported')) {
        return { 
          className: "bg-gray-700/20 text-gray-400 border-gray-600/30",
          title: `Wake Word nicht verfügbar: Browser-Unterstützung fehlt`
        };
      }
      return { 
        className: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse",
        title: `Wake Word Fehler: ${error}`
      };
    }
    
    if (!isListening) {
      return { 
        className: "bg-gray-700/20 text-gray-400 border-gray-600/30",
        title: "Wake Word inaktiv"
      };
    }

    if (mode === 'offline') {
      return { 
        className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        title: "Wake Word aktiv (Offline-Modus)"
      };
    }

    return { 
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      title: "Wake Word aktiv (Online-Modus)"
    };
  };

  const badgeProps = getBadgeProps();

  return (
    <Badge variant="outline" {...badgeProps} className={`text-xs px-2 py-1 ${badgeProps.className}`}>
      <div className="flex items-center gap-1.5">
        {getIcon()}
        <span>
          {error ? 
            (error.includes('nicht verfügbar') || error.includes('not available') ? 'N/A' : 'Fehler') :
            isListening ? (mode === 'offline' ? 'Offline' : 'Online') : 'Aus'
          }
        </span>
      </div>
    </Badge>
  );
}