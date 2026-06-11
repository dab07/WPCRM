'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../../ui';

interface ConfigureAIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigureAIModal({ isOpen, onClose }: ConfigureAIModalProps) {
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [n8nBaseUrl, setN8nBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setN8nApiKey(localStorage.getItem('n8n_api_key') || '');
      setN8nBaseUrl(localStorage.getItem('n8n_base_url') || 'http://localhost:5678');
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setError('');
    setSuccess(false);

    if (!n8nApiKey.trim()) { setError('N8N API Key is required'); return; }
    if (!n8nBaseUrl.trim()) { setError('N8N Base URL is required'); return; }

    try { new URL(n8nBaseUrl); }
    catch { setError('Invalid N8N Base URL format'); return; }

    setSaving(true);
    try {
      const response = await fetch(`${n8nBaseUrl}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': n8nApiKey },
      });
      if (!response.ok) throw new Error('Failed to connect to N8N. Please check your API key and URL.');

      localStorage.setItem('n8n_api_key', n8nApiKey);
      localStorage.setItem('n8n_base_url', n8nBaseUrl);
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-brand-navy border border-[rgba(59,91,173,0.18)] rounded-[4px] shadow-[0_8px_48px_rgba(0,0,0,0.6)] w-full max-w-md mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(59,91,173,0.18)]">
          <div>
            <p className="label-eyebrow text-brand-muted mb-1">Integration</p>
            <h2 className="font-heading font-semibold text-brand-offwhite tracking-tight">
              Configure AI Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-brand-muted hover:text-brand-yellow transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <Field
            id="n8nBaseUrl"
            label="N8N Base URL"
            type="text"
            value={n8nBaseUrl}
            onChange={setN8nBaseUrl}
            placeholder="http://localhost:5678"
            hint="The base URL of your N8N instance"
          />
          <Field
            id="n8nApiKey"
            label="N8N API Key"
            type="password"
            value={n8nApiKey}
            onChange={setN8nApiKey}
            placeholder="Enter your N8N API key"
            hint="Your N8N API key for authentication"
          />

          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-900/20 border border-red-500/40 rounded-[4px]">
              <AlertCircle className="w-4 h-4 text-red-400 stroke-[1.5] shrink-0 mt-0.5" />
              <p className="font-body text-[13px] text-red-300">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 p-3 bg-green-900/20 border border-green-500/40 rounded-[4px]">
              <CheckCircle className="w-4 h-4 text-green-400 stroke-[1.5] shrink-0 mt-0.5" />
              <p className="font-body text-[13px] text-green-300">Configuration saved successfully!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[rgba(59,91,173,0.18)]">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button icon={Save} size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Testing...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  id, label, type, value, onChange, placeholder, hint,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full px-3 py-2.5 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px]
          font-body text-[13px] text-brand-offwhite placeholder:text-brand-muted/50
          focus:outline-none focus:border-brand-yellow
          transition-colors
        "
      />
      <p className="font-body text-[11px] text-brand-muted mt-1">{hint}</p>
    </div>
  );
}
