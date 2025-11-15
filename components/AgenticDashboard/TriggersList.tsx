'use client';

import { Zap } from 'lucide-react';
import { Card, CardHeader, CardContent, EmptyState } from '../ui';
import { TriggerExecution } from '../../lib/hooks/useTriggerExecutions';

interface TriggersListProps {
  triggers: TriggerExecution[];
}

export function TriggersList({ triggers }: TriggersListProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-600" />
          Top Performing Triggers
        </h3>
      </CardHeader>
      <CardContent>
        {triggers.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No triggers configured yet"
            description="Create triggers to automate actions"
          />
        ) : (
          <div className="space-y-4">
            {triggers.map((trigger) => (
              <TriggerItem key={trigger.id} trigger={trigger} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TriggerItem({ trigger }: { trigger: TriggerExecution }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
      <div>
        <p className="font-medium text-slate-900">{trigger.name}</p>
        <p className="text-sm text-slate-600">
          {trigger.execution_count} executions • {(trigger.success_rate * 100).toFixed(1)}% success
        </p>
      </div>
      <div className="text-right">
        <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full"
            style={{ width: `${trigger.success_rate * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
