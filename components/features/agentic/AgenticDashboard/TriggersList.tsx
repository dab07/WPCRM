'use client';

import { Zap } from 'lucide-react';
import { EmptyState } from '../../../ui';
import { TriggerExecution } from '../../../../lib/hooks/useTriggerExecutions';

interface TriggersListProps {
  triggers: TriggerExecution[];
}

export function TriggersList({ triggers }: TriggersListProps) {
  return (
    <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px]">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[rgba(59,91,173,0.18)]">
        <Zap className="w-4 h-4 stroke-[1.5] text-brand-yellow" />
        <h3 className="font-heading font-semibold text-brand-offwhite text-sm tracking-tight">
          Top Performing Triggers
        </h3>
      </div>

      <div className="p-6">
        {triggers.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No triggers configured yet"
            description="Create triggers to automate actions"
          />
        ) : (
          <div className="space-y-3">
            {triggers.map((trigger) => (
              <TriggerItem key={trigger.id} trigger={trigger} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TriggerItem({ trigger }: { trigger: TriggerExecution }) {
  const pct = (trigger.success_rate * 100).toFixed(1);

  return (
    <div className="p-4 bg-brand-navy border border-[rgba(59,91,173,0.18)] rounded-[4px] hover:border-brand-yellow/40 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="font-heading font-semibold text-brand-offwhite text-[13px]">
          {trigger.name}
        </p>
        <span className="font-mono text-[11px] text-brand-yellow font-bold">{pct}%</span>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted mb-2">
        {trigger.execution_count} executions
      </p>
      <div className="progress-brand rounded-[2px]">
        <div
          className="progress-brand-fill rounded-[2px]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
