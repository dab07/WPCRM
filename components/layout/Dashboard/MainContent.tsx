'use client';

import { AgenticDashboard } from '../../features/agentic/AgenticDashboard';
import { ContactsPanel } from '../../features/contacts/ContactsPanel';
import { CampaignsPanel } from '../../features/campaigns';
import { FollowUpRulesPanel } from '../../features/workflows/FollowUpRulesPanel';
import { TriggerManagement } from '../../features/workflows/TriggerManagement';
import { N8nIntegration } from '../../features/workflows/N8nIntegration';
import { InstagramIntegration } from '../../features/workflows/InstagramIntegration';
import { ConversationsView } from './ConversationsView';
import type { Tab } from './types';
import type { ConversationWithContact } from '../../../lib/hooks/useConversations';

interface MainContentProps {
  activeTab: Tab;
  selectedConversation: ConversationWithContact | null;
  onSelectConversation: (conv: ConversationWithContact | null) => void;
}

export function MainContent({
  activeTab,
  selectedConversation,
  onSelectConversation,
}: MainContentProps) {
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
      {activeTab === 'instagram' && <InstagramIntegration />}
      {activeTab === 'follow-ups' && <FollowUpRulesPanel />}
    </main>
  );
}