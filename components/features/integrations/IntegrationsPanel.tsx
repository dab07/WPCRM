'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plug } from 'lucide-react';
import { CredentialCard, PLATFORM_FIELDS } from '../settings/CredentialCard';
import { deriveStatus } from '@/lib/credentials/statusUtils';
import type { PlatformName } from '@/lib/credentials/repo';
import type { CredentialStatus } from '@/lib/credentials/statusUtils';
import { supabase } from '../../../supabase/supabase';

// ---------------------------------------------------------------------------
// Platform config — only the three we surface in Integrations
// ---------------------------------------------------------------------------

interface PlatformConfig {
  name: PlatformName;
  label: string;
  description: string;
  accentColor: string; // Tailwind colour token for the icon bg/border
  iconText: string;    // Two-letter abbreviation shown in the icon slot
}

const INTEGRATION_PLATFORMS: PlatformConfig[] = [
  {
    name: 'gallabox',
    label: 'Gallabox',
    description: 'WhatsApp Business messaging provider. Routes all outbound campaign messages and handles inbound webhook replies.',
    accentColor: '#25D366',
    iconText: 'GB',
  },
  {
    name: 'omnisend',
    label: 'Omnisend',
    description: 'Email marketing platform. Syncs contacts and fires broadcast email campaigns alongside WhatsApp.',
    accentColor: '#6C47FF',
    iconText: 'OM',
  },
  {
    name: 'shopify',
    label: 'Shopify',
    description: 'E-commerce integration. Syncs customers and orders, and triggers abandoned cart recovery flows.',
    accentColor: '#96BF48',
    iconText: 'SH',
  },
  {
    name: 'gemini',
    label: 'Google Gemini',
    description: 'AI model used for generating intelligent campaign briefs and content.',
    accentColor: '#4285F4',
    iconText: 'GM',
  },
  {
    name: 'openweathermap',
    label: 'OpenWeatherMap',
    description: 'Weather forecasting API used for detecting micromoment campaign triggers.',
    accentColor: '#EB6E4B',
    iconText: 'OW',
  },
];

// ---------------------------------------------------------------------------
// Status row type (matches GET /api/credentials/status response)
// ---------------------------------------------------------------------------

interface StatusRow {
  platformName: PlatformName;
  status: CredentialStatus;
  lastVerifiedAt: string | null;
}

// ---------------------------------------------------------------------------
// IntegrationsPanel
// ---------------------------------------------------------------------------

export function IntegrationsPanel() {
  const [statuses, setStatuses]     = useState<StatusRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<PlatformName | null>(null);

  // ── Token helper ──────────────────────────────────────────────────────────
  async function getToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }

  // ── Load credential statuses from API ─────────────────────────────────────
  const loadStatuses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/credentials/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { platforms: StatusRow[] };
      setStatuses(json.platforms ?? []);
    } catch (err) {
      setLoadError('Could not load integration status. Check your connection.');
      console.error('[IntegrationsPanel] loadStatuses error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  // ── Resolve per-platform status ───────────────────────────────────────────
  function getStatus(platform: PlatformName): { status: CredentialStatus; lastVerifiedAt: string | null } {
    const row = statuses.find(s => s.platformName === platform);
    return {
      status: deriveStatus(!!row, row?.lastVerifiedAt ?? null),
      lastVerifiedAt: row?.lastVerifiedAt ?? null,
    };
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-brand-blue" aria-label="Loading integrations" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="font-heading text-[18px] font-semibold text-brand-offwhite leading-tight">
          Integrations
        </h2>
        <p className="font-body text-[12px] text-brand-muted">
          Connect your platforms to enable campaigns, contact sync, and automated workflows.
        </p>
      </div>

      {/* ── Load error ──────────────────────────────────────────────────── */}
      {loadError && (
        <div className="rounded-[4px] border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12px] font-body text-red-400">
          {loadError}
        </div>
      )}

      {/* ── Platform cards ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        {INTEGRATION_PLATFORMS.map((platform) => {
          const { status, lastVerifiedAt } = getStatus(platform.name);
          const isExpanded = expandedCard === platform.name;

          return (
            <div
              key={platform.name}
              className="rounded-[6px] border border-brand-border bg-brand-slate overflow-hidden"
            >
              {/* ── Card summary row ──────────────────────────────────── */}
              <button
                type="button"
                onClick={() => setExpandedCard(isExpanded ? null : platform.name)}
                aria-expanded={isExpanded}
                className="
                  w-full flex items-center gap-4 px-5 py-4
                  hover:bg-brand-slate/80 transition-colors text-left
                "
              >
                {/* Platform icon */}
                <div
                  className="w-9 h-9 rounded-[4px] flex items-center justify-center shrink-0 font-mono font-bold text-[11px]"
                  style={{
                    background: `${platform.accentColor}18`,
                    border: `1px solid ${platform.accentColor}40`,
                    color: platform.accentColor,
                  }}
                >
                  {platform.iconText}
                </div>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-[13px] font-semibold text-brand-offwhite leading-tight">
                    {platform.label}
                  </p>
                  <p className="font-body text-[11px] text-brand-muted mt-0.5 truncate">
                    {platform.description}
                  </p>
                </div>

                {/* Status badge */}
                <StatusBadge status={status} />

                {/* Expand chevron */}
                <svg
                  className={`w-4 h-4 text-brand-muted shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* ── Expanded credential form ──────────────────────────── */}
              {isExpanded && (
                <div className="border-t border-brand-border">
                  <CredentialCard
                    platform={platform.name}
                    platformLabel={platform.label}
                    fields={PLATFORM_FIELDS[platform.name]}
                    initialStatus={status}
                    initialLastVerifiedAt={lastVerifiedAt}
                    getToken={getToken}
                    onStatusChange={loadStatuses}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom hint ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-[11px] font-body text-brand-muted/60 pt-2">
        <Plug className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          Credentials are encrypted with AES-256-GCM and stored in your Supabase Vault.
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge — Connected / Not connected only
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: CredentialStatus }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label px-2.5 py-1 border border-green-500/40 text-green-400 bg-green-500/10 rounded-[4px] shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label px-2.5 py-1 border border-brand-muted/40 text-brand-muted bg-brand-muted/10 rounded-[4px] shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-muted" />
      Not connected
    </span>
  );
}
