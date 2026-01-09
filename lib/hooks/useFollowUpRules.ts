import { useState, useEffect } from 'react';
import { serviceRegistry } from '../services';
import type { FollowUpRule, CreateFollowUpRuleRequest, UpdateFollowUpRuleRequest } from '../services/automation/FollowUpRulesService';

export function useFollowUpRules() {
  const [rules, setRules] = useState<FollowUpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadRules = async () => {
    try {
      setError(null);
      const data = await serviceRegistry.followUpRules.list();
      setRules(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading follow-up rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const createRule = async (ruleData: CreateFollowUpRuleRequest) => {
    try {
      await serviceRegistry.followUpRules.create(ruleData);
      await loadRules();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateRule = async (id: string, updates: UpdateFollowUpRuleRequest) => {
    try {
      await serviceRegistry.followUpRules.update(id, updates);
      await loadRules();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await serviceRegistry.followUpRules.delete(id);
      await loadRules();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const activateRule = async (id: string) => {
    try {
      await serviceRegistry.followUpRules.activateRule(id);
      await loadRules();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deactivateRule = async (id: string) => {
    try {
      await serviceRegistry.followUpRules.deactivateRule(id);
      await loadRules();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const triggerFollowUps = async () => {
    try {
      return await serviceRegistry.followUpRules.triggerFollowUps();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { 
    rules, 
    loading, 
    error, 
    createRule, 
    updateRule, 
    deleteRule, 
    activateRule,
    deactivateRule,
    triggerFollowUps,
    reload: loadRules 
  };
}