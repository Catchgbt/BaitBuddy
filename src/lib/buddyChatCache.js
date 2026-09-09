// Persistent chat history caching for KI-Buddy
// Enables offline access to previous responses and conversation history

const CACHE_KEY = 'bb_buddy_chat_history';
const MAX_MESSAGES = 200; // Prevent localStorage bloat
const MAX_CACHE_SIZE = 500 * 1024; // 500 KB limit

/**
 * Save chat messages to localStorage
 * @param {Array} messages - Array of message objects {role, text}
 */
export function saveBuddyChatHistory(messages) {
  try {
    if (!messages || messages.length === 0) {
      localStorage.removeItem(CACHE_KEY);
      return;
    }

    // Keep only the most recent messages to avoid storage bloat
    const recentMessages = messages.slice(-MAX_MESSAGES);
    const json = JSON.stringify({
      messages: recentMessages,
      savedAt: new Date().toISOString()
    });

    // Check if we're about to exceed storage limits
    if (json.length > MAX_CACHE_SIZE) {
      // Trim to keep only the last 100 messages if we exceed limit
      const trimmed = messages.slice(-100);
      const trimmedJson = JSON.stringify({
        messages: trimmed,
        savedAt: new Date().toISOString()
      });
      localStorage.setItem(CACHE_KEY, trimmedJson);
    } else {
      localStorage.setItem(CACHE_KEY, json);
    }
  } catch (e) {
    // localStorage full or disabled — fail silently
    if (e.name === 'QuotaExceededError') {
      try {
        // Last resort: keep only the 50 most recent messages
        const critical = messages.slice(-50);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          messages: critical,
          savedAt: new Date().toISOString()
        }));
      } catch {
        // Storage completely unavailable
      }
    }
  }
}

/**
 * Load chat messages from localStorage
 * @returns {Array} - Array of message objects or empty array if none cached
 */
export function loadBuddyChatHistory() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return [];

    const parsed = JSON.parse(cached);
    if (!Array.isArray(parsed.messages)) return [];

    // Validate message structure
    return parsed.messages.filter(msg =>
      msg && typeof msg === 'object' && msg.role && msg.text
    );
  } catch {
    // Corrupted or missing cache
    return [];
  }
}

/**
 * Clear all cached chat history
 */
export function clearBuddyChatHistory() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Check if cached history exists
 * @returns {boolean}
 */
export function hasCachedChatHistory() {
  try {
    return localStorage.getItem(CACHE_KEY) !== null;
  } catch {
    return false;
  }
}
