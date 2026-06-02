import { useState, useRef, useEffect } from 'react';
import { api } from '@/api/client';
import { useNavigate } from 'react-router-dom';
import { Send, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hallo! Ich bin BaitBuddy, dein KI-Angel-Experte. Was möchtest du wissen?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  const navigate = useNavigate();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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

      // Action ausführen
      if (action?.type === 'navigate') navigate(`/${action.params.page.toLowerCase()}`);
      if (action?.type === 'log_catch') {
        await api.post('/api/catches', action.params);
        toast.success('Fang wurde eingetragen!');
      }
    } catch (e) {
      toast.error('Fehler: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ''));
    u.lang = 'de-DE';
    const voices = window.speechSynthesis.getVoices();
    const de = voices.find(v => v.lang.startsWith('de'));
    if (de) u.voice = de;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">🤖 KI Angel-Assistent</h1>
        <p className="text-xs text-gray-500">Powered by Claude AI</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-100'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'assistant' && (
                <button onClick={() => speak(msg.content)} className="mt-2 text-gray-500 hover:text-gray-300">
                  <Volume2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

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
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {['Bestes Wetter heute?', 'Welcher Köder für Hecht?', 'Meine letzten Fänge', 'Schonzeiten'].map(q => (
            <button key={q} onClick={() => setInput(q)}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white text-xs border border-gray-700 transition-colors">
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
