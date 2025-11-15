import { useState, useEffect } from 'react';
import { api, Message } from '../api';

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMessages = async () => {
    try {
      setError(null);
      const data = await api.get(`/messages?conversation_id=${conversationId}`);
      setMessages(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const sendMessage = async (content: string) => {
    try {
      await api.post('/messages', {
        conversation_id: conversationId,
        sender_type: 'agent',
        content: content.trim(),
        message_type: 'text',
        delivery_status: 'sent',
      });

      await api.put(`/conversations/${conversationId}`, {
        last_message_at: new Date().toISOString(),
        last_message_from: 'agent',
        status: 'agent_assigned',
      });

      await loadMessages();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { messages, loading, error, sendMessage, reload: loadMessages };
}
