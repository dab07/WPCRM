'use client';

import { useState } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  Save,
} from 'lucide-react';
import type { PlatformName } from '@/lib/credentials/repo';
import type { CredentialStatus } from '@/lib/credentials/statusUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldDef {
  /** Internal key used as the body field name in the API call */
  key: string;
  /** Human-readable label shown above the input */
  label: string;
  /** Whether the field is optional */
  optional?: boolean;
}

export interface CredentialCardProps {
  platform: PlatformName;
  /** Display name shown in the card header, e.g. "Gallabox", "Meta Ads" */
  platformLabel: string;
  /** Field definitions for this platform */
  fields: FieldDef[];
  /** Status derived from the server-side credential row */
  initialStatus: CredentialStatus;
  /** ISO-8601 timestamp of last successful verification, or null */
  initialLastVerifiedAt: string | null;
  /** Called by the card before each API request to obtain the session JWT */
  getToken: () => Promise<string>;
}

// ---------------------------------------------------------------------------
// Per-platform field configuration (exported for use in CredentialManager)
// ---------------------------------------------------------------------------

export const PLATFORM_FIELDS: Record<PlatformName, FieldDef[]> = {
  gallabox: [
    { key: 'apiKey',     label: 'API Key' },
    { key: 'apiSecret',  label: 'API Secret' },
    { key: 'accountId',  label: 'Account ID' },
    { key: 'channelId',  label: 'WhatsApp Channel ID', optional: true },
  ],
  omnisend: [
    { key: 'apiKey', label: 'API Key' },
  ],
  shopify: [
    { key: 'shopDomain',    label: 'Shop Domain' },
    { key: 'clientId',      label: 'Client ID' },
    { key: 'clientSecret',  label: 'Client Secret' },
  ],
  meta_ads: [
    { key: 'accessToken',  label: 'Access Token' },
    { key: 'adAccountId',  label: 'Ad Account ID' },
  ],
  klaviyo: [
    { key: 'apiKey', label: 'API Key' },
  ],
};

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: CredentialStatus;
}

function CredentialStatusBadge({ status }: StatusBadgeProps) {
  if (status === 'not_configured') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label px-2.5 py-1 border border-brand-muted/40 text-brand-muted bg-brand-muted/10 rounded-[4px]">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-muted" />
        Not Configured
      </span>
    );
  }

  if (status === 'configured') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label px-2.5 py-1 border border-brand-blue/50 text-brand-blue bg-brand-blue/10 rounded-[4px]">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
        Configured
      </span>
    );
  }

  // verified
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label px-2.5 py-1 border border-green-500/40 text-green-400 bg-green-500/10 rounded-[4px]">
      <CheckCircle className="w-3 h-3" />
      Verified
    </span>
  );
}

// ---------------------------------------------------------------------------
// CredentialCard component
// ---------------------------------------------------------------------------

