import { useEffect, useState } from 'react';
import { api, FollowUpRule } from '../lib/api-client';
import { Clock, Plus, X, ToggleLeft, ToggleRight } from 'lucide-react';

export function FollowUpRulesPanel() {
  const [rules, setRules] = useState<FollowUpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const data = await api.followUpRules.list();
      setRules(data || []);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      await api.followUpRules.update(ruleId, { is_active: !currentStatus });
      loadRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading rules...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Follow-up Rules</h2>
          <p className="text-slate-600">Automate customer follow-ups based on activity</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-slate-400">
          <Clock className="w-16 h-16 mb-4" />
          <p className="text-lg">No follow-up rules yet</p>
          <p className="text-sm">Create rules to automatically follow up with customers</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg mb-1">{rule.name}</h3>
                  <p className="text-sm text-slate-600">
                    Trigger: {rule.trigger_condition.replace('_', ' ')} after{' '}
                    <span className="font-medium">{rule.inactivity_hours ? Math.round(rule.inactivity_hours / 24) : 0} days</span>
                  </p>
                </div>
                <button
                  onClick={() => toggleRule(rule.id, rule.is_active)}
                  className={`transition-colors ${
                    rule.is_active ? 'text-green-600' : 'text-slate-400'
                  }`}
                >
                  {rule.is_active ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 font-medium mb-2">Message Template:</p>
                <p className="text-sm text-slate-900">{rule.message_template}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  Created {new Date(rule.created_at).toLocaleDateString()}
                </span>
                <span
                  className={`px-3 py-1 rounded-full font-medium ${
                    rule.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {rule.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateRuleModal onClose={() => setShowCreateModal(false)} onSuccess={loadRules} />
      )}
    </div>
  );
}

function CreateRuleModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    trigger_condition: 'no_reply',
    days_threshold: 3,
    message_template: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      await api.post('/follow-up-rules', {
        name: formData.name,
        trigger_condition: formData.trigger_condition,
        days_threshold: formData.days_threshold,
        message_template: formData.message_template,
        is_active: true,
      });

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating rule:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Create Follow-up Rule</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rule Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="3-day inactive follow-up"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Trigger Condition *
            </label>
            <select
              value={formData.trigger_condition}
              onChange={(e) => setFormData({ ...formData, trigger_condition: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="no_reply">No reply from customer</option>
              <option value="time_gap">Time gap in conversation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Days Threshold *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.days_threshold}
              onChange={(e) =>
                setFormData({ ...formData, days_threshold: parseInt(e.target.value) })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Send follow-up after this many days of inactivity
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Message Template *
            </label>
            <textarea
              required
              value={formData.message_template}
              onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
              placeholder="Hey {{name}}, just checking in — how's everything going?"
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Use {`{{name}}`}, {`{{company}}`} for personalization
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {saving ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
