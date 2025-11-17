import { useState, useEffect } from 'react';
import { api, ConversationWithContact } from '../api-client';

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadConversations = async () => {
    try {
      setError(null);
      const data = await api.conversations.list();
      setConversations(data as ConversationWithContact[] || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  return { conversations, loading, error, reload: loadConversations };
}
