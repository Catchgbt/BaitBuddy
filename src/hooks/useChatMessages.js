import { useState, useRef, useEffect, useCallback } from 'react';

const MAX_MESSAGES = 100;

export function useChatMessages(initialMessage = null) {
  const [messages, setMessages] = useState(() => {
    if (initialMessage) {
      return [{ role: 'assistant', content: initialMessage }];
    }
    return [];
  });

  const messagesRef = useRef(messages);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesRef.current = messages;
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const addMessage = useCallback((role, content) => {
    setMessages(prev => {
      const updated = [...prev, { role, content }];
      // Kapp auf MAX_MESSAGES: behalte die neuesten Nachrichten
      if (updated.length > MAX_MESSAGES) {
        return updated.slice(-MAX_MESSAGES);
      }
      return updated;
    });
  }, []);

  const clearMessages = useCallback(() => {
    if (initialMessage) {
      setMessages([{ role: 'assistant', content: initialMessage }]);
    } else {
      setMessages([]);
    }
  }, [initialMessage]);

  // Wrapper für setMessages um auch dort Capping zu machen
  const setMessagesWithCap = useCallback((updater) => {
    setMessages(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      if (updated.length > MAX_MESSAGES) {
        return updated.slice(-MAX_MESSAGES);
      }
      return updated;
    });
  }, []);

  return {
    messages,
    setMessages: setMessagesWithCap,
    addMessage,
    clearMessages,
    messagesRef,
    messagesEndRef,
  };
}
