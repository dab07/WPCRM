import { useState, useEffect } from 'react';
import { api, Trigger } from '../api';

export function useTriggers() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTriggers = async () => {
    try {
      setError(null);
      const data = await api.get('/triggers');
      setTriggers(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading triggers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTriggers();
  }, []);

  const createTrigger = async (triggerData: Partial<Trigger>) => {
    try {
      await api.post('/triggers', triggerData);
      await loadTriggers();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateTrigger = async (id: string, updates: Partial<Trigger>) => {
    try {
      await api.put(`/triggers/${id}`, updates);
      await loadTriggers();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteTrigger = async (id: string) => {
    try {
      await api.delete(`/triggers/${id}`);
      await loadTriggers();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { triggers, loading, error, createTrigger, updateTrigger, deleteTrigger, reload: loadTriggers };
}
