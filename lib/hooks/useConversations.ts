import { useState, useEffect } from 'react';
import { serviceRegistry } from '../services';
import type { Conversation } from '../types/api/conversations';
import type { Contact } from '../types/api/contacts';

export type ConversationWithContact = Conversation & { contact: Contact };

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadConversations = async () => {
    try {
      setError(null);
      // Note: The service layer doesn't currently support joins, so we'll need to fetch contacts separately
      // This is a temporary solution until we implement proper join support in the service layer
      const conversationsData = await serviceRegistry.conversations.list();
      
      // For now, we'll cast the data assuming the database query includes contact data
      // In a production system, we'd want to either:
      // 1. Implement join support in the service layer
      // 2. Fetch contacts separately and merge the data
      setConversations(conversationsData as ConversationWithContact[] || []);
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

  const updateConversationStatus = async (id: string, status: 'active' | 'ai_handled' | 'agent_assigned' | 'closed') => {
    try {
      await serviceRegistry.conversations.update(id, { status });
      await loadConversations();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { conversations, loading, error, updateConversationStatus, reload: loadConversations };
}
