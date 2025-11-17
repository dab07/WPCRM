import { useState, useEffect } from 'react';
import { api } from '../api-client';

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
      const data = await api.triggers.list();
      const activeTriggers = (data || [])
        .filter((t: any) => t.is_active)
        .slice(0, limit)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          execution_count: 0, // Would need separate execution tracking
          success_rate: 100,
          last_executed: t.created_at,
        }));
      setTriggers(activeTriggers);
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
