'use client';

import { useState } from 'react';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { ContactsPanel } from './ContactsPanel';
import { CampaignsPanel } from './CampaignsPanel';
import { FollowUpRulesPanel } from './FollowUpRulesPanel';
import { AgenticDashboard } from './AgenticDashboard/index';
import { TriggerManagement } from './TriggerManagement';
import { N8nIntegration } from './N8nIntegration';
import { MessageSquare, Users, Send, Clock, Bot, Brain, Zap, Workflow } from 'lucide-react';
import { ConversationWithContact } from '../lib/api';
import { EmptyState } from './ui';

type Tab = 'agentic' | 'conversations' | 'contacts' | 'campaigns' | 'follow-ups' | 'triggers' | 'workflows';

const TABS = [
  { id: 'agentic' as Tab, label: 'Agentic AI', icon: Brain },
  { id: 'conversations' as Tab, label: 'Conversations', icon: MessageSquare },
  { id: 'contacts' as Tab, label: 'Contacts', icon: Users },
  { id: 'campaigns' as Tab, label: 'Campaigns', icon: Send },
  { id: 'triggers' as Tab, label: 'Triggers', icon: Zap },
  { id: 'workflows' as Tab, label: 'Workflows', icon: Workflow },
  { id: 'follow-ups' as Tab, label: 'Follow-ups', icon: Clock },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('agentic');
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithContact | null>(null);

  const handleTabChange = (tabId: Tab) => {
    setActiveTab(tabId);
    if (tabId !== 'conversations') {
      setSelectedConversation(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <DashboardHeader />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <MainContent
          activeTab={activeTab}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
        />
      </div>
    </div>
  );
}

function DashboardHeader() {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">WhatsApp CRM</h1>
            <p className="text-sm text-slate-500">AI-powered customer management</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  return (
    <nav className="w-64 bg-white border-r border-slate-200 p-4">
      <div className="space-y-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MainContent({
  activeTab,
  selectedConversation,
  onSelectConversation,
}: {
  activeTab: Tab;
  selectedConversation: ConversationWithContact | null;
  onSelectConversation: (conv: ConversationWithContact | null) => void;
}) {
  return (
    <main className="flex-1 flex overflow-hidden">
      {activeTab === 'agentic' && <AgenticDashboard />}
      {activeTab === 'conversations' && (
        <ConversationsView
          selectedConversation={selectedConversation}
          onSelectConversation={onSelectConversation}
        />
      )}
      {activeTab === 'contacts' && <ContactsPanel />}
      {activeTab === 'campaigns' && <CampaignsPanel />}
      {activeTab === 'triggers' && <TriggerManagement />}
      {activeTab === 'workflows' && <N8nIntegration />}
      {activeTab === 'follow-ups' && <FollowUpRulesPanel />}
    </main>
  );
}

function ConversationsView({
  selectedConversation,
  onSelectConversation,
}: {
  selectedConversation: ConversationWithContact | null;
  onSelectConversation: (conv: ConversationWithContact) => void;
}) {
  return (
    <>
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Conversations</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            selectedId={selectedConversation?.id}
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
