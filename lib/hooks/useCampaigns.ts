import { useState, useEffect } from 'react';
import { api, Campaign } from '../api-client';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCampaigns = async () => {
    try {
      setError(null);
      const data = await api.campaigns.list();
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

  const createCampaign = async (campaignData: Partial<Campaign>) => {
    try {
      await api.campaigns.create(campaignData);
      await loadCampaigns();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const executeCampaign = async (campaignId: string) => {
    try {
      await api.campaigns.execute(campaignId);
      await loadCampaigns();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { campaigns, loading, error, createCampaign, executeCampaign, reload: loadCampaigns };
}
