'use client';

import { AgenticDashboard } from '../../features/agentic/AgenticDashboard';
import { ContactsPanel } from '../../features/contacts/ContactsPanel';
import { CampaignsPanel } from '../../features/campaigns';
import { ShopifyPanel } from '../../features/shopify';
import { IntegrationsPanel } from '../../features/integrations/IntegrationsPanel';
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
      {activeTab === 'integrations' && <IntegrationsPanel />}
    </main>
  );
}
