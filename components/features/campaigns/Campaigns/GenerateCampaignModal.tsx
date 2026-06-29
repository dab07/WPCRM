'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  X, Wand2, Loader2, AlertTriangle, CheckCircle, RefreshCw,
  ThermometerSun, ShoppingCart, Package, MapPin, Zap,
  ChevronRight, CalendarDays, History,
} from 'lucide-react';
import { getSupabaseClient } from '../../../../supabase/supabase';
import type { CampaignSuggestion } from '../../../../lib/types/campaign-suggestions';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GenerateCampaignModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'scanning' | 'results' | 'pushing' | 'done';

// ─── Scanner source config ────────────────────────────────────────────────────
const SCANNER_SOURCES = {
  weather: {
    key: 'weather',
    label: 'Weather & Seasonal',
    icon: ThermometerSun,
    desc: 'OpenWeatherMap — temperature thresholds',
    color: 'text-orange-400',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/5',
    pulse: 'bg-orange-400',
  },
  repurchase: {
    key: 'repurchase',
    label: 'Repurchase Timing',
    icon: ShoppingCart,
    desc: 'Shopify orders — avg window elapsed',
    color: 'text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/5',
    pulse: 'bg-sky-400',
  },
  inventory: {
    key: 'inventory',
    label: 'Inventory Clearance',
    icon: Package,
    desc: 'Shopify products — low stock variants',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/5',
    pulse: 'bg-purple-400',
  },
  local_event: {
    key: 'local_event',
    label: 'Local Event',
    icon: CalendarDays,
    desc: 'Local events from calendar',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/5',
    pulse: 'bg-purple-400'
  },
  history: {
    key: 'history',
    label: 'History',
    icon: CalendarDays,
    desc: 'Past campaigns',
    color: 'text-gray-400',
    border: 'border-gray-500/30',
    bg: 'bg-gray-500/5',
    pulse: 'bg-gray-400'
  }
} as const;

// ─── Urgency config ───────────────────────────────────────────────────────────
const URGENCY_CONFIG = {
  high:   { label: 'High',   cls: 'border-red-500/50 text-red-400 bg-red-500/10' },
  medium: { label: 'Medium', cls: 'border-amber-500/50 text-amber-400 bg-amber-500/10' },
  low:    { label: 'Low',    cls: 'border-green-500/50 text-green-400 bg-green-500/10' },
};

const SIGNAL_META = SCANNER_SOURCES;

// ─── Suggestion Card ──────────────────────────────────────────────────────────
interface SuggestionCardProps {
  suggestion: CampaignSuggestion;
  selected: boolean;
  onToggle: () => void;
  index: number;
}

