import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Zap, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  BarChart3,
  Clock,
  MessageSquare,
  Target,
  Workflow
} from 'lucide-react';

interface Trigger {
  id: string;
  name: string;
  description: string;
  type: string;
  conditions: any;
  actions: any;
  priority: number;
  is_active: boolean;
  success_rate: number;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

interface TriggerFormData {
  name: string;
  description: string;
  type: string;
  conditions: any;
  actions: any;
  priority: number;
  is_active: boolean;
}

export function TriggerManagement() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
  const [formData, setFormData] = useState<TriggerFormData>({
    name: '',
    description: '',
    type: 'conversation_pattern',
    conditions: {},
    actions: {},
    priority: 1,
    is_active: true
  });

  useEffect(() => {
    loadTriggers();
  }, []);

  const loadTriggers = async () => {
    try {
      const { data, error } = await supabase
        .from('triggers')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setTriggers(data || []);
    } catch (error) {
      console.error('Error loading triggers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTrigger) {
        const { error } = await supabase
          .from('triggers')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTrigger.id);

        if (error) throw error;
      } else {
        await api.post('/triggers', formData);
      }

      await loadTriggers();
      resetForm();
    } catch (error) {
      console.error('Error saving trigger:', error);
    }
  };

  const handleEdit = (trigger: Trigger) => {
    setEditingTrigger(trigger);
    setFormData({
      name: trigger.name,
      description: trigger.description,
      type: trigger.type,
      conditions: trigger.conditions,
      actions: trigger.actions,
      priority: trigger.priority,
      is_active: trigger.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (triggerId: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return;

    try {
      const { error } = await supabase
        .from('triggers')
        .delete()
        .eq('id', triggerId);

      if (error) throw error;
      await loadTriggers();
    } catch (error) {
      console.error('Error deleting trigger:', error);
    }
  };

  const toggleTrigger = async (triggerId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('triggers')
        .update({ 
          is_active: !isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', triggerId);

      if (error) throw error;
      await loadTriggers();
    } catch (error) {
      console.error('Error toggling trigger:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'conversation_pattern',
      conditions: {},
      actions: {},
      priority: 1,
      is_active: true
    });
    setEditingTrigger(null);
    setShowForm(false);
  };

  const getTriggerTypeIcon = (type: string) => {
    switch (type) {
      case 'conversation_pattern': return MessageSquare;
      case 'time_based': return Clock;
      case 'behavior': return Target;
      case 'lifecycle': return BarChart3;
      case 'external': return Workflow;
      default: return Zap;
    }
  };

  const getTriggerTypeColor = (type: string) => {
    switch (type) {
      case 'conversation_pattern': return 'bg-blue-100 text-blue-600';
      case 'time_based': return 'bg-green-100 text-green-600';
      case 'behavior': return 'bg-purple-100 text-purple-600';
      case 'lifecycle': return 'bg-orange-100 text-orange-600';
      case 'external': return 'bg-indigo-100 text-indigo-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading triggers...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-600" />
            Trigger Management
          </h1>
          <p className="text-slate-600 mt-1">
            Configure automated triggers and actions for customer interactions
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Trigger
        </button>
      </div>

      {/* Trigger Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              {editingTrigger ? 'Edit Trigger' : 'Create New Trigger'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Trigger Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Trigger Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="conversation_pattern">Conversation Pattern</option>
                    <option value="time_based">Time Based</option>
                    <option value="behavior">Customer Behavior</option>
                    <option value="lifecycle">Lifecycle Stage</option>
                    <option value="external">External Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm font-medium text-slate-700">Active</span>
                  </label>
                </div>
              </div>

              {/* Conditions Configuration */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Trigger Conditions (JSON)
                </label>
                <textarea
                  value={JSON.stringify(formData.conditions, null, 2)}
                  onChange={(e) => {
                    try {
                      setFormData({ ...formData, conditions: JSON.parse(e.target.value) });
                    } catch {
                      // Invalid JSON, keep the text as is
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                  rows={4}
                  placeholder='{"keywords": ["price", "cost"], "confidence": 0.7}'
                />
              </div>

              {/* Actions Configuration */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Actions (JSON)
                </label>
                <textarea
                  value={JSON.stringify(formData.actions, null, 2)}
                  onChange={(e) => {
                    try {
                      setFormData({ ...formData, actions: JSON.parse(e.target.value) });
                    } catch {
                      // Invalid JSON, keep the text as is
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                  rows={4}
                  placeholder='{"send_message": {"template": "product_info"}, "update_journey_stage": "consideration"}'
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  {editingTrigger ? 'Update Trigger' : 'Create Trigger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Triggers List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Active Triggers ({triggers.filter(t => t.is_active).length})
          </h3>
        </div>
        <div className="divide-y divide-slate-200">
          {triggers.map((trigger) => {
            const TypeIcon = getTriggerTypeIcon(trigger.type);
            return (
              <div key={trigger.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${getTriggerTypeColor(trigger.type)}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-900">{trigger.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trigger.is_active 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {trigger.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                          Priority {trigger.priority}
                        </span>
                      </div>
                      {trigger.description && (
                        <p className="text-slate-600 mb-3">{trigger.description}</p>
                      )}
                      <div className="flex items-center gap-6 text-sm text-slate-500">
                        <span>Type: {trigger.type.replace('_', ' ')}</span>
                        <span>Executions: {trigger.execution_count}</span>
                        <span>Success Rate: {(trigger.success_rate * 100).toFixed(1)}%</span>
                        <span>Updated: {new Date(trigger.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTrigger(trigger.id, trigger.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        trigger.is_active
                          ? 'text-orange-600 hover:bg-orange-100'
                          : 'text-green-600 hover:bg-green-100'
                      }`}
                      title={trigger.is_active ? 'Pause trigger' : 'Activate trigger'}
                    >
                      {trigger.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(trigger)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit trigger"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(trigger.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete trigger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {triggers.length === 0 && (
        <div className="text-center py-12">
          <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No triggers configured</h3>
          <p className="text-slate-600 mb-6">
            Create your first trigger to start automating customer interactions
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Create Your First Trigger
          </button>
        </div>
      )}
    </div>
  );
}