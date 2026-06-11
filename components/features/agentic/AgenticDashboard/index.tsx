'use client';

import { useState } from 'react';
import {
  Brain, Bot, Workflow, Zap,
  MessageSquare, Target, Users, Settings,
} from 'lucide-react';
import { useAgenticMetrics } from '../../../../lib/hooks/useAgenticMetrics';
import { useWorkflowExecutions } from '../../../../lib/hooks/useWorkflowExecutions';
import { useTriggerExecutions } from '../../../../lib/hooks/useTriggerExecutions';
import { LoadingSpinner, Button } from '../../../ui';
import { MetricCard } from './MetricCard';
import { TriggersList } from './TriggersList';
import { WorkflowsList } from './WorkflowsList';
import { AIAgentsStatus } from './AIAgentsStatus';
import { ConfigureAIModal } from './ConfigureAIModal';

export function AgenticDashboard() {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const { metrics, loading: metricsLoading } = useAgenticMetrics();
  const { workflows } = useWorkflowExecutions(10);
  const { triggers } = useTriggerExecutions(10);

  if (metricsLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <LoadingSpinner message="Loading agentic AI dashboard..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 w-full h-full overflow-y-auto bg-brand-navy">
      <DashboardHeader onConfigureClick={() => setIsConfigModalOpen(true)} />
      <MetricsGrid metrics={metrics} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TriggersList triggers={triggers} />
        <WorkflowsList workflows={workflows} />
      </div>
      <AIAgentsStatus />
      <ConfigureAIModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
}

function DashboardHeader({ onConfigureClick }: { onConfigureClick: () => void }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        {/* Eyebrow */}
        <p className="label-eyebrow mb-2">Automation Intelligence</p>
        <h1 className="font-display font-bold text-brand-offwhite text-[26px] tracking-tighter flex items-center gap-3">
          <Brain className="w-7 h-7 stroke-[1.5] text-brand-yellow shrink-0" />
          Agentic AI Dashboard
        </h1>
        <p className="font-body text-brand-muted text-[13px] mt-1">
          Monitor autonomous AI agents and workflow automation
        </p>
      </div>
      <Button icon={Settings} variant="ghost" size="sm" onClick={onConfigureClick}>
        Configure AI
      </Button>
    </div>
  );
}

function MetricsGrid({ metrics }: { metrics: any }) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard
        title="AI Automation Rate"
        value={`${metrics.ai_handled_percentage.toFixed(1)}%`}
        icon={Bot}
        trend={{ value: '+12% from last week', positive: true }}
      />
      <MetricCard
        title="Active Workflows"
        value={metrics.active_workflows}
        icon={Workflow}
        subtitle={`Across ${metrics.total_conversations} conversations`}
      />
      <MetricCard
        title="Triggers Today"
        value={metrics.triggers_activated_today}
        icon={Zap}
        subtitle="Automated actions executed"
      />
      <MetricCard
        title="Avg Response Time"
        value={`${metrics.average_response_time}s`}
        icon={MessageSquare}
        trend={{ value: '-0.8s improvement', positive: true }}
      />
      <MetricCard
        title="Customer Satisfaction"
        value={`${metrics.customer_satisfaction}/5`}
        icon={Target}
        subtitle="Based on AI interactions"
      />
      <MetricCard
        title="Total Conversations"
        value={metrics.total_conversations}
        icon={Users}
        subtitle="Active customer interactions"
      />
    </div>
  );
}
