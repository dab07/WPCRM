'use client';

import { useState } from 'react';

import { DashboardHeader } from './Dashboard/DashboardHeader';
import { Sidebar } from './Dashboard/Sidebar';
import { MainContent } from './Dashboard/MainContent';
import type { Tab } from './Dashboard/types';
import type { ConversationWithContact } from '../../lib/hooks/useConversations';

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
