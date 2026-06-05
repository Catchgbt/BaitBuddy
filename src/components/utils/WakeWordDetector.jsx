/**
 * WakeWordDetector - Kombiniert Offline- und Online-Lösung für Wake Word Erkennung
 * Unterstützt 'offline', 'online' und 'auto' Modi mit robuster Fehlerbehandlung
 */

export class WakeWordDetector {
  constructor(wakePhrase = 'Hey Buddy', onWakeWordDetected, onStatusChange, mode = 'auto') {
    this.wakePhrase = wakePhrase.toLowerCase();
    this.onWakeWordDetected = onWakeWordDetected;
    this.onStatusChange = onStatusChange;
    this.mode = mode; // 'offline', 'online', 'auto'
    
    this.isListening = false;
    this.recognition = null;
    this.offlineDetector = null;
    this.currentMode = null;
    
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    
    // Browser-Kompatibilitäts-Flags
    this.browserCapabilities = this.checkBrowserCapabilities();
  }
  
  checkBrowserCapabilities() {
    const capabilities = {
      audioContext: !!(window.AudioContext || window.webkitAudioContext),
      mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      isSecureContext: window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost'
    };
    
    console.log('WakeWordDetector: Browser capabilities:', capabilities);
    return capabilities;
  }

  // Neue Methode: Broadcast Status Change
  broadcastStatusChange(status, error = null) {
    const statusData = {
      isActive: this.isListening,
      mode: this.currentMode,
      isListening: this.isListening,
      error: error
    };

    // Event an window senden
    window.dispatchEvent(new CustomEvent('wake-word-status-change', {
      detail: statusData
    }));

    // Originaler onStatusChange Callback
    if (this.onStatusChange) {
      this.onStatusChange(status, error);
    }
  }

  async start() {
    if (this.isListening) {
      console.log('Wake word detector already running');
      return;
    }

    // Prüfe grundlegende Voraussetzungen
    if (!this.browserCapabilities.isSecureContext) {
      const error = 'Wake Word Detection requires HTTPS or localhost';
      console.warn('WakeWordDetector:', error);
      this.broadcastStatusChange('error', error);
      return;
    }

    try {
      if (this.mode === 'offline' || this.mode === 'auto') {
        const offlineStarted = await this.tryStartOffline();
        if (offlineStarted) {
          this.currentMode = 'offline';
          this.isListening = true;
          this.broadcastStatusChange('offline_active');
          console.log('Wake Word Detector: Started in offline mode');
          return;
        }
      }

      if (this.mode === 'online' || this.mode === 'auto') {
        const onlineStarted = await this.tryStartOnline();
        if (onlineStarted) {
          this.currentMode = 'online';
          this.isListening = true;
          this.broadcastStatusChange('online_active');
          console.log('Wake Word Detector: Started in online mode');
          return;
        }
      }

      const errorMsg = `Wake Word Detection nicht verfügbar. Browser unterstützt: AudioContext=${this.browserCapabilities.audioContext}, SpeechAPI=${this.browserCapabilities.speechRecognition}, MediaDevices=${this.browserCapabilities.mediaDevices}`;
      console.warn('WakeWordDetector:', errorMsg);
      this.broadcastStatusChange('unsupported', errorMsg);
      
    } catch (error) {
      console.error('Failed to start wake word detection:', error);
      this.broadcastStatusChange('error', error.message);
    }
  }

  // Check if we're on VoiceControl page to avoid conflicts
  isVoiceControlPageActive() {
    return window.location.pathname.includes('VoiceControl');
  }

