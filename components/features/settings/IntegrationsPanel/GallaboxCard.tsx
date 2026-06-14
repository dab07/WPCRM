'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Plug,
  PlugZap,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface GallaboxIntegration {
  id: string;
  is_active: boolean;
  account_id?: string;
  extra?: { channelId?: string };
  last_tested_at?: string;
  test_status?: 'ok' | 'error';
  test_error?: string;
}

export function GallaboxCard() {
  // ── Form state ──────────────────────────────────────────────────────────
  const [apiKey,    setApiKey]    = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [accountId, setAccountId] = useState('');
  const [channelId, setChannelId] = useState('');

  const [showApiKey,    setShowApiKey]    = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  // ── Remote state ────────────────────────────────────────────────────────
  const [integration, setIntegration] = useState<GallaboxIntegration | null>(null);
  const [connected,   setConnected]   = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [testing,      setTesting]      = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  // ── Load current status on mount ────────────────────────────────────────
  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const res  = await fetch('/api/integrations/gallabox/status');
      const json = await res.json();
      setConnected(json.connected ?? false);
      setIntegration(json.integration ?? null);
      if (json.integration?.account_id) setAccountId(json.integration.account_id);
      if (json.integration?.extra?.channelId) setChannelId(json.integration.extra.channelId);
    } catch {
      // silently ignore on load
    } finally {
      setLoading(false);
    }
  }

  // ── Test connection ──────────────────────────────────────────────────────
  async function handleTest() {
    if (!apiKey || !apiSecret) {
      setTestResult({ success: false, message: 'Enter API Key and API Secret first.' });
      return;
    }
    setTesting(true);
    setTestResult(null);

    try {
      const res  = await fetch('/api/integrations/gallabox/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret, accountId }),
      });
      const json = await res.json();
      setTestResult({
        success: json.success,
        message: json.success
          ? `Connected ✓ — ${json.accountInfo?.name ?? 'Gallabox account'}`
          : json.error ?? 'Connection failed',
      });
    } catch (err) {
      setTestResult({ success: false, message: 'Network error — could not reach Gallabox.' });
    } finally {
      setTesting(false);
    }
  }

  // ── Save / connect ───────────────────────────────────────────────────────
  async function handleSave() {
    if (!apiKey || !apiSecret) {
      setSaveError('API Key and API Secret are required.');
      return;
    }
    setSaving(true);
    setSaveError(null);

    try {
      const res  = await fetch('/api/integrations/gallabox/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret, accountId, channelId, testFirst: true }),
      });
      const json = await res.json();

      if (!json.success) {
        setSaveError(json.error ?? 'Failed to save credentials.');
        return;
      }

      // Clear sensitive fields from local state after saving
      setApiKey('');
      setApiSecret('');
      await loadStatus();
    } catch (err) {
      setSaveError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Disconnect ───────────────────────────────────────────────────────────
  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/integrations/gallabox/status', { method: 'DELETE' });
      await loadStatus();
      setApiKey('');
      setApiSecret('');
      setTestResult(null);
      setSaveError(null);
    } finally {
      setDisconnecting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="rounded-[6px] border border-[rgba(59,91,173,0.22)] bg-brand-slate overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(59,91,173,0.15)]">
        <div className="flex items-center gap-3">
          {/* Gallabox icon placeholder */}
          <div className="w-9 h-9 rounded-[4px] bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center">
            <PlugZap className="w-5 h-5 text-[#25D366]" />
          </div>
          <div>
            <p className="font-heading text-[13px] text-brand-offwhite leading-tight">Gallabox</p>
            <p className="font-mono text-[10px] text-brand-muted uppercase tracking-label">WhatsApp Business Provider</p>
          </div>
        </div>

        {/* Connection status badge */}
        {connected ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label px-2.5 py-1 border border-green-500/40 text-green-400 bg-green-500/10 rounded-[4px]">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label px-2.5 py-1 border border-brand-muted/40 text-brand-muted bg-brand-muted/10 rounded-[4px]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-muted" />
            Not connected
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-5 space-y-4">
        {/* Description */}
        <p className="font-body text-[12px] text-brand-muted leading-relaxed">
          Connect your Gallabox account to send WhatsApp campaign messages and automatically
          sync inbound contacts. Once connected, all outbound WhatsApp messages will route
          through Gallabox instead of the Meta Cloud API.
        </p>

        {/* Connected summary */}
        {connected && integration && (
          <div className="rounded-[4px] border border-green-500/20 bg-green-500/5 px-4 py-3 space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-label text-green-400">Active integration</p>
            {integration.account_id && (
              <p className="font-body text-[12px] text-brand-offwhite/80">Account ID: {integration.account_id}</p>
            )}
            {integration.extra?.channelId && (
              <p className="font-body text-[12px] text-brand-offwhite/80">Channel ID: {integration.extra.channelId}</p>
            )}
            {integration.last_tested_at && (
              <p className="font-body text-[11px] text-brand-muted">
                Last tested: {new Date(integration.last_tested_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Credential fields */}
        <div className="space-y-3">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5">
              API Key <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={connected ? '••••••••  (enter new key to update)' : 'Enter Gallabox API Key'}
                className="
                  w-full bg-brand-navy border border-[rgba(59,91,173,0.3)] rounded-[4px]
                  px-3 py-2 pr-10 font-mono text-[12px] text-brand-offwhite
                  placeholder:text-brand-muted/50 focus:outline-none
                  focus:border-brand-blue transition-colors
                "
              />
              <button
                type="button"
                onClick={() => setShowApiKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-offwhite"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5">
              API Secret <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showApiSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={e => setApiSecret(e.target.value)}
                placeholder={connected ? '••••••••  (enter new secret to update)' : 'Enter Gallabox API Secret'}
                className="
                  w-full bg-brand-navy border border-[rgba(59,91,173,0.3)] rounded-[4px]
                  px-3 py-2 pr-10 font-mono text-[12px] text-brand-offwhite
                  placeholder:text-brand-muted/50 focus:outline-none
                  focus:border-brand-blue transition-colors
                "
              />
              <button
                type="button"
                onClick={() => setShowApiSecret(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-offwhite"
              >
                {showApiSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5">
                Account ID
              </label>
              <input
                type="text"
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                placeholder="Optional"
                className="
                  w-full bg-brand-navy border border-[rgba(59,91,173,0.3)] rounded-[4px]
                  px-3 py-2 font-mono text-[12px] text-brand-offwhite
                  placeholder:text-brand-muted/50 focus:outline-none
                  focus:border-brand-blue transition-colors
                "
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5">
                WhatsApp Channel ID
              </label>
              <input
                type="text"
                value={channelId}
                onChange={e => setChannelId(e.target.value)}
                placeholder="Optional"
                className="
                  w-full bg-brand-navy border border-[rgba(59,91,173,0.3)] rounded-[4px]
                  px-3 py-2 font-mono text-[12px] text-brand-offwhite
                  placeholder:text-brand-muted/50 focus:outline-none
                  focus:border-brand-blue transition-colors
                "
              />
            </div>
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`
            flex items-start gap-2 rounded-[4px] border px-3 py-2.5 text-[12px] font-body
            ${testResult.success
              ? 'border-green-500/30 bg-green-500/5 text-green-400'
              : 'border-red-500/30 bg-red-500/5 text-red-400'}
          `}>
            {testResult.success
              ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {testResult.message}
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <div className="flex items-start gap-2 rounded-[4px] border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-[12px] font-body text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {saveError}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          {/* Test */}
          <button
            onClick={handleTest}
            disabled={testing || saving}
            className="
              flex items-center gap-2 px-4 py-2 rounded-[4px]
              border border-brand-blue/50 text-brand-blue
              font-mono text-[11px] uppercase tracking-label
              hover:bg-brand-blue/10 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {testing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {testing ? 'Testing…' : 'Test Connection'}
          </button>

          {/* Save / Connect */}
          <button
            onClick={handleSave}
            disabled={saving || testing}
            className="
              flex items-center gap-2 px-4 py-2 rounded-[4px]
              bg-brand-yellow text-brand-navy
              font-mono text-[11px] uppercase tracking-label
              hover:bg-brand-yellow/90 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {saving
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Plug className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : connected ? 'Update Credentials' : 'Connect Gallabox'}
          </button>

          {/* Disconnect */}
          {connected && (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="
                flex items-center gap-2 px-4 py-2 rounded-[4px]
                border border-red-500/40 text-red-400
                font-mono text-[11px] uppercase tracking-label
                hover:bg-red-500/10 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed ml-auto
              "
            >
              {disconnecting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <XCircle className="w-3.5 h-3.5" />}
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          )}
        </div>

        {/* Webhook URL hint */}
        <div className="rounded-[4px] border border-[rgba(59,91,173,0.18)] bg-brand-navy px-4 py-3 space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted">
            Gallabox Webhook URL
          </p>
          <p className="font-mono text-[11px] text-brand-offwhite/70 break-all select-all">
            {typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/webhooks/gallabox
          </p>
          <p className="font-body text-[11px] text-brand-muted">
            Add this URL in your Gallabox dashboard → Settings → Webhooks to receive inbound messages.
          </p>
        </div>
      </div>
    </div>
  );
}
