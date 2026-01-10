import { useState, useEffect } from 'react';
import { serviceRegistry } from '../services';
import type { Conversation } from '../types/api/conversations';
import type { Contact } from '../types/api/contacts';

export type ConversationWithContact = Conversation & { contact: Contact | null };

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadConversations = async () => {
    try {
      setError(null);
      // Use a direct Supabase query to get conversations with contact data
      const { data, error } = await serviceRegistry.conversations['supabase']
        .from('conversations')
        .select(`
          *,
          contact:contacts(*)
        `)
        .order('last_message_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the data to match our expected structure
      const conversationsWithContacts = (data || []).map(conv => ({
        ...conv,
        contact: conv.contact || {
          id: '',
          name: 'Unknown Contact',
          phone_number: 'Unknown',
          email: null,
          company: null,
          tags: [],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }));

      setConversations(conversationsWithContacts as ConversationWithContact[]);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading conversations:', err);
      // Set empty array on error to prevent crashes
      setConversations([]);
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
