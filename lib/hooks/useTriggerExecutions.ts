import { useState, useEffect } from 'react';
import { api } from '../api';

export interface TriggerExecution {
  id: string;
  name: string;
  execution_count: number;
  success_rate: number;
  last_executed?: string;
}

export function useTriggerExecutions(limit: number = 10) {
  const [triggers, setTriggers] = useState<TriggerExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTriggers = async () => {
    try {
      setError(null);
      const data = await api.get(`/triggers?is_active=true&limit=${limit}`);
      setTriggers(data || []);
    } catch (err) {
      console.log('Triggers table not available:', err);
      setTriggers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTriggers();
  }, [limit]);

  return { triggers, loading, error, reload: loadTriggers };
}
