import { useState, useEffect } from 'react';
import { api, Trigger } from '../api-client';

export function useTriggers() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTriggers = async () => {
    try {
      setError(null);
      const data = await api.triggers.list();
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
      await api.triggers.create(triggerData);
      await loadTriggers();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateTrigger = async (id: string, updates: Partial<Trigger>) => {
    try {
      await api.triggers.update(id, updates);
      await loadTriggers();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteTrigger = async (id: string) => {
    try {
      await api.triggers.delete(id);
      await loadTriggers();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { triggers, loading, error, createTrigger, updateTrigger, deleteTrigger, reload: loadTriggers };
}
