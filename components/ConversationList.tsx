import { useEffect, useState } from 'react';
import { api, Conversation, Contact } from '../lib/api';
import { MessageSquare, Clock, User } from 'lucide-react';

interface ConversationWithContact extends Conversation {
  contact: Contact;
}

interface ConversationListProps {
  selectedId?: string;
  onSelect: (conversation: ConversationWithContact) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationWithContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();

    // Poll for conversation updates every 5 seconds
    const interval = setInterval(() => {
      loadConversations();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadConversations = async () => {
    try {
      const data = await api.get('/conversations');
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'ai_handled':
        return 'bg-blue-100 text-blue-700';
      case 'agent_assigned':
        return 'bg-orange-100 text-orange-700';
      case 'closed':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 px-4">
          <MessageSquare className="w-12 h-12 mb-2" />
          <p>No conversations yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                selectedId === conv.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{conv.contact.name}</h3>
                    <p className="text-xs text-slate-500">{conv.contact.phone_number}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(conv.last_message_at)}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                      conv.status
                    )}`}
                  >
                    {conv.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {conv.contact.company && (
                <p className="text-sm text-slate-600 mb-1">{conv.contact.company}</p>
              )}

              {conv.contact.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {conv.contact.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
