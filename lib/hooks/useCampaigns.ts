import { useState, useEffect } from 'react';
import { serviceRegistry } from '../services';
import type { Campaign, CreateCampaignRequest } from '../types/api/campaigns';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCampaigns = async () => {
    try {
      setError(null);
      const data = await serviceRegistry.campaigns.list();
      setCampaigns(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const createCampaign = async (campaignData: CreateCampaignRequest) => {
    try {
      await serviceRegistry.campaigns.create(campaignData);
      await loadCampaigns();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const executeCampaign = async (campaignId: string) => {
    try {
      await serviceRegistry.campaigns.startCampaign(campaignId);
      await loadCampaigns();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { campaigns, loading, error, createCampaign, executeCampaign, reload: loadCampaigns };
}
