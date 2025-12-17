import { useState, useEffect } from 'react';
import { api } from '../api-client';

export interface WorkflowExecution {
  id: string;
  workflow_name: string;
  status: string;
  started_at: string;
  execution_time_ms?: number;
}

export function useWorkflowExecutions(limit: number = 10) {
  const [workflows, setWorkflows] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadWorkflows = async () => {
    try {
      setError(null);
      const data = await api.workflowExecutions.list();
      setWorkflows((data || []).slice(0, limit) as WorkflowExecution[]);
    } catch (err) {
      console.log('Workflow executions table not available:', err);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, [limit, loadWorkflows]);

  return { workflows, loading, error, reload: loadWorkflows };
}
