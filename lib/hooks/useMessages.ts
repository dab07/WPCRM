import { useState, useEffect, useCallback } from 'react';
import { serviceRegistry } from '../services';
import type { Message } from '../types/api/messages';

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      setError(null);
      const data = await serviceRegistry.conversations.getMessages(conversationId);
      setMessages(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [conversationId, loadMessages]);

  const sendMessage = async (content: string) => {
    try {
      await serviceRegistry.conversations.addMessage({
        conversation_id: conversationId,
        content: content.trim(),
        sender_type: 'agent' // Assuming agent is sending
      });
      await loadMessages();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { messages, loading, error, sendMessage, reload: loadMessages };
}
