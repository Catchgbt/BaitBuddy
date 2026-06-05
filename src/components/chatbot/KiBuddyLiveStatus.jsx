import React, { useState, useEffect } from 'react';
import { Wifi, Mic, Loader2 } from 'lucide-react';

const KiBuddyLiveStatus = () => {
  const [status, setStatus] = useState('ready'); // ready, listening, thinking
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleStatusUpdate = (event) => {
      const { isLoading, isListening, isOpen: isChatOpen } = event.detail;
      setIsOpen(isChatOpen);
      if (isChatOpen) {
          setStatus('ready'); // Reset status when open
      } else if (isLoading) {
        setStatus('thinking');
      } else if (isListening) {
        setStatus('listening');
      } else {
        setStatus('ready');
      }
    };

    window.addEventListener('chatbotStatusUpdate', handleStatusUpdate);
    return () => window.removeEventListener('chatbotStatusUpdate', handleStatusUpdate);
  }, []);

  const statusConfig = {
    ready: { text: 'Bereit', icon: Wifi, color: 'text-emerald-400' },
    listening: { text: 'Hört zu...', icon: Mic, color: 'text-red-400 animate-pulse' },
    thinking: { text: 'Denkt nach...', icon: Loader2, color: 'text-amber-400 animate-spin' },
  };

  const currentStatus = statusConfig[status];
  const Icon = currentStatus.icon;

  if (isOpen) return <div className="w-32" />; // Return empty placeholder when open to keep layout stable

  return (
    <div className="flex items-center gap-2 text-xs w-32">
      <Icon className={`w-3.5 h-3.5 ${currentStatus.color}`} />
      <span className="text-gray-400">{currentStatus.text}</span>
    </div>
  );
};

export default KiBuddyLiveStatus;