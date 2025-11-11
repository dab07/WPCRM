import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Bot, 
  Zap, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Target,
  Brain,
  Workflow,
  BarChart3,
  Settings
} from 'lucide-react';

interface AgentMetrics {
  total_conversations: number;
  ai_handled_percentage: number;
  average_response_time: number;
  customer_satisfaction: number;
  active_workflows: number;
  triggers_activated_today: number;
}

interface TriggerExecution {
  id: string;
  name: string;
  execution_count: number;
  success_rate: number;
  last_executed: string;
}

interface WorkflowExecution {
  id: string;
  workflow_name: string;
  status: string;
  started_at: string;
  execution_time_ms: number;
}

export function AgenticDashboard() {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [triggers, setTriggers] = useState<TriggerExecution[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load metrics
      const metricsData = await loadMetrics();
      setMetrics(metricsData);

      // Load trigger executions
      const { data: triggerData } = await supabase
        .from('triggers')
        .select('*')
        .eq('is_active', true)
        .order('execution_count', { ascending: false })
        .limit(10);
      
      setTriggers(triggerData || []);

      // Load recent workflow executions
      const { data: workflowData } = await supabase
        .from('workflow_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      
      setWorkflows(workflowData || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async (): Promise<AgentMetrics> => {
    const today = new Date().toISOString().split('T')[0];

    // Get conversation metrics
    const { data: conversations } = await supabase
      .from('conversations')
      .select('status, ai_confidence_score, created_at');

    const totalConversations = conversations?.length || 0;
    const aiHandled = conversations?.filter(c => c.status === 'ai_handled').length || 0;
    const aiHandledPercentage = totalConversations > 0 ? (aiHandled / totalConversations) * 100 : 0;

    // Get workflow metrics
    const { data: activeWorkflows } = await supabase
      .from('workflow_executions')
      .select('id')
      .eq('status', 'running');

    // Get trigger metrics for today
    const { data: triggerExecutions } = await supabase
      .from('triggers')
      .select('execution_count')
      .gte('updated_at', today);

    const triggersActivatedToday = triggerExecutions?.reduce((sum, t) => sum + t.execution_count, 0) || 0;

    return {
      total_conversations: totalConversations,
      ai_handled_percentage: aiHandledPercentage,
      average_response_time: 2.3, // This would be calculated from actual data
      customer_satisfaction: 4.2, // This would come from feedback data
      active_workflows: activeWorkflows?.length || 0,
      triggers_activated_today: triggersActivatedToday
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading agentic AI dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-600" />
            Agentic AI Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Monitor autonomous AI agents and workflow automation
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Settings className="w-4 h-4" />
          Configure AI
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">AI Automation Rate</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {metrics?.ai_handled_percentage.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+12% from last week</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Workflows</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {metrics?.active_workflows}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Workflow className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-600">Across {metrics?.total_conversations} conversations</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Triggers Today</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {metrics?.triggers_activated_today}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-600">Automated actions executed</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg Response Time</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {metrics?.average_response_time}s
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">-0.8s improvement</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Customer Satisfaction</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {metrics?.customer_satisfaction}/5
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Target className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-600">Based on AI interactions</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Conversations</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {metrics?.total_conversations}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-600">Active customer interactions</span>
          </div>
        </div>
      </div>

      {/* Triggers and Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Triggers */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-600" />
              Top Performing Triggers
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {triggers.map((trigger) => (
                <div key={trigger.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
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
              ))}
            </div>
          </div>
        </div>

        {/* Recent Workflows */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Workflow className="w-5 h-5 text-purple-600" />
              Recent Workflow Executions
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
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
                      <span className="text-sm text-slate-500">
                        {workflow.execution_time_ms}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Agents Status */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI Agents Status
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: 'Conversation Agent', status: 'active', load: 85 },
              { name: 'Trigger Detection', status: 'active', load: 72 },
              { name: 'Content Generation', status: 'active', load: 91 },
              { name: 'Campaign Agent', status: 'active', load: 45 },
              { name: 'Analytics Agent', status: 'active', load: 63 }
            ].map((agent) => (
              <div key={agent.name} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-slate-600">{agent.load}%</span>
                </div>
                <p className="font-medium text-slate-900 text-sm">{agent.name}</p>
                <div className="mt-2 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${agent.load}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}