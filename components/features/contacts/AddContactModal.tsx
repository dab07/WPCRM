'use client';

import { useState, FormEvent } from 'react';
import { Modal, Button } from '../../ui';
import { formatPhoneNumber, isValidPhoneNumber } from '../../../lib/utils/validation';
import { getSupabaseClient } from '../../../supabase/supabase';

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
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const response = await fetch('/api/contacts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
          <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-500/40 rounded-[4px]">
            <p className="font-body text-[13px] text-red-300">{error}</p>
          </div>
        )}

        {/* Reusable input style */}
        {[
          { label: 'Name *', id: 'name', type: 'text', required: true, placeholder: 'John Doe', hint: '' },
        ].map(({ label, id, type, required, placeholder, hint }) => (
          <div key={id}>
            <label htmlFor={id} className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5">
              {label}
            </label>
            <input
              id={id}
              type={type}
              required={required}
              value={(formData as any)[id]}
              onChange={(e) => setFormData({ ...formData, [id]: e.target.value })}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] font-body text-[13px] text-brand-offwhite placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-yellow transition-colors"
            />
            {hint && <p className="font-body text-[11px] text-brand-muted mt-1">{hint}</p>}
          </div>
        ))}

        <div>
          <label htmlFor="phone_number" className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5">
            Phone Number * (WhatsApp)
          </label>
          <input
            id="phone_number"
            type="tel"
            required
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            placeholder="+14155552671 or 4155552671"
            className="w-full px-3 py-2.5 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] font-body text-[13px] text-brand-offwhite placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-yellow transition-colors"
          />
          <p className="font-body text-[11px] text-brand-muted mt-1">
            International format: +[country code][number] — e.g. +14155552671, +919876543210
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5">
            Email (Optional)
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
            className="w-full px-3 py-2.5 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] font-body text-[13px] text-brand-offwhite placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-yellow transition-colors"
          />
        </div>

        <div>
          <label htmlFor="company" className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5">
            Company (Optional)
          </label>
          <input
            id="company"
            type="text"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Acme Inc."
            className="w-full px-3 py-2.5 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] font-body text-[13px] text-brand-offwhite placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-yellow transition-colors"
          />
        </div>

        <div>
          <label htmlFor="tags" className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="vip, lead, customer"
            className="w-full px-3 py-2.5 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] font-body text-[13px] text-brand-offwhite placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-yellow transition-colors"
          />
        </div>

        <div>
          <label htmlFor="source" className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5">
            Source
          </label>
          <select
            id="source"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            className="w-full px-3 py-2.5 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] font-body text-[13px] text-brand-offwhite focus:outline-none focus:border-brand-yellow transition-colors"
          >
            <option value="manual">Manual Entry</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="import">Import</option>
            <option value="website">Website</option>
            <option value="referral">Referral</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" onClick={onClose} variant="ghost" className="flex-1">
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
