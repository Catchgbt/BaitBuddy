import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function LastBuddyMessage() {
  const [lastMessage, setLastMessage] = useState(null);

  const loadLastMessage = async () => {
    try {
      const msgs = await base44.entities.ChatMessage.filter(
        { context: "voice_control", role: "assistant" },
        "-timestamp",
        1
      );
      if (msgs && msgs.length > 0) {
        setLastMessage(msgs[0]);
      } else {
        setLastMessage(null);
      }
    } catch (error) {
      console.warn("Could not load last buddy message:", error);
      setLastMessage(null);
    }
  };

  useEffect(() => {
    loadLastMessage();

    // Polle alle 30 Sekunden
    const interval = setInterval(loadLastMessage, 30000);

    // Bei Voice-Events sofort neu laden
    const refresh = () => loadLastMessage();
    window.addEventListener("buddy-message-added", refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("buddy-message-added", refresh);
    };
  }, []);

  if (!lastMessage) {
    return (
      <Link
        to={createPageUrl("VoiceControl")}
        className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]"
      >
        BaitBuddy
      </Link>
    );
  }

  // Kürzen für Header-Anzeige
  const preview = lastMessage.content.length > 60
    ? lastMessage.content.slice(0, 60) + "..."
    : lastMessage.content;

  return (
    <Link
      to={createPageUrl("VoiceControl")}
      className="flex flex-col items-center max-w-[200px] sm:max-w-[280px] active:scale-95 transition-transform"
      title="Zum Buddy"
    >
      <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold leading-none">
        Buddy
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={lastMessage.id || lastMessage.timestamp}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="text-xs text-cyan-300 truncate w-full text-center leading-tight mt-0.5"
        >
          {preview}
        </motion.span>
      </AnimatePresence>
    </Link>
  );
}