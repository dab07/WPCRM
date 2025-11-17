'use client';

import { useState } from 'react';
import { Brain, Bot, Workflow, Zap, MessageSquare, Target, Users, Settings } from 'lucide-react';
import { useAgenticMetrics } from '../../lib/hooks/useAgenticMetrics';
import { useWorkflowExecutions } from '../../lib/hooks/useWorkflowExecutions';
import { useTriggerExecutions } from '../../lib/hooks/useTriggerExecutions';
import { LoadingSpinner, Button } from '../ui';
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
    return <LoadingSpinner message="Loading agentic AI dashboard..." />;
  }

  return (
    <div className="p-6 space-y-6 w-full">
      <DashboardHeader onConfigureClick={() => setIsConfigModalOpen(true)} />
      <MetricsGrid metrics={metrics} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TriggersList triggers={triggers} />
        <WorkflowsList workflows={workflows} />
      </div>
      <AIAgentsStatus />
      <ConfigureAIModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />
    </div>
  );
}

function DashboardHeader({ onConfigureClick }: { onConfigureClick: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Brain className="w-8 h-8 text-blue-600" />
          Agentic AI Dashboard
        </h1>
        <p className="text-slate-600 mt-1">Monitor autonomous AI agents and workflow automation</p>
      </div>
      <Button icon={Settings} onClick={onConfigureClick}>
        Configure AI
      </Button>
    </div>
  );
}

function MetricsGrid({ metrics }: { metrics: any }) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <MetricCard
        title="AI Automation Rate"
        value={`${metrics.ai_handled_percentage.toFixed(1)}%`}
        icon={Bot}
        iconColor="bg-blue-100 text-blue-600"
        trend={{ value: '+12% from last week', positive: true }}
      />
      <MetricCard
        title="Active Workflows"
        value={metrics.active_workflows}
        icon={Workflow}
        iconColor="bg-purple-100 text-purple-600"
        subtitle={`Across ${metrics.total_conversations} conversations`}
      />
      <MetricCard
        title="Triggers Today"
        value={metrics.triggers_activated_today}
        icon={Zap}
        iconColor="bg-orange-100 text-orange-600"
        subtitle="Automated actions executed"
      />
      <MetricCard
        title="Avg Response Time"
        value={`${metrics.average_response_time}s`}
        icon={MessageSquare}
        iconColor="bg-green-100 text-green-600"
        trend={{ value: '-0.8s improvement', positive: true }}
      />
      <MetricCard
        title="Customer Satisfaction"
        value={`${metrics.customer_satisfaction}/5`}
        icon={Target}
        iconColor="bg-yellow-100 text-yellow-600"
        subtitle="Based on AI interactions"
      />
      <MetricCard
        title="Total Conversations"
        value={metrics.total_conversations}
        icon={Users}
        iconColor="bg-indigo-100 text-indigo-600"
        subtitle="Active customer interactions"
      />
    </div>
  );
}
