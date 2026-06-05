import { useState, useRef, useEffect } from 'react';
import { api } from '@/api/client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hallo! Ich bin BaitBuddy, dein KI-Angel-Experte. Was möchtest du wissen?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const PAGE_ROUTES = { home: '/app', log: '/app/log', map: '/app/map', community: '/app/community', premium: '/app/premium', chat: '/app/chat' };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Stimme vorladen sobald verfügbar
  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_`]/g, '').trim();
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'de-DE';
    u.rate = 1.0;
    u.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const de = voices.find(v => v.lang === 'de-DE') || voices.find(v => v.lang.startsWith('de'));
    if (de) u.voice = de;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const loc = await new Promise(resolve => {
        if (!navigator.geolocation) return resolve(null);
        return navigator.geolocation.getCurrentPosition(
          p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
          () => resolve(null), { timeout: 3000 }
        );
      });

      const { reply, action } = await api.post('/api/chat', {
        messages: [...messages, userMsg],
        userLocation: loc
      });

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      // Automatisch vorlesen
      if (autoSpeak) speak(reply);

      if (action?.type === 'navigate') {
        const page = action.params?.page?.toLowerCase();
        const route = PAGE_ROUTES[page];
        if (route) navigate(route);
      }
      if (action?.type === 'log_catch') {
        await api.post('/api/catches', action.params);
        qc.invalidateQueries({ queryKey: ['catches'] });
        toast.success('Fang wurde eingetragen!');
      }
    } catch (e) {
      toast.error('Fehler: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">🤖 KI Angel-Assistent</h1>
          <p className="text-xs text-gray-500">Powered by Claude AI</p>
        </div>
        <button
          onClick={() => {
            if (speaking) stopSpeaking();
            setAutoSpeak(v => !v);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
            autoSpeak
              ? 'bg-cyan-900/40 border-cyan-700 text-cyan-400'
              : 'bg-gray-800 border-gray-700 text-gray-500'
          }`}
        >
          {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
          {autoSpeak ? 'Ton an' : 'Ton aus'}
        </button>
      </div>

      {/* Nachrichten */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-100'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => speaking ? stopSpeaking() : speak(msg.content)}
                  className="mt-2 text-gray-500 hover:text-cyan-400 transition-colors"
                >
                  {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Eingabe */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Frage stellen..."
            className="flex-1 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
          />
          <button onClick={send} disabled={loading || !input.trim()}
            className="p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 transition-colors">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
