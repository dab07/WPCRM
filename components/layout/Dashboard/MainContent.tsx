'use client';

import { AgenticDashboard } from '../../features/agentic/AgenticDashboard';
import { ContactsPanel } from '../../features/contacts/ContactsPanel';
import { CampaignsPanel } from '../../features/campaigns';
import { N8nIntegration } from '../../features/workflows/N8nIntegration';
import { InstagramIntegration } from '../../features/workflows/InstagramIntegration';
import { ShopifyPanel } from '../../features/shopify';
import { IntegrationsPanel } from '../../features/settings/IntegrationsPanel';
import type { Tab } from './types';

interface MainContentProps {
  activeTab: Tab;
}

export function MainContent({ activeTab }: MainContentProps) {
  return (
    <main className="flex-1 flex overflow-hidden bg-brand-navy">
      {activeTab === 'agentic'      && <AgenticDashboard />}
      {activeTab === 'contacts'     && <ContactsPanel />}
      {activeTab === 'campaigns'    && <CampaignsPanel />}
      {activeTab === 'shopify'      && <ShopifyPanel />}
      {activeTab === 'workflows'    && <N8nIntegration />}
      {activeTab === 'instagram'    && <InstagramIntegration />}
      {activeTab === 'integrations' && <IntegrationsPanel />}
    </main>
  );
}
