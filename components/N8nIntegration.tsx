import { useState, useEffect } from 'react';
import { 
  Workflow, 
  Settings, 
  Play, 
  Pause, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface N8nConfig {
  base_url: string;
  api_key: string;
  webhook_url: string;
  is_connected: boolean;
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
  
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    // Load from localStorage (set via Configure AI modal) or environment variables
    const savedBaseUrl = localStorage.getItem('n8n_base_url') || process.env.NEXT_PUBLIC_N8N_BASE_URL || '';
    const savedApiKey = localStorage.getItem('n8n_api_key') || process.env.NEXT_PUBLIC_N8N_API_KEY || '';
    
    const finalConfig = {
      base_url: savedBaseUrl,
      api_key: savedApiKey,
      webhook_url: '',
      is_connected: false
    };
    
    setConfig(finalConfig);
    if (finalConfig.base_url && finalConfig.api_key) {
      checkConnection();
    }
  };

  const checkConnection = async () => {
    setConnectionStatus('checking');
    
    try {
      // Use Next.js API proxy to avoid CORS issues
      const response = await fetch('/api/n8n?endpoint=/api/v1/workflows');

      if (response.ok) {
        const workflowData = await response.json();
        setWorkflows(workflowData.data || []);
        setConnectionStatus('connected');
        setConfig(prev => ({ ...prev, is_connected: true }));
      } else {
        console.error('n8n connection failed:', response.status, await response.text());
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
      // Save to localStorage using the same keys as ConfigureAIModal
      localStorage.setItem('n8n_base_url', config.base_url);
      localStorage.setItem('n8n_api_key', config.api_key);
      
      // Test the connection
      await checkConnection();
      
      setIsConfiguring(false);
    } catch (error) {
      console.error('Error saving n8n configuration:', error);
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