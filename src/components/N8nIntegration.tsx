import { useState, useEffect } from 'react';
import { 
  Workflow, 
  Settings, 
  Play, 
  Pause, 
  BarChart3, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Zap
} from 'lucide-react';

interface N8nConfig {
  base_url: string;
  api_key: string;
  webhook_url: string;
  is_connected: boolean;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_type: string;
  estimated_setup_time: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export function N8nIntegration() {
  const [config, setConfig] = useState<N8nConfig>({
    base_url: '',
    api_key: '',
    webhook_url: '',
    is_connected: false
  });
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('disconnected');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [workflowTemplates] = useState<WorkflowTemplate[]>([
    {
      id: 'lead_nurturing',
      name: 'Lead Nurturing Sequence',
      description: 'Automatically nurture leads based on their engagement level and behavior',
      category: 'Sales',
      trigger_type: 'New Contact',
      estimated_setup_time: '15 minutes',
      complexity: 'beginner'
    },
    {
      id: 'abandoned_cart',
      name: 'Abandoned Cart Recovery',
      description: 'Re-engage customers who showed interest but didn\'t complete purchase',
      category: 'E-commerce',
      trigger_type: 'Product Interest',
      estimated_setup_time: '20 minutes',
      complexity: 'intermediate'
    },
    {
      id: 'customer_lifecycle',
      name: 'Customer Lifecycle Management',
      description: 'Manage customer journey from onboarding to retention',
      category: 'Customer Success',
      trigger_type: 'Purchase Event',
      estimated_setup_time: '30 minutes',
      complexity: 'advanced'
    },
    {
      id: 'feedback_collection',
      name: 'Automated Feedback Collection',
      description: 'Collect customer feedback at optimal times',
      category: 'Support',
      trigger_type: 'Time-based',
      estimated_setup_time: '10 minutes',
      complexity: 'beginner'
    },
    {
      id: 'social_media_sync',
      name: 'Social Media Integration',
      description: 'Sync customer interactions across social platforms',
      category: 'Marketing',
      trigger_type: 'External Event',
      estimated_setup_time: '25 minutes',
      complexity: 'advanced'
    },
    {
      id: 'crm_sync',
      name: 'CRM Data Synchronization',
      description: 'Keep customer data in sync with external CRM systems',
      category: 'Integration',
      trigger_type: 'Data Change',
      estimated_setup_time: '20 minutes',
      complexity: 'intermediate'
    }
  ]);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    // In a real app, this would load from your backend/environment
    const savedConfig = localStorage.getItem('n8n_config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setConfig(parsed);
      if (parsed.base_url && parsed.api_key) {
        checkConnection(parsed);
      }
    }
  };