export function CredentialCard({
  platform,
  platformLabel,
  fields,
  initialStatus,
  initialLastVerifiedAt,
  getToken,
}: CredentialCardProps) {
  // ── Form state: one entry per field key ──────────────────────────────────
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.key, '']))
  );

  // ── Per-field password visibility toggles ───────────────────────────────
  const [showField, setShowField] = useState<Record<string, boolean>>(
    () => Object.fromEntries(fields.map((f) => [f.key, false]))
  );

  // ── Derived / remote state ───────────────────────────────────────────────
  const [status, setStatus] = useState<CredentialStatus>(initialStatus);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(initialLastVerifiedAt);

  // ── Loading flags ────────────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  // ── Message state ────────────────────────────────────────────────────────
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function updateValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function toggleShow(key: string) {
    setShowField((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function clearForm() {
    setValues(Object.fromEntries(fields.map((f) => [f.key, ''])));
  }

  function clearMessages() {
    setSaveError(null);
    setVerifyResult(null);
    setDeleteError(null);
  }

  // ── Save (PUT /api/credentials/{platform}) ───────────────────────────────

  async function handleSave() {
    // Validate required fields
    const missing = fields
      .filter((f) => !f.optional && !values[f.key]?.trim())
      .map((f) => f.label);

    if (missing.length > 0) {
      setSaveError(`Required: ${missing.join(', ')}`);
      return;
    }

    clearMessages();
    setSaving(true);

    try {
      const token = await getToken();
      const body: Record<string, string> = {};
      for (const f of fields) {
        const val = values[f.key]?.trim();
        if (val) {
          body[f.key] = val;
        }
      }

      const res = await fetch(`/api/credentials/${platform}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSaveError((json as { error?: string }).error ?? `Save failed (HTTP ${res.status})`);
        return;
      }

      // Success — clear form, update status
      clearForm();
      setStatus('configured');
      setLastVerifiedAt(null);
    } catch {
      setSaveError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Verify (POST /api/credentials/{platform}/verify) ─────────────────────

  async function handleVerify() {
    clearMessages();
    setVerifying(true);

    try {
      const token = await getToken();
      const res = await fetch(`/api/credentials/${platform}/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 504) {
        setVerifyResult({ success: false, message: 'Connection timed out' });
        return;
      }

      if (res.status === 422) {
        setVerifyResult({ success: false, message: 'Credential data is corrupted' });
        return;
      }

      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (json.success) {
        setStatus('verified');
        setLastVerifiedAt(new Date().toISOString());
        setVerifyResult({ success: true, message: 'Verification successful' });
      } else {
        const raw = json.error ?? `Verification failed (HTTP ${res.status})`;
        // Cap error message at 200 characters per requirements 6.6
        const message = raw.length > 200 ? raw.slice(0, 200) : raw;
        setVerifyResult({ success: false, message });
      }
    } catch {
      setVerifyResult({ success: false, message: 'Network error — could not reach the server.' });
    } finally {
      setVerifying(false);
    }
  }

  // ── Delete (DELETE /api/credentials/{platform}) ───────────────────────────

  async function handleDelete() {
    clearMessages();
    setDeleting(true);

    try {
      const token = await getToken();
      const res = await fetch(`/api/credentials/${platform}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setDeleteError((json as { error?: string }).error ?? `Delete failed (HTTP ${res.status})`);
        return;
      }

      // Reset to not_configured
      clearForm();
      setStatus('not_configured');
      setLastVerifiedAt(null);
    } catch {
      setDeleteError('Network error — could not delete credentials.');
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const isLoading = saving || verifying || deleting;

  return (
    <div className="rounded-[6px] border border-brand-border bg-brand-slate overflow-hidden">
      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
        <div>
          <p className="font-heading text-[13px] font-semibold text-brand-offwhite leading-tight">
            {platformLabel}
          </p>
          <p className="font-mono text-[10px] text-brand-muted uppercase tracking-label mt-0.5">
            {platform.replace('_', ' ')}
          </p>
        </div>

        <CredentialStatusBadge status={status} />
      </div>

      {/* ── Card body ───────────────────────────────────────────────────── */}
      <div className="px-5 py-5 space-y-4">

        {/* Last verified timestamp */}
        {status === 'verified' && lastVerifiedAt && (
          <p className="font-body text-[11px] text-brand-muted">
            Last verified: {new Date(lastVerifiedAt).toLocaleString()}
          </p>
        )}

        {/* Credential input fields */}
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`${platform}-${field.key}`}
                className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5"
              >
                {field.label}
                {!field.optional && (
                  <span className="text-red-400 ml-1" aria-hidden="true">*</span>
                )}
                {field.optional && (
                  <span className="text-brand-muted/60 ml-1 normal-case not-italic">(optional)</span>
                )}
              </label>
              <div className="relative">
                <input
                  id={`${platform}-${field.key}`}
                  type={showField[field.key] ? 'text' : 'password'}
                  value={values[field.key]}
                  onChange={(e) => updateValue(field.key, e.target.value)}
                  placeholder={`Enter ${field.label}`}
                  disabled={isLoading}
                  autoComplete="off"
                  className="
                    w-full bg-brand-navy border border-[rgba(59,91,173,0.3)] rounded-[4px]
                    px-3 py-2 pr-10 font-mono text-[12px] text-brand-offwhite
                    placeholder:text-brand-muted/50 focus:outline-none
                    focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                  "
                />
                <button
                  type="button"
                  onClick={() => toggleShow(field.key)}
                  disabled={isLoading}
                  aria-label={
                    showField[field.key]
                      ? `Hide ${field.label}`
                      : `Show ${field.label}`
                  }
                  className="
                    absolute right-3 top-1/2 -translate-y-1/2
                    text-brand-muted hover:text-brand-offwhite
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-yellow rounded-[2px]
                  "
                >
                  {showField[field.key]
                    ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                    : <Eye className="w-3.5 h-3.5" aria-hidden="true" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Verify result banner */}
        {verifyResult && (
          <div
            role="status"
            aria-live="polite"
            className={`
              flex items-start gap-2 rounded-[4px] border px-3 py-2.5 text-[12px] font-body
              ${verifyResult.success
                ? 'border-green-500/30 bg-green-500/5 text-green-400'
                : 'border-red-500/30 bg-red-500/5 text-red-400'}
            `}
          >
            {verifyResult.success
              ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              : <XCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />}
            <span>{verifyResult.message}</span>
          </div>
        )}

        {/* Save error banner */}
        {saveError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[4px] border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-[12px] font-body text-red-400"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Delete error banner */}
        {deleteError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[4px] border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-[12px] font-body text-red-400"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{deleteError}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-1 flex-wrap">
          {/* Save button — always shown */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            aria-label={`Save credentials for ${platformLabel}`}
            className="
              flex items-center gap-2 px-4 py-2 rounded-[4px]
              bg-brand-yellow text-brand-navy
              font-heading font-bold text-[11px] uppercase tracking-label
              hover:brightness-110 hover:-translate-y-0.5
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow
            "
          >
            {saving
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              : <Save className="w-3.5 h-3.5" aria-hidden="true" />}
            {saving ? 'Saving…' : 'Save'}
          </button>

          {/* Verify button — shown when configured or verified */}
          {(status === 'configured' || status === 'verified') && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={isLoading}
              aria-label={`Verify credentials for ${platformLabel}`}
              className="
                flex items-center gap-2 px-4 py-2 rounded-[4px]
                bg-brand-yellow text-brand-navy
                font-heading font-bold text-[11px] uppercase tracking-label
                hover:brightness-110 hover:-translate-y-0.5
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow
              "
            >
              {verifying
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                : <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />}
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
          )}

          {/* Delete button — shown when not in not_configured state */}
          {status !== 'not_configured' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              aria-label={`Delete credentials for ${platformLabel}`}
              className="
                flex items-center gap-2 px-4 py-2 rounded-[4px]
                border border-red-500/40 text-red-400
                font-mono text-[11px] uppercase tracking-label
                hover:bg-red-500/10
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50
              "
            >
              {deleting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                : <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
