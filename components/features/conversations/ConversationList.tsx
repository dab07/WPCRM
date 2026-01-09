'use client';

import { MessageSquare, Clock, User } from 'lucide-react';

import { useConversations } from '../../../lib/hooks';
import { LoadingSpinner, EmptyState, StatusBadge } from '../../ui';
import { formatRelativeTime } from '../../../lib/utils/formatting';
import type { ConversationWithContact } from '../../../lib/hooks/useConversations';

interface ConversationListProps {
  selectedId?: string;
  onSelect: (conversation: ConversationWithContact) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { conversations, loading } = useConversations();

  if (loading) {
    return <LoadingSpinner message="Loading conversations..." />;
  }

  if (conversations.length === 0) {
    return <EmptyState icon={MessageSquare} title="No conversations yet" />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="divide-y divide-slate-200">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isSelected={selectedId === conv.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: ConversationWithContact;
  isSelected: boolean;
  onSelect: (conv: ConversationWithContact) => void;
}) {
  return (
    <button
      onClick={() => onSelect(conversation)}
      className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{conversation.contact.name}</h3>
            <p className="text-xs text-slate-500">{conversation.contact.phone_number}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {conversation.last_message_at ? formatRelativeTime(conversation.last_message_at) : 'No messages'}
          </span>
          <StatusBadge status={conversation.status} variant="conversation" />
        </div>
      </div>

      {conversation.contact.company && (
        <p className="text-sm text-slate-600 mb-1">{conversation.contact.company}</p>
      )}

      {conversation.contact.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {conversation.contact.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
