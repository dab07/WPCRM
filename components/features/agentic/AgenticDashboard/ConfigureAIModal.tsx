'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
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
      // Load current values from localStorage
      const savedApiKey = localStorage.getItem('n8n_api_key') || '';
      const savedBaseUrl = localStorage.getItem('n8n_base_url') || 'http://localhost:5678';
      setN8nApiKey(savedApiKey);
      setN8nBaseUrl(savedBaseUrl);
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setError('');
    setSuccess(false);

    // Validate inputs
    if (!n8nApiKey.trim()) {
      setError('N8N API Key is required');
      return;
    }

    if (!n8nBaseUrl.trim()) {
      setError('N8N Base URL is required');
      return;
    }

    // Validate URL format
    try {
      new URL(n8nBaseUrl);
    } catch {
      setError('Invalid N8N Base URL format');
      return;
    }

    setSaving(true);

    try {
      // Test the connection
      const response = await fetch(`${n8nBaseUrl}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': n8nApiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to connect to N8N. Please check your API key and URL.');
      }

      // Save to localStorage
      localStorage.setItem('n8n_api_key', n8nApiKey);
      localStorage.setItem('n8n_base_url', n8nBaseUrl);

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Configure AI Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="n8nBaseUrl" className="block text-sm font-medium text-slate-700 mb-2">
              N8N Base URL
            </label>
            <input
              id="n8nBaseUrl"
              type="text"
              value={n8nBaseUrl}
              onChange={(e) => setN8nBaseUrl(e.target.value)}
              placeholder="http://localhost:5678"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              The base URL of your N8N instance (e.g., http://localhost:5678)
            </p>
          </div>

          <div>
            <label htmlFor="n8nApiKey" className="block text-sm font-medium text-slate-700 mb-2">
              N8N API Key
            </label>
            <input
              id="n8nApiKey"
              type="password"
              value={n8nApiKey}
              onChange={(e) => setN8nApiKey(e.target.value)}
              placeholder="Enter your N8N API key"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Your N8N API key for authentication
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">Configuration saved successfully!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            icon={Save}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Testing Connection...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}
