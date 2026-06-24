import React from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAITTS } from '@/hooks/useAITTS';

export default function SpeakButton({ text, autoPlay = false, className = '', size = 'sm' }) {
  const { speak, stop, isSpeaking, isPremiumVoice } = useAITTS();
  const playedRef = React.useRef(false);

  React.useEffect(() => {
    if (autoPlay && text && !playedRef.current) {
      playedRef.current = true;
      speak(text);
    }
  }, [autoPlay, text, speak]);

  if (!text) return null;

  const handleClick = () => {
    if (isSpeaking) stop();
    else speak(text);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={handleClick}
      className={`gap-2 ${className}`}
      aria-label={isSpeaking ? 'Stoppe Wiedergabe' : 'KI-Antwort vorlesen'}
    >
      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      <span className="text-xs">
        {isSpeaking ? 'Stop' : isPremiumVoice ? 'Vorlesen' : 'Vorlesen'}
      </span>
      {isPremiumVoice && !isSpeaking && (
        <Sparkles className="w-3 h-3 text-amber-400" />
      )}
    </Button>
  );
}