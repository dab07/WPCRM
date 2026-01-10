'use client';

import { useState } from 'react';
import { Send, Plus, Calendar, Clock, Users, CheckCircle } from 'lucide-react';
import { useCampaigns } from '../../../../lib/hooks';
import { Campaign } from '../../../../lib/types/api/campaigns';

export function CampaignsPanel() {
  const { campaigns, loading, reload } = useCampaigns();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    reload();
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-600';
      case 'scheduled': return 'bg-blue-100 text-blue-600';
      case 'running': return 'bg-yellow-100 text-yellow-600';
      case 'completed': return 'bg-green-100 text-green-600';
      case 'paused': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Campaigns</h2>
          <p className="text-slate-600">Create and manage your WhatsApp campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Campaigns</p>
              <p className="text-xl font-bold text-slate-900">{campaigns.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Scheduled</p>
              <p className="text-xl font-bold text-slate-900">
                {campaigns.filter(c => c.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Completed</p>
              <p className="text-xl font-bold text-slate-900">
                {campaigns.filter(c => c.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Messages Sent</p>
              <p className="text-xl font-bold text-slate-900">
                {campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <Send className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No campaigns yet</h3>
          <p className="text-slate-600 mb-4">
            Create your first campaign to reach your customers
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white p-6 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{campaign.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                  </div>
                  
                  <p className="text-slate-600 mb-3 line-clamp-2">
                    {campaign.message_template.replace(/\{\{name\}\}/g, 'Customer')}
                  </p>

                  <div className="flex items-center gap-6 text-sm text-slate-500">
                    {campaign.scheduled_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Scheduled: {formatDate(campaign.scheduled_at)}</span>
                      </div>
                    )}
                    
                    {campaign.target_tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Tags: {campaign.target_tags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Campaign Stats */}
                {campaign.status === 'completed' && (
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-medium text-slate-900">{campaign.total_recipients}</p>
                      <p className="text-slate-500">Recipients</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-green-600">{campaign.sent_count}</p>
                      <p className="text-slate-500">Sent</p>
                    </div>
                    {(campaign.failed_count || 0) > 0 && (
                      <div className="text-center">
                        <p className="font-medium text-red-600">{campaign.failed_count}</p>
                        <p className="text-slate-500">Failed</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { createCampaign } = useCampaigns();
  const [formData, setFormData] = useState({
    name: '',
    message_template: '',
    target_tags: [] as string[],
    scheduled_at: '',
    schedule_type: 'now' as 'now' | 'later'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await createCampaign({
        name: formData.name,
        message_template: formData.message_template,
        target_tags: formData.target_tags,
        ...(formData.schedule_type === 'later' && formData.scheduled_at && { scheduled_at: formData.scheduled_at })
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const commonTags = ['vip', 'premium', 'active', 'new', 'loyal', 'business'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Create Campaign</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., New Year Greetings 2024"
                required
              />
            </div>

            {/* Message Template */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message Template
              </label>
              <textarea
                value={formData.message_template}
                onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Hello {{name}}! We have exciting news to share with you..."
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Use {'{'}{'{'} name {'}'} {'}'} for personalization. Add {'{'}{'{'} ai_enhance {'}'} {'}'} for AI enhancement.
              </p>
            </div>

            {/* Target Tags */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Target Tags (Optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {commonTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const newTags = formData.target_tags.includes(tag)
                        ? formData.target_tags.filter(t => t !== tag)
                        : [...formData.target_tags, tag];
                      setFormData({ ...formData, target_tags: newTags });
                    }}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      formData.target_tags.includes(tag)
                        ? 'bg-purple-100 text-purple-600 border-purple-300'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Leave empty to send to all contacts
              </p>
            </div>

            {/* Schedule Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                When to Send
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="schedule_type"
                    value="now"
                    checked={formData.schedule_type === 'now'}
                    onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value as 'now' | 'later' })}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-slate-700">Send immediately (via N8N automation)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="schedule_type"
                    value="later"
                    checked={formData.schedule_type === 'later'}
                    onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value as 'now' | 'later' })}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-slate-700">Schedule for later</span>
                </label>
              </div>
            </div>

            {/* Scheduled Date/Time */}
            {formData.schedule_type === 'later' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Schedule Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required={formData.schedule_type === 'later'}
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
