'use client';

import { MessageSquare } from 'lucide-react';

import { ConversationList } from '../../features/conversations/ConversationList';
import { ChatWindow } from '../../features/conversations/ChatWindow';
import { EmptyState } from '../../ui';
import type { ConversationWithContact } from '../../../lib/hooks/useConversations';

interface ConversationsViewProps {
  selectedConversation: ConversationWithContact | null;
  onSelectConversation: (conv: ConversationWithContact) => void;
}

export function ConversationsView({
  selectedConversation,
  onSelectConversation,
}: ConversationsViewProps) {
  return (
    <>
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Conversations</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            {...(selectedConversation?.id && { selectedId: selectedConversation.id })}
            onSelect={onSelectConversation}
          />
        </div>
      </div>

      <div className="flex-1 bg-slate-50">
        {selectedConversation ? (
          <ChatWindow conversation={selectedConversation} />
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="Select a conversation to start chatting"
          />
        )}
      </div>
    </>
  );
}