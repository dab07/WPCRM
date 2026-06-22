'use client';

import { AgenticDashboard } from '../../features/agentic/AgenticDashboard';
import { ContactsPanel } from '../../features/contacts/ContactsPanel';
import { CampaignsPanel } from '../../features/campaigns';
import { IntegrationsPanel } from '../../features/integrations/IntegrationsPanel';
import { IntelligentPanel } from '../../features/intelligent/IntelligentPanel';
import type { Tab } from './types';

interface MainContentProps {
  activeTab: Tab;
}

export function MainContent({ activeTab }: MainContentProps) {
  return (
    <main className="flex-1 flex overflow-hidden bg-brand-navy">
      {activeTab === 'agentic' && <AgenticDashboard />}
      {activeTab === 'intelligent' && <IntelligentPanel />}
      {activeTab === 'contacts' && <ContactsPanel />}
      {activeTab === 'campaigns' && <CampaignsPanel />}
      {activeTab === 'integrations' && <IntegrationsPanel />}
    </main>
  );
}
