'use client';

import { Workflow } from 'lucide-react';
import { Card, CardHeader, CardContent, EmptyState } from '../ui';
import { WorkflowExecution } from '../../lib/hooks/useWorkflowExecutions';

interface WorkflowsListProps {
  workflows: WorkflowExecution[];
}

export function WorkflowsList({ workflows }: WorkflowsListProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Workflow className="w-5 h-5 text-purple-600" />
          Recent Workflow Executions
        </h3>
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="No workflow executions yet"
            description="Connect n8n to see workflow activity"
          />
        ) : (
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <WorkflowItem key={workflow.id} workflow={workflow} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkflowItem({ workflow }: { workflow: WorkflowExecution }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
      <div>
        <p className="font-medium text-slate-900">{workflow.workflow_name}</p>
        <p className="text-sm text-slate-600">
          {new Date(workflow.started_at).toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
          {workflow.status}
        </span>
        {workflow.execution_time_ms && (
          <span className="text-sm text-slate-500">{workflow.execution_time_ms}ms</span>
        )}
      </div>
    </div>
  );
}
