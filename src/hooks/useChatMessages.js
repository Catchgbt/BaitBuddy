import { useState, useRef, useEffect } from 'react';

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

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const clearMessages = () => {
    if (initialMessage) {
      setMessages([{ role: 'assistant', content: initialMessage }]);
    } else {
      setMessages([]);
    }
  };

  return {
    messages,
    setMessages,
    addMessage,
    clearMessages,
    messagesRef,
    messagesEndRef,
  };
}
