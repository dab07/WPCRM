'use client';

import { useEffect, useRef } from 'react';
import { Message } from '../../lib/api';
import { Bot, User, Clock } from 'lucide-react';
import { formatTime } from '../../lib/utils';

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isCustomer = message.sender_type === 'customer';
  const isAI = message.sender_type === 'ai';

  const getSenderIcon = () => {
    if (isAI) return <Bot className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const getBubbleColor = () => {
    if (isCustomer) return 'bg-white text-slate-900';
    if (isAI) return 'bg-blue-100 text-slate-900';
    return 'bg-blue-600 text-white';
  };

  return (
    <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-md ${isCustomer ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-2xl px-4 py-3 ${getBubbleColor()}`}>
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        <div
          className={`flex items-center gap-2 mt-1 text-xs text-slate-500 ${
            isCustomer ? 'justify-start' : 'justify-end'
          }`}
        >
          {getSenderIcon()}
          <span className="capitalize">
            {isAI ? 'AI Assistant' : message.sender_type}
          </span>
          <Clock className="w-3 h-3" />
          <span>{formatTime(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
