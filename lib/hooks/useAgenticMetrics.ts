import { useState, useEffect } from 'react';

export interface AgentMetrics {
  total_conversations: number;
  ai_handled_percentage: number;
  average_response_time: number;
  customer_satisfaction: number;
  active_workflows: number;
  triggers_activated_today: number;
}

export function useAgenticMetrics() {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMetrics = async () => {
    try {
      setError(null);

      setMetrics({
        total_conversations: 0,
        ai_handled_percentage: 100,
        average_response_time: 2.3,
        customer_satisfaction: 4.2,
        active_workflows: 0,
        triggers_activated_today: 0,
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  return { metrics, loading, error, reload: loadMetrics };
}
