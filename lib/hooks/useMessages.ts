import { useState, useEffect } from 'react';
import { api, Message } from '../api-client';

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMessages = async () => {
    try {
      setError(null);
      const data = await api.messages.list(conversationId);
      setMessages(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const sendMessage = async (content: string) => {
    try {
      await api.messages.send(conversationId, content.trim());
      await loadMessages();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { messages, loading, error, sendMessage, reload: loadMessages };
}