  async tryStartOffline() {
    try {
      if (!this.browserCapabilities.audioContext) {
        console.log('AudioContext not supported - offline mode not available');
        return false;
      }

      if (!this.browserCapabilities.mediaDevices) {
        console.log('MediaDevices not supported - offline mode not available');
        return false;
      }

      // Vereinfachte Offline-Implementierung mit AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Prüfe Mikrofon-Berechtigung vor Zugriff
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true 
          } 
        });
      } catch (permissionError) {
        console.log('Microphone permission denied for offline mode:', permissionError.message);
        this.cleanupOffline();
        return false;
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      let audioBuffer = [];
      let lastAnalysisTime = 0;
      const ANALYSIS_INTERVAL = 1000;

      let silenceCount = 0;
      const SILENCE_THRESHOLD = 0.02;
      const SPEECH_THRESHOLD = 0.05;
      const PATTERN_LENGTH = 5;
      let audioPattern = [];

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(...inputData);

        const now = Date.now();
        if (now - lastAnalysisTime > ANALYSIS_INTERVAL && audioBuffer.length > 0) {
          const rms = Math.sqrt(audioBuffer.reduce((sum, val) => sum + val * val, 0) / audioBuffer.length);
          
          audioPattern.push(rms);
          if (audioPattern.length > PATTERN_LENGTH) {
            audioPattern.shift();
          }

          if (rms < SILENCE_THRESHOLD) {
            silenceCount++;
          } else {
            silenceCount = 0;
          }

          if (rms > SPEECH_THRESHOLD && silenceCount === 0) {
            const avgPattern = audioPattern.reduce((a, b) => a + b, 0) / audioPattern.length;
            const variance = audioPattern.reduce((sum, val) => sum + Math.pow(val - avgPattern, 2), 0) / audioPattern.length;
            
            if (variance > 0.001 && avgPattern > SPEECH_THRESHOLD) {
              console.log('Wake word pattern detected (RMS:', rms.toFixed(4), 'Variance:', variance.toFixed(5), ')');
              if (this.onWakeWordDetected) {
                this.onWakeWordDetected();
              }
              audioPattern = [];
            }
          }
          
          audioBuffer = [];
          lastAnalysisTime = now;
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      return true;
    } catch (error) {
      console.error('Offline wake word detection failed:', error);
      this.cleanupOffline();
      return false;
    }
  }

  async tryStartOnline() {
    try {
      if (!this.browserCapabilities.speechRecognition) {
        console.log('SpeechRecognition not supported - online mode not available');
        return false;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'de-DE';

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim();
          
          if (transcript.includes(this.wakePhrase)) {
            console.log('Wake word detected (online):', transcript);
            if (this.onWakeWordDetected) {
              this.onWakeWordDetected();
            }
          }
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        console.error('Speech recognition error:', event.error);
        this.broadcastStatusChange('error', `Speech recognition error: ${event.error}`);
      };

      this.recognition.onend = () => {
        if (this.isListening && this.currentMode === 'online') {
          setTimeout(() => {
            try {
              if (this.recognition && this.isListening) {
                this.recognition.start();
              }
            } catch (error) {
              console.log('Could not restart recognition:', error.message);
              if (error.message.includes('already started')) {
                // Recognition läuft bereits, ignoriere
                return;
              }
              this.broadcastStatusChange('error', 'Recognition ended unexpectedly');
            }
          }, 100);
        }
      };

      try {
        this.recognition.start();
        return true;
      } catch (error) {
        console.log('Could not start speech recognition:', error.message);
        this.recognition = null;
        return false;
      }
    } catch (error) {
      console.error('Online wake word detection failed:', error);
      this.recognition = null;
      return false;
    }
  }

  stop() {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;
    
    if (this.currentMode === 'offline') {
      this.cleanupOffline();
    } else if (this.currentMode === 'online') {
      this.cleanupOnline();
    }
    
    this.currentMode = null;
    this.broadcastStatusChange('stopped');
    console.log('Wake Word Detector: Stopped');
  }

  cleanupOffline() {
    try {
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }
      
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }
    } catch (error) {
      console.warn('Error during offline cleanup:', error);
    }
  }

  cleanupOnline() {
    try {
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {
          console.warn('Error stopping recognition:', e);
        }
        
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        
        this.recognition = null;
      }
    } catch (error) {
      console.warn('Error during online cleanup:', error);
    }
  }

  getStatus() {
    return {
      isListening: this.isListening,
      mode: this.currentMode,
      capabilities: this.browserCapabilities
    };
  }
}