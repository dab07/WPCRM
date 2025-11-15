'use client';

import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { Conversation, Contact, Agent, api } from '../../lib/api';

interface ChatHeaderProps {
  conversation: Conversation & { contact: Contact };
}

export default function ChatHeader({ conversation }: ChatHeaderProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAssignMenu, setShowAssignMenu] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await api.get('/agents?is_active=true');
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const assignAgent = async (agentId: string) => {
    try {
      await api.put(`/conversations/${conversation.id}`, {
        assigned_agent_id: agentId,
        status: 'agent_assigned',
        updated_at: new Date().toISOString(),
      });
      setShowAssignMenu(false);
    } catch (error) {
      console.error('Error assigning agent:', error);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{conversation.contact.name}</h2>
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
                {agents.find((a) => a.id === conversation.assigned_agent_id)?.full_name || 'Agent'}
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
                  onClick={() => assignAgent('system')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="font-medium text-slate-900">Assign to me</div>
                </button>
                <div className="border-t border-slate-200 my-2"></div>
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => assignAgent(agent.id)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="font-medium text-slate-900">{agent.full_name}</div>
                    <div className="text-xs text-slate-500">{agent.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
