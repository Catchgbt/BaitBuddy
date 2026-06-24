import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, Pause, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { addToOfflineNotesQueue, getOfflineNotesQueue, removeFromOfflineNotesQueue, isOnline } from '@/components/utils/offlineSync';
import { useHaptic } from '@/components/utils/HapticFeedback';
import { useSound } from '@/components/utils/SoundManager';

export default function AudioNotesWidget() {
  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const { triggerHaptic } = useHaptic();
  const { playSound } = useSound();

  // Load persisted notes on mount
  useEffect(() => {
    loadNotes();
    window.addEventListener('storage', loadNotes);
    return () => window.removeEventListener('storage', loadNotes);
  }, []);

  const loadNotes = () => {
    const queue = getOfflineNotesQueue();
    setNotes(queue);
  };

  const startRecording = async () => {
    try {
      triggerHaptic('medium');
      playSound('click');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();

        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          const newNote = addToOfflineNotesQueue({
            audio_data: base64,
            duration_ms: mediaRecorderRef.current?.duration || 0,
            mime_type: 'audio/webm',
            title: `Notiz ${new Date().toLocaleTimeString('de-DE')}`,
            spot_id: null,
            catch_id: null,
          });

          loadNotes();
          triggerHaptic('light');
          playSound('success');
          toast.success('Audionotiz gespeichert');
        };

        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Fehler beim Starten der Aufnahme:', error);
      triggerHaptic('light');
      playSound('error');
      toast.error('Mikrofon nicht verfügbar');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      triggerHaptic('light');
      playSound('click');
    }
  };

  const playNote = async (note) => {
    try {
      triggerHaptic('light');
      const audio = new Audio(`data:${note.mime_type};base64,${note.audio_data}`);

      audio.onplay = () => setPlayingId(note.__id);
      audio.onended = () => setPlayingId(null);
      audio.onpause = () => setPlayingId(null);

      if (playingId === note.__id) {
        audio.pause();
        setPlayingId(null);
      } else {
        await audio.play();
      }
    } catch (error) {
      console.error('Fehler beim Abspielen:', error);
      toast.error('Fehler beim Abspielen der Notiz');
    }
  };

  const downloadNote = (note) => {
    triggerHaptic('light');
    const link = document.createElement('a');
    link.href = `data:${note.mime_type};base64,${note.audio_data}`;
    link.download = `${note.title}.webm`;
    link.click();
  };

  const deleteNote = (noteId) => {
    triggerHaptic('light');
    removeFromOfflineNotesQueue(noteId);
    loadNotes();
    toast.success('Notiz gelöscht');
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Audionotizen</h3>
          {!isOnline() && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Offline</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
            size="sm"
          >
            <Mic className="w-4 h-4" />
            Aufnahme starten
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-2 animate-pulse"
            size="sm"
          >
            <Square className="w-4 h-4" />
            Aufnahme stoppen
          </Button>
        )}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Keine Audionotizen vorhanden
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.__id}
              className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300"
            >
              <button
                onClick={() => playNote(note)}
                className="p-1.5 hover:bg-blue-100 rounded-lg transition"
              >
                {playingId === note.__id ? (
                  <Pause className="w-4 h-4 text-blue-600" />
                ) : (
                  <Play className="w-4 h-4 text-blue-600" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {note.title}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(note.__created).toLocaleTimeString('de-DE')}
                </p>
              </div>

              <button
                onClick={() => downloadNote(note)}
                className="p-1 hover:bg-gray-100 rounded transition"
                title="Herunterladen"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </button>

              <button
                onClick={() => deleteNote(note.__id)}
                className="p-1 hover:bg-red-100 rounded transition"
                title="Löschen"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ))
        )}
      </div>

      {notes.length > 0 && (
        <p className="text-xs text-gray-600 mt-3 text-center">
          {notes.length} Notiz{notes.length !== 1 ? 'en' : ''}
        </p>
      )}
    </Card>
  );
}
