'use client';

import { Workflow } from 'lucide-react';
import { EmptyState } from '../../../ui';
import { WorkflowExecution } from '../../../../lib/hooks/useWorkflowExecutions';
import { formatDateTime } from '../../../../lib/utils/date-formatting';

interface WorkflowsListProps {
  workflows: WorkflowExecution[];
}

export function WorkflowsList({ workflows }: WorkflowsListProps) {
  return (
    <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px]">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[rgba(59,91,173,0.18)]">
        <Workflow className="w-4 h-4 stroke-[1.5] text-brand-blue" />
        <h3 className="font-heading font-semibold text-brand-offwhite text-sm tracking-tight">
          Recent Workflow Executions
        </h3>
      </div>

      <div className="p-6">
        {workflows.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="No workflow executions yet"
            description="Connect n8n to see workflow activity"
          />
        ) : (
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <WorkflowItem key={workflow.id} workflow={workflow} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowItem({ workflow }: { workflow: WorkflowExecution }) {
  const statusStyle = {
    completed: 'border-green-500/40 text-green-400 bg-green-500/10',
    running:   'border-brand-blue/40 text-brand-offwhite bg-brand-blue/20',
    failed:    'border-red-500/40 text-red-400 bg-red-500/10',
  }[workflow.status] ?? 'border-brand-muted/30 text-brand-muted bg-brand-muted/10';

  return (
    <div className="p-4 bg-brand-navy border border-[rgba(59,91,173,0.18)] rounded-[4px] flex items-center justify-between hover:border-brand-yellow/40 transition-colors">
      <div>
        <p className="font-heading font-semibold text-brand-offwhite text-[13px]">
          {workflow.workflow_name}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted mt-1">
          {formatDateTime(workflow.started_at)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`font-mono text-[10px] uppercase tracking-label px-2 py-0.5 border rounded-[4px] ${statusStyle}`}
        >
          {workflow.status}
        </span>
        {workflow.execution_time_ms && (
          <span className="font-mono text-[11px] text-brand-muted">
            {workflow.execution_time_ms}ms
          </span>
        )}
      </div>
    </div>
  );
}
