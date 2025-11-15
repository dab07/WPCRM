'use client';

import { useState } from 'react';
import { Send, Plus } from 'lucide-react';
import { useCampaigns } from '../../lib/hooks';
import { Button, LoadingSpinner, EmptyState } from '../ui';
import { CampaignCard } from './CampaignCard';
import { CreateCampaignModal } from './CreateCampaignModal';

export function CampaignsPanel() {
  const { campaigns, loading, reload } = useCampaigns();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (loading) {
    return <LoadingSpinner message="Loading campaigns..." />;
  }

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Campaigns</h2>
          <p className="text-slate-600">Schedule and manage your WhatsApp campaigns</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
          Create Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No campaigns yet"
          description="Create your first campaign to reach your customers"
          action={
            <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
              Create Campaign
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}

      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={reload}
      />
    </div>
  );
}