function SuggestionCard({ suggestion, selected, onToggle, index }: SuggestionCardProps) {
  const meta = SIGNAL_META[suggestion.signal_type as keyof typeof SIGNAL_META] ?? SCANNER_SOURCES.weather;
  const Icon = meta.icon;
  const urgency = URGENCY_CONFIG[suggestion.urgency as keyof typeof URGENCY_CONFIG] ?? URGENCY_CONFIG.low;
  const scheduledDate = new Date(suggestion.suggested_scheduled_at);

  return (
    <button
      id={`suggestion-card-${index}`}
      type="button"
      onClick={onToggle}
      className={`
        w-full text-left p-4 rounded-[4px] border transition-all duration-150
        hover:brightness-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-yellow
        ${selected
          ? 'border-brand-yellow bg-brand-yellow/5 shadow-[0_0_0_1px_rgba(247,195,26,0.2)]'
          : `${meta.border} ${meta.bg} hover:border-opacity-60`
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <span
          className={`
            mt-0.5 w-4 h-4 rounded-[2px] border flex items-center justify-center shrink-0 transition-colors
            ${selected ? 'border-brand-yellow bg-brand-yellow' : 'border-brand-muted/40 bg-transparent'}
          `}
        >
          {selected && (
            <svg viewBox="0 0 8 8" className="w-2.5 h-2.5" aria-hidden="true">
              <path d="M1 4l2 2 4-4" stroke="#1A2847" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-label ${meta.color}`}>
              <Icon className="w-3 h-3 shrink-0" />
              {meta.label}
            </span>
            <span className={`font-mono text-[9px] uppercase tracking-label px-1.5 py-0.5 border rounded-[3px] ${urgency.cls}`}>
              {urgency.label}
            </span>
            <span className="font-mono text-[10px] text-brand-muted ml-auto">
              {scheduledDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          {/* Title */}
          <p className="font-heading font-semibold text-brand-offwhite text-[13px] leading-snug mb-1">
            {suggestion.title}
          </p>

          {/* Description */}
          <p className="font-body text-[11px] text-brand-muted leading-relaxed mb-2">
            {suggestion.description}
          </p>

          {/* Message preview */}
          <div className={`rounded-[3px] px-3 py-2 border ${meta.border}`}>
            <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1">
              Suggested Message
            </p>
            <p className="font-body text-[11px] text-brand-offwhite/80 leading-relaxed line-clamp-2">
              {suggestion.suggested_message}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Scanning View ────────────────────────────────────────────────────────────
function ScanningView({ error }: { error?: string }) {
  return (
    <div className="flex flex-col items-center py-8 gap-6">
      {/* Central spinner */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 border-brand-blue/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-yellow animate-spin" />
        <div className="absolute inset-2 rounded-full border border-brand-yellow/20 animate-pulse" />
        <Wand2 className="absolute inset-0 m-auto w-5 h-5 text-brand-yellow" />
      </div>

      <div className="text-center">
        <p className="font-heading font-semibold text-brand-offwhite text-[15px]">
          Scanning signals…
        </p>
        <p className="font-mono text-[11px] uppercase tracking-label text-brand-muted mt-1">
          Analysing live data from all sources
        </p>
      </div>

      {/* Source indicators */}
      <div className="w-full grid grid-cols-2 gap-3">
        {Object.values(SCANNER_SOURCES).map((src, i) => {
          const Icon = src.icon;
          return (
            <div
              key={src.key}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[4px] border ${src.border} ${src.bg}`}
              style={{ animationDelay: `${i * 200}ms` }}
            >
              {/* Pulsing dot */}
              <span className="relative flex shrink-0">
                <span className={`w-2 h-2 rounded-full ${src.pulse} animate-ping absolute opacity-75`} />
                <span className={`w-2 h-2 rounded-full ${src.pulse} relative`} />
              </span>
              <Icon className={`w-3.5 h-3.5 shrink-0 ${src.color}`} />
              <div className="min-w-0">
                <p className={`font-mono text-[10px] uppercase tracking-label ${src.color}`}>
                  {src.label}
                </p>
                <p className="font-body text-[10px] text-brand-muted truncate">{src.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="w-full flex items-start gap-2 px-4 py-3 bg-red-900/20 border border-red-500/40 rounded-[4px] font-body text-[12px] text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function GenerateCampaignModal({ onClose, onSuccess }: GenerateCampaignModalProps) {
  const [step, setStep] = useState<Step>('scanning');
  const [suggestions, setSuggestions] = useState<CampaignSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scanError, setScanError] = useState('');
  const [pushProgress, setPushProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [pushErrors, setPushErrors] = useState<string[]>([]);

  // ── Scan ──────────────────────────────────────────────────────────────────
  const runScan = useCallback(async () => {
    setStep('scanning');
    setScanError('');
    setSelected(new Set());

    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const res = await fetch('/api/campaigns/generate-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Scan failed');
      }

      setSuggestions(data.suggestions ?? []);
      setStep('results');
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed. Please try again.');
      setStep('results'); // show empty results + error
    }
  }, []);

  // Run scan on first mount
  useEffect(() => { runScan(); }, [runScan]);

  // ── Toggle selection ──────────────────────────────────────────────────────
  const toggleSelection = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // ── Push selected to campaigns ────────────────────────────────────────────
  const handlePush = async () => {
    const toCreate = Array.from(selected).map((i) => suggestions[i]);
    if (!toCreate.length) return;

    setStep('pushing');
    setPushProgress({ done: 0, total: toCreate.length });
    setPushErrors([]);

    const sb = getSupabaseClient();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token ?? 'anon';

    const errors: string[] = [];

    for (let i = 0; i < toCreate.length; i++) {
      const s = toCreate[i];
      if (!s) continue;
      try {
        const res = await fetch('/api/campaigns/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: s.suggested_name,
            festival: s.suggested_festival,
            message_template: s.suggested_message,
            scheduled_at: s.suggested_scheduled_at,
            status: 'pending',
            channel: 'whatsapp',
            send_email: false,
            target_tags: [],
            wa_campaign_type: 'standard',
            signal_source: s.signal_type,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          errors.push(`"${s.suggested_name}": ${d.error ?? 'Failed'}`);
        }
      } catch (err) {
        errors.push(`"${s.suggested_name}": ${err instanceof Error ? err.message : 'Network error'}`);
      }
      setPushProgress({ done: i + 1, total: toCreate.length });
    }

    setPushErrors(errors);
    setStep('done');
    if (!errors.length) {
      setTimeout(() => { onSuccess(); }, 800);
    }
  };

  const selectedCount = selected.size;
  const hasResults = suggestions.length > 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-navy border border-[rgba(59,91,173,0.18)] rounded-[4px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[0_16px_64px_rgba(0,0,0,0.7)]">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(59,91,173,0.18)] shrink-0">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-label text-brand-yellow flex items-center gap-2 mb-1">
              <span className="inline-block w-8 h-[2px] bg-brand-yellow" />
              Signal Intelligence
            </p>
            <h2 className="font-heading font-bold text-brand-offwhite text-[18px] tracking-tight flex items-center gap-2 leading-tight">
              <Wand2 className="w-5 h-5 stroke-[1.5] text-brand-yellow" />
              Generate Campaign
            </h2>
            <p className="font-body text-[12px] text-brand-muted mt-0.5">
              Live signals from weather, Shopify & local events
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-brand-muted hover:text-brand-yellow transition-colors rounded-[4px] focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-yellow"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Scanning step */}
          {step === 'scanning' && <ScanningView />}

          {/* Results step */}
          {(step === 'results') && (
            <div className="space-y-4">
              {scanError && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-900/20 border border-red-500/40 rounded-[4px] font-body text-[12px] text-red-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Some scanners failed: {scanError}</span>
                </div>
              )}

              {!hasResults ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-brand-muted">
                  <div className="w-14 h-14 rounded-full bg-brand-slate border border-[rgba(59,91,173,0.18)] flex items-center justify-center">
                    <Zap className="w-6 h-6 text-brand-blue" />
                  </div>
                  <div className="text-center">
                    <p className="font-heading font-semibold text-brand-offwhite text-sm">No signals detected</p>
                    <p className="font-mono text-[11px] uppercase tracking-label text-brand-muted mt-1">
                      All thresholds are within normal range
                    </p>
                    <p className="font-body text-[11px] text-brand-muted mt-2 max-w-xs">
                      Ensure <code className="text-brand-yellow">weather_configs</code> and <code className="text-brand-yellow">local_event_calendar</code> are populated in Supabase, and your Shopify connection is active.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-label text-brand-muted">
                      {suggestions.length} signal{suggestions.length !== 1 ? 's' : ''} detected
                      {selectedCount > 0 && (
                        <span className="ml-2 text-brand-yellow">· {selectedCount} selected</span>
                      )}
                    </p>
                    <button
                      onClick={() => {
                        if (selectedCount === suggestions.length) setSelected(new Set());
                        else setSelected(new Set(suggestions.map((_, i) => i)));
                      }}
                      className="font-mono text-[10px] uppercase tracking-label text-brand-muted hover:text-brand-yellow transition-colors"
                    >
                      {selectedCount === suggestions.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {suggestions.map((s, i) => (
                      <SuggestionCard
                        key={i}
                        index={i}
                        suggestion={s}
                        selected={selected.has(i)}
                        onToggle={() => toggleSelection(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Pushing step */}
          {step === 'pushing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-brand-blue/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-yellow animate-spin" />
                <CheckCircle className="absolute inset-0 m-auto w-5 h-5 text-brand-yellow" />
              </div>
              <div className="text-center">
                <p className="font-heading font-semibold text-brand-offwhite">
                  Creating {pushProgress.done} / {pushProgress.total}…
                </p>
                <p className="font-mono text-[11px] uppercase tracking-label text-brand-muted mt-1">
                  Pushing campaigns to queue
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xs h-1.5 bg-brand-slate rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-yellow rounded-full transition-all duration-300"
                  style={{ width: `${(pushProgress.done / pushProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Done step */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-14 gap-5">
              {pushErrors.length === 0 ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-heading font-semibold text-brand-offwhite text-[16px]">
                      {pushProgress.total} campaign{pushProgress.total !== 1 ? 's' : ''} created!
                    </p>
                    <p className="font-body text-[12px] text-brand-muted mt-1">
                      Added to your campaign queue with status <span className="text-brand-yellow">To Do</span>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="text-center w-full">
                    <p className="font-heading font-semibold text-brand-offwhite">
                      {pushProgress.total - pushErrors.length} created, {pushErrors.length} failed
                    </p>
                    <div className="mt-3 space-y-1.5 text-left">
                      {pushErrors.map((e, i) => (
                        <p key={i} className="font-body text-[11px] text-red-300 bg-red-900/20 border border-red-500/30 rounded-[3px] px-3 py-1.5">
                          {e}
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-t border-[rgba(59,91,173,0.18)] flex gap-3 shrink-0">
          {step === 'scanning' && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:border-brand-yellow hover:text-brand-yellow rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
            >
              Cancel
            </button>
          )}

          {step === 'results' && (
            <>
              <button
                onClick={runScan}
                className="flex items-center gap-2 px-4 py-3 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:border-brand-yellow hover:text-brand-yellow rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" /> Scan Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:border-brand-yellow hover:text-brand-yellow rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
              >
                Close
              </button>
              <button
                onClick={handlePush}
                disabled={selectedCount === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-bold text-[12px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:transform-none disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
                Push {selectedCount > 0 ? `${selectedCount} ` : ''}to Campaigns
              </button>
            </>
          )}

          {step === 'pushing' && (
            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-yellow/20 text-brand-yellow font-mono text-[11px] uppercase tracking-label rounded-[4px]">
              <Loader2 className="w-4 h-4 animate-spin" /> Creating campaigns…
            </div>
          )}

          {step === 'done' && (
            <>
              {pushErrors.length > 0 && (
                <button
                  onClick={runScan}
                  className="flex items-center gap-2 px-4 py-3 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:border-brand-yellow hover:text-brand-yellow rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" /> Scan Again
                </button>
              )}
              <button
                onClick={() => { onSuccess(); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-bold text-[12px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5"
              >
                <CheckCircle className="w-4 h-4" /> View Campaigns
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
