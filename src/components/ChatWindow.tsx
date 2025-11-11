import { useEffect, useState, useRef } from 'react';
import { api, Message, Conversation, Contact, Agent } from '../lib/api';
import { Send, Bot, User as UserIcon, Clock, UserPlus } from 'lucide-react';

interface ChatWindowProps {
  conversation: Conversation & { contact: Contact };
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadAgents();

    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const assignAgent = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          assigned_agent_id: agentId,
          status: 'agent_assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.id);

      if (error) throw error;
      setShowAssignMenu(false);
    } catch (error) {
      console.error('Error assigning agent:', error);
    }
  };

  const takeConversation = async () => {
    await assignAgent('system');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await api.post('/messages', {
        conversation_id: conversation.id,
        sender_type: 'agent',
        content: newMessage.trim(),
        message_type: 'text',
        delivery_status: 'sent',
      });

      await api.put(`/conversations/${conversation.id}`, {
        last_message_at: new Date().toISOString(),
        last_message_from: 'agent',
        status: 'agent_assigned',
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getSenderIcon = (senderType: string) => {
    if (senderType === 'ai') return <Bot className="w-4 h-4" />;
    if (senderType === 'customer') return <UserIcon className="w-4 h-4" />;
    return <UserIcon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {conversation.contact.name}
            </h2>
            <p className="text-sm text-slate-500">{conversation.contact.phone_number}</p>
            {conversation.contact.company && (
              <p className="text-sm text-slate-600 mt-1">{conversation.contact.company}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {conversation.assigned_agent_id ? (
              <div className="text-sm">
                <span className="text-slate-500">Assigned to: </span>
                <span className="font-medium text-slate-900">
                  {agents.find((a) => a.id === conversation.assigned_agent_id)?.full_name ||
                    'Agent'}
                </span>
              </div>
            ) : (
              <span className="text-sm text-orange-600 font-medium">Unassigned</span>
            )}
            <div className="relative">
              <button
                onClick={() => setShowAssignMenu(!showAssignMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Assign
              </button>
              {showAssignMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-10">
                  <button
                    onClick={takeConversation}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="font-medium text-slate-900">Assign to me</div>
                  </button>
                  <div className="border-t border-slate-200 my-2"></div>
                  {agents.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => assignAgent(a.id)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors"
                    >
                      <div className="font-medium text-slate-900">{a.full_name}</div>
                      <div className="text-xs text-slate-500">{a.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
        {messages.map((message) => {
          const isCustomer = message.sender_type === 'customer';
          const isAI = message.sender_type === 'ai';

          return (
            <div
              key={message.id}
              className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-md ${isCustomer ? 'order-2' : 'order-1'}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    isCustomer
                      ? 'bg-white text-slate-900'
                      : isAI
                      ? 'bg-blue-100 text-slate-900'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
                <div
                  className={`flex items-center gap-2 mt-1 text-xs text-slate-500 ${
                    isCustomer ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {getSenderIcon(message.sender_type)}
                  <span className="capitalize">
                    {message.sender_type === 'ai' ? 'AI Assistant' : message.sender_type}
                  </span>
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(message.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="bg-white border-t border-slate-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
