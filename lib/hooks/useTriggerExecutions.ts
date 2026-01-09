import { useState, useEffect, useCallback } from 'react';
import { serviceRegistry } from '../services';

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

  const loadTriggers = useCallback(async () => {
    try {
      setError(null);
      const data = await serviceRegistry.triggers.getActiveTriggers();
      const activeTriggers = (data || [])
        .slice(0, limit)
        .map((t) => ({
          id: t.id,
          name: t.name,
          execution_count: t.execution_count || 0,
          success_rate: 100, // Would need separate execution tracking for actual success rate
          last_executed: t.created_at,
        }));
      setTriggers(activeTriggers);
    } catch (err) {
      console.log('Triggers table not available:', err);
      setTriggers([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadTriggers();
  }, [loadTriggers]);

  return { triggers, loading, error, reload: loadTriggers };
}
