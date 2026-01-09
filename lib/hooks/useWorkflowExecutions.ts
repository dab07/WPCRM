import { useState, useEffect, useCallback } from 'react';
import { serviceRegistry } from '../services';

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

  const loadWorkflows = useCallback(async () => {
    try {
      setError(null);
      const data = await serviceRegistry.workflowExecutions.list({
        pageSize: limit,
        page: 1
      });
      setWorkflows((data || []) as WorkflowExecution[]);
    } catch (err) {
      console.log('Workflow executions table not available:', err);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  return { workflows, loading, error, reload: loadWorkflows };
}
