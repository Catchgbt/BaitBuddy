import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';

// Web Audio API für programmatisch generierte Sounds
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

// Moderne, cleane Sound-Generatoren
const soundGenerators = {
  // Subtiler Klick-Sound
  click: () => {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  },

  // Erfolgs-Sound (aufsteigendes Motiv)
  success: () => {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  },

  // Fehler-Sound (absteigend)
  error: () => {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15);
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  },

  // Warnung (zwei Töne)
  warning: () => {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.08);
    gainNode.gain.setValueAtTime(0.12, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  },

  // Benachrichtigung (sanfter Ton)
  notification: () => {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  },

  // Auswahl/Selection (kurzer hoher Ton)
  selection: () => {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 1200;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.04);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.04);
  },

  // Bissanzeiger-Alarm (dringend)
  biteAlert: () => {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 1100;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }
};

const SoundContext = createContext();

export function SoundProvider({ children }) {
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    // Lade Sound-Einstellungen vom User
    User.me().then(user => {
      if (user?.settings?.sounds_enabled !== undefined) {
        setSoundsEnabled(user.settings.sounds_enabled);
      }
      if (user?.settings?.sound_volume !== undefined) {
        setVolume(user.settings.sound_volume);
      }
    }).catch(() => {});
  }, []);

  const playSound = useCallback((soundType) => {
    if (!soundsEnabled || !audioContext) return;
    
    try {
      // Resume AudioContext wenn suspended (Browser-Policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const generator = soundGenerators[soundType];
      if (generator) {
        // Volume wird durch die gainNode-Werte in den Generatoren kontrolliert
        generator();
      }
    } catch (error) {
      console.warn('Sound playback error:', error);
    }
  }, [soundsEnabled]);

  const toggleSounds = useCallback(async () => {
    const newState = !soundsEnabled;
    setSoundsEnabled(newState);
    
    try {
      const user = await User.me();
      await User.updateMyUserData({
        settings: {
          ...user.settings,
          sounds_enabled: newState
        }
      });
    } catch (error) {
      console.error('Failed to update sound settings:', error);
    }
  }, [soundsEnabled]);

  return (
    <SoundContext.Provider value={{ playSound, soundsEnabled, toggleSounds, volume, setVolume }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within SoundProvider');
  }
  return context;
}