import { useState } from 'react';
import { 
  Zap, 
  Plus, 
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Save,
  X
} from 'lucide-react';

import { useTriggers } from '../../../lib/hooks';
import type { Trigger } from '../../../lib/services/triggers/TriggersService';

export function TriggerManagement() {
  const { triggers, loading, createTrigger, updateTrigger, deleteTrigger } = useTriggers();
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'message_received',
    condition: '',
    action: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTrigger) {
        await updateTrigger(editingTrigger.id, {
          name: formData.name,
          event_type: formData.type as any,
          conditions: { condition: formData.condition },
          actions: { action: formData.action },
        });
      } else {
        await createTrigger({
          name: formData.name,
          event_type: formData.type as any,
          conditions: { condition: formData.condition },
          actions: { action: formData.action },
          action_type: 'trigger_workflow',
          is_active: true,
        });
      }

      resetForm();
    } catch (error) {
      console.error('Error saving trigger:', error);
    }
  };

  const handleDelete = async (triggerId: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return;

    try {
      await deleteTrigger(triggerId);
    } catch (error) {
      console.error('Error deleting trigger:', error);
    }
  };

  const toggleTrigger = async (triggerId: string, isActive: boolean) => {
    try {
      await updateTrigger(triggerId, { 
        is_active: !isActive,
      });
    } catch (error) {
      console.error('Error toggling trigger:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'message_received',
      condition: '',
      action: '',
    });
    setEditingTrigger(null);
    setShowForm(false);
  };

  const startEdit = (trigger: Trigger) => {
    setFormData({
      name: trigger.name,
      type: trigger.event_type || trigger.type || 'message_received',
      condition: trigger.conditions?.condition || trigger.condition || '',
      action: trigger.actions?.action || trigger.action_config?.action || trigger.action || '',
    });
    setEditingTrigger(trigger);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading triggers...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trigger Management</h2>
          <p className="text-slate-600 mt-1">Automate actions based on events</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Trigger
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingTrigger ? 'Edit Trigger' : 'Create New Trigger'}
            </h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Trigger Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., New Lead Notification"
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="message_received">Message Received</option>
                <option value="keyword_detected">Keyword Detected</option>
                <option value="contact_created">Contact Created</option>
                <option value="conversation_idle">Conversation Idle</option>
                <option value="high_intent">High Intent Detected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Condition
              </label>
              <textarea
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., message contains 'pricing' or 'quote'"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Action
              </label>
              <textarea
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., trigger n8n workflow 'lead-nurturing'"
                rows={3}
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingTrigger ? 'Update' : 'Create'} Trigger
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {triggers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No triggers configured yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first trigger to automate actions</p>
          </div>
        ) : (
          triggers.map((trigger) => (
            <div
              key={trigger.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{trigger.name}</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {(trigger.event_type || trigger.type || '').replace('_', ' ')}
                    </span>
                    {trigger.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-700">Condition:</span>
                      <span className="text-slate-600 ml-2">{trigger.conditions?.condition || trigger.condition || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Action:</span>
                      <span className="text-slate-600 ml-2">{trigger.actions?.action || trigger.action_config?.action || trigger.action || 'N/A'}</span>
                    </div>
                    <div className="text-slate-500">
                      Executed {trigger.execution_count || 0} times
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleTrigger(trigger.id, trigger.is_active)}
                    className="p-2 text-slate-600 hover:text-slate-900 transition-colors"
                    title={trigger.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {trigger.is_active ? (
                      <ToggleRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(trigger)}
                    className="p-2 text-slate-600 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(trigger.id)}
                    className="p-2 text-slate-600 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
