'use client';

import { useState } from 'react';
import { Conversation, Contact } from '../../lib/api';
import { useMessages } from '../../lib/hooks';
import { LoadingSpinner } from '../ui';
import ChatHeader from './ChatHeader.tsx';
import MessageList from './MessageList.tsx';
import MessageInput from './MessageInput.tsx';

interface ChatWindowProps {
  conversation: Conversation & { contact: Contact };
}

function ChatWindow({ conversation }: ChatWindowProps) {
  const { messages, loading, sendMessage } = useMessages(conversation.id);
  const [sending, setSending] = useState(false);

  const handleSend = async (content: string) => {
    setSending(true);
    try {
      await sendMessage(content);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading messages..." />;
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversation={conversation} />
      <MessageList messages={messages} />
      <MessageInput onSend={handleSend} disabled={sending} />
    </div>
  );
}

export { ChatWindow };
