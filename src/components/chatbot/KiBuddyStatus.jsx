import React, { useEffect, useState } from "react";
import { User } from "@/entities/User";
import { BrainCircuit } from "lucide-react";

export default function KiBuddyStatus() {
  const [text, setText] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await User.me();
        setUser(u);
      } catch (e) {
        // not logged in
      }
    })();

    const handleKiResponse = (event) => {
      const detail = event?.detail || {};
      const responseText = String(detail.text || "").trim();
      if (responseText) {
        setText(responseText.slice(0, 100) + "...");

        // Speak text only in browser environment
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          try {
            const utterance = new SpeechSynthesisUtterance(responseText);
            utterance.lang = "de-DE";
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
          } catch (error) {
            console.warn("Speech synthesis failed in KiBuddyStatus:", error);
          }
        }

        setTimeout(() => setText(""), 15000);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('kiResponse', handleKiResponse);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('kiResponse', handleKiResponse);
      }
    };
  }, []);

  if (!text) return null;

  return (
    <div className="flex items-start gap-2 text-sm text-gray-300">
      <BrainCircuit className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <div className="font-semibold text-emerald-400">KI-Buddy</div>
        <p>{text}</p>
      </div>
    </div>
  );
}