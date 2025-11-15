'use client';

import { useState, FormEvent } from 'react';
import { Modal, Button } from '../ui';
import { api } from '../../lib/api';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCampaignModal({ isOpen, onClose, onSuccess }: CreateCampaignModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    message_template: '',
    target_tags: '',
    scheduled_at: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const tags = formData.target_tags.split(',').map((t) => t.trim()).filter(Boolean);
      const contacts = await api.get(`/contacts?tags=${tags.join(',')}`);

      await api.post('/campaigns', {
        name: formData.name,
        message_template: formData.message_template,
        target_tags: tags,
        scheduled_at: formData.scheduled_at,
        status: 'scheduled',
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
      });

      onSuccess();
      onClose();
      setFormData({ name: '', message_template: '', target_tags: '', scheduled_at: '' });
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Campaign" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Campaign Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Holiday Greetings 2025"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Message Template *</label>
          <textarea
            required
            value={formData.message_template}
            onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
            placeholder="Hi {{name}}, Happy holidays from our team!"
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500 mt-1">
            Use placeholders like {`{{name}}`}, {`{{company}}`} for personalization
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Target Tags (comma-separated) *
          </label>
          <input
            type="text"
            required
            value={formData.target_tags}
            onChange={(e) => setFormData({ ...formData, target_tags: e.target.value })}
            placeholder="vip, lead, customer"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Scheduled Date & Time *
          </label>
          <input
            type="datetime-local"
            required
            value={formData.scheduled_at}
            onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
