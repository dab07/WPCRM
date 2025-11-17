'use client';

import { useState, FormEvent } from 'react';
import { Modal, Button } from '../ui';
import { formatPhoneNumber, isValidPhoneNumber } from '../../lib/utils';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddContactModal({ isOpen, onClose, onSuccess }: AddContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    company: '',
    tags: '',
    source: 'manual',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    console.log('[ContactModel] post contact details');

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(formData.phone_number);

    if (!isValidPhoneNumber(formattedPhone)) {
      setError('Invalid phone number. Use format: +[country code][number] (e.g., +14155552671)');
      return;
    }

    setSaving(true);
    try {
      const tags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);

      console.log('[ContactModal] Creating contact via API');
      const response = await fetch('/api/contacts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone_number: formattedPhone,
          email: formData.email || null,
          company: formData.company || null,
          tags: tags,
          source: formData.source,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create contact');
      }

      console.log('[ContactModal] Contact created successfully');
      onSuccess();
      onClose();

      setFormData({
        name: '',
        phone_number: '',
        email: '',
        company: '',
        tags: '',
        source: 'manual',
      });
    } catch (err: any) {
      console.error('Error creating contact:', err);
      setError(err.message || 'Failed to create contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Contact" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Phone Number * (WhatsApp)
          </label>
          <input
            type="tel"
            required
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            placeholder="+14155552671 or 4155552671"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500 mt-1">
            International format: +[country code][number]
            <br />
            Examples: +14155552671 (US), +919876543210 (India), +447911123456 (UK)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Email (Optional)</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Company (Optional)</label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Acme Inc."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="vip, lead, customer"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
          <select
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="manual">Manual Entry</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="import">Import</option>
            <option value="website">Website</option>
            <option value="referral">Referral</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? 'Adding...' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