  const checkConnection = async (configToTest = config) => {
    setConnectionStatus('checking');
    
    try {
      // Test connection to n8n instance
      const response = await fetch(`${configToTest.base_url}/rest/workflows`, {
        headers: {
          'Authorization': `Bearer ${configToTest.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const workflowData = await response.json();
        setWorkflows(workflowData.data || []);
        setConnectionStatus('connected');
        setConfig(prev => ({ ...prev, is_connected: true }));
      } else {
        setConnectionStatus('disconnected');
        setConfig(prev => ({ ...prev, is_connected: false }));
      }
    } catch (error) {
      console.error('n8n connection error:', error);
      setConnectionStatus('disconnected');
      setConfig(prev => ({ ...prev, is_connected: false }));
    }
  };

  const saveConfiguration = async () => {
    try {
      // Save to localStorage (in production, save to your backend)
      localStorage.setItem('n8n_config', JSON.stringify(config));
      
      // Test the connection
      await checkConnection();
      
      setIsConfiguring(false);
    } catch (error) {
      console.error('Error saving n8n configuration:', error);
    }
  };

  const deployWorkflowTemplate = async (template: WorkflowTemplate) => {
    try {
      // In a real implementation, this would deploy the workflow to n8n
      console.log('Deploying workflow template:', template.name);
      
      // For demo purposes, we'll just show a success message
      alert(`Workflow "${template.name}" deployed successfully! Check your n8n instance.`);
    } catch (error) {
      console.error('Error deploying workflow:', error);
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'bg-green-100 text-green-600';
      case 'intermediate': return 'bg-yellow-100 text-yellow-600';
      case 'advanced': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Sales': return BarChart3;
      case 'E-commerce': return Zap;
      case 'Customer Success': return CheckCircle;
      case 'Support': return Clock;
      case 'Marketing': return ExternalLink;
      case 'Integration': return Settings;
      default: return Workflow;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Workflow className="w-8 h-8 text-purple-600" />
            n8n Workflow Integration
          </h1>
          <p className="text-slate-600 mt-1">
            Connect and manage advanced automation workflows with n8n
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 text-green-600'
              : connectionStatus === 'checking'
              ? 'bg-yellow-100 text-yellow-600'
              : 'bg-red-100 text-red-600'
          }`}>
            {connectionStatus === 'connected' && <CheckCircle className="w-4 h-4" />}
            {connectionStatus === 'checking' && <Clock className="w-4 h-4" />}
            {connectionStatus === 'disconnected' && <XCircle className="w-4 h-4" />}
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'checking' ? 'Checking...' : 'Disconnected'}
          </div>
          <button
            onClick={() => setIsConfiguring(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configure
          </button>
        </div>
      </div>

      {/* Configuration Modal */}
      {isConfiguring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 mb-6">n8n Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  n8n Base URL
                </label>
                <input
                  type="url"
                  value={config.base_url}
                  onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                  placeholder="https://your-n8n-instance.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="Your n8n API key"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Webhook URL (Optional)
                </label>
                <input
                  type="url"
                  value={config.webhook_url}
                  onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                  placeholder="https://your-n8n-instance.com/webhook/whatsapp-crm"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsConfiguring(false)}
                className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveConfiguration}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Save & Test Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status & Active Workflows */}
      {connectionStatus === 'connected' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Active Workflows</h3>
          </div>
          <div className="p-6">
            {workflows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-900">{workflow.name}</h4>
                      <div className={`w-2 h-2 rounded-full ${
                        workflow.active ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      {workflow.nodes?.length || 0} nodes
                    </p>
                    <div className="flex items-center gap-2">
                      <button className="flex-1 px-3 py-1 text-sm bg-purple-100 text-purple-600 rounded hover:bg-purple-200 transition-colors">
                        View
                      </button>
                      <button className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded transition-colors">
                        {workflow.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Workflow className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No workflows found in your n8n instance</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflow Templates */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Workflow Templates</h3>
          <p className="text-slate-600 mt-1">
            Pre-built workflows optimized for WhatsApp CRM automation
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workflowTemplates.map((template) => {
              const CategoryIcon = getCategoryIcon(template.category);
              return (
                <div key={template.id} className="border border-slate-200 rounded-lg p-6 hover:border-purple-300 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <CategoryIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{template.name}</h4>
                        <p className="text-sm text-slate-600">{template.category}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getComplexityColor(template.complexity)}`}>
                      {template.complexity}
                    </span>
                  </div>
                  
                  <p className="text-slate-600 mb-4">{template.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                    <span>Trigger: {template.trigger_type}</span>
                    <span>Setup: {template.estimated_setup_time}</span>
                  </div>
                  
                  <button
                    onClick={() => deployWorkflowTemplate(template)}
                    disabled={connectionStatus !== 'connected'}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                      connectionStatus === 'connected'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {connectionStatus === 'connected' ? 'Deploy Workflow' : 'Connect n8n First'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      {connectionStatus === 'disconnected' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Getting Started with n8n</h3>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
              <div>
                <p className="font-medium">Install n8n</p>
                <p className="text-sm text-blue-700">Deploy n8n on your server or use n8n Cloud</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
              <div>
                <p className="font-medium">Generate API Key</p>
                <p className="text-sm text-blue-700">Create an API key in your n8n settings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
              <div>
                <p className="font-medium">Configure Connection</p>
                <p className="text-sm text-blue-700">Enter your n8n URL and API key above</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href="https://docs.n8n.io/getting-started/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              n8n Documentation
            </a>
            <button
              onClick={() => setIsConfiguring(true)}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Configure Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}