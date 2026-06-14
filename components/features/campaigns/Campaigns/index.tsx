'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, RefreshCw, ImageIcon, CheckCircle, Loader2, AlertTriangle,
  ChevronDown, ChevronUp, Send, Calendar, Sparkles,
  Plus, X, XCircle, Wand2, MessageSquare, Pencil, RotateCcw, Mail, Layers,
} from 'lucide-react';
import { getSupabaseClient } from '../../../../supabase/supabase';
import type { Campaign, Quarter, CampaignChannel } from '../../../../lib/types/api/campaigns';
import { getQuarter, getDaysAway } from '../../../../lib/types/api/campaigns';
import {
  STATUS_LABELS,
  QUARTER_BADGE,
  type StatusTab, type QuarterGroup,
} from './types';
import { ApprovalModal } from './ApprovalModal';
import { CreateCampaignModal } from './CreateCampaignModal';
import { EditCampaignModal } from './EditCampaignModal';

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            px-4 py-3 rounded-[4px] shadow-lg font-mono text-[11px] uppercase tracking-label
            flex items-center gap-2
            ${t.type === 'success'
              ? 'bg-brand-yellow text-brand-navy border border-brand-yellow'
              : t.type === 'error'
              ? 'bg-red-700 text-white border border-red-500'
              : 'bg-brand-slate text-brand-offwhite border border-[rgba(59,91,173,0.18)]'}
          `}
        >
          {t.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
          {t.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function DaysAwayBadge({ dateStr }: { dateStr: string }) {
  const days = getDaysAway(dateStr);
  const style =
    days < 0
      ? 'border-red-500/40 text-red-400 bg-red-500/10'
      : days < 14
      ? 'border-brand-yellow/40 text-brand-yellow bg-brand-yellow/10'
      : days < 60
      ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
      : 'border-green-500/40 text-green-400 bg-green-500/10';
  return (
    <span className={`font-mono text-[10px] uppercase tracking-label px-2 py-0.5 border rounded-[4px] ${style}`}>
      {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  // Map to brand-friendly styles
  const styleMap: Record<string, string> = {
    draft:          'border-brand-muted/40 text-brand-muted bg-brand-muted/10',
    pending:        'border-brand-blue/40 text-brand-offwhite bg-brand-blue/20',
    to_be_approved: 'border-brand-yellow/40 text-brand-yellow bg-brand-yellow/10',
    approved:       'border-green-500/40 text-green-400 bg-green-500/10',
    executed:       'border-brand-blue/40 text-brand-offwhite bg-brand-blue/20',
    rejected:       'border-red-500/40 text-red-400 bg-red-500/10',
  };
  const cls = styleMap[status] ?? 'border-brand-muted/40 text-brand-muted bg-brand-muted/10';
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-label px-2 py-0.5 border rounded-[4px] ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** Small pill showing which channel(s) the campaign targets */
function ChannelBadge({ channel, sendEmail }: { channel?: CampaignChannel | null | undefined; sendEmail?: boolean | null | undefined }) {
  const effective: CampaignChannel = channel ?? (sendEmail ? 'both' : 'whatsapp');
  if (effective === 'email') return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-label px-2 py-0.5 border border-brand-blue/40 text-brand-blue bg-brand-blue/10 rounded-[4px]">
      <Mail className="w-3 h-3" /> Email
    </span>
  );
  if (effective === 'both') return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-label px-2 py-0.5 border border-brand-yellow/40 text-brand-yellow bg-brand-yellow/10 rounded-[4px]">
      <Layers className="w-3 h-3" /> Both
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-label px-2 py-0.5 border border-green-500/40 text-green-400 bg-green-500/10 rounded-[4px]">
      <MessageSquare className="w-3 h-3" /> WA
    </span>
  );
}

function getFestivalEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('diwali')) return '🪔';
  if (n.includes('holi')) return '🎨';
  if (n.includes('eid')) return '🌙';
  if (n.includes('christmas') || n.includes('xmas')) return '🎄';
  if (n.includes('new year')) return '🎆';
  if (n.includes('raksha') || n.includes('rakhi')) return '🪢';
  if (n.includes('ganesh') || n.includes('chaturthi')) return '🐘';
  if (n.includes('navratri') || n.includes('durga')) return '🪷';
  if (n.includes('janmashtami') || n.includes('krishna')) return '🦚';
  if (n.includes('onam')) return '🌸';
  if (n.includes('pongal') || n.includes('makar')) return '🌾';
  if (n.includes('independence') || n.includes('republic')) return '🇮🇳';
  if (n.includes('valentine')) return '❤️';
  if (n.includes('mother')) return '💐';
  if (n.includes('father')) return '👔';
  return '🎉';
}

// (ActionsDropdown removed — actions are now in the campaign detail panel)

// ─── Campaign Row ─────────────────────────────────────────────────────────────
interface CampaignRowProps {
  campaign: Campaign;
  onClick: (campaign: Campaign) => void;
  generatingIds: Set<string>;
}

function CampaignRow({ campaign, onClick, generatingIds }: CampaignRowProps) {
  const quarter: Quarter = campaign.scheduled_at ? getQuarter(campaign.scheduled_at) : 'Q1';
  const isGenerating = generatingIds.has(campaign.id) || campaign.image_status === 'generating';

  return (
    <tr
      className="border-b border-[rgba(59,91,173,0.12)] hover:bg-brand-blue/10 transition-colors cursor-pointer"
      onClick={() => onClick(campaign)}
    >
      {/* Festival */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{getFestivalEmoji(campaign.festival ?? campaign.name)}</span>
          <div className="min-w-0">
            <p className="font-heading font-semibold text-brand-offwhite text-[13px] leading-tight truncate">{campaign.festival ?? campaign.name}</p>
            {campaign.festival && campaign.festival !== campaign.name && (
              <p className="font-mono text-[10px] text-brand-muted truncate">{campaign.name}</p>
            )}
          </div>
          {isGenerating && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-yellow shrink-0" />
          )}
        </div>
      </td>

      {/* Quarter */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center font-mono text-[10px] uppercase tracking-label px-2 py-0.5 border rounded-[4px] ${QUARTER_BADGE[quarter]}`}>{quarter}</span>
      </td>

      {/* Scheduled */}
      <td className="px-4 py-3 font-mono text-[12px] text-brand-muted">
        {campaign.scheduled_at
          ? new Date(campaign.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—'}
      </td>

      {/* Days away */}
      <td className="px-4 py-3">
        {campaign.scheduled_at ? <DaysAwayBadge dateStr={campaign.scheduled_at} /> : <span className="text-brand-muted text-[12px]">—</span>}
      </td>

      {/* Recipients / sent */}
      <td className="px-4 py-3">
        {campaign.status === 'executed' ? (
          <div>
            <p className="font-display font-bold text-brand-yellow text-[14px]">{campaign.sent_count ?? 0}</p>
            <p className="font-mono text-[9px] uppercase tracking-label text-brand-muted">sent</p>
          </div>
        ) : (
          <span className="font-heading font-medium text-brand-offwhite text-[13px]">{campaign.target_count ?? '—'}</span>
        )}
      </td>

      {/* Channel badge */}
      <td className="px-4 py-3">
        <ChannelBadge channel={campaign.channel} sendEmail={campaign.send_email} />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={campaign.status} />
      </td>
    </tr>
  );
}

// ─── Quarter Group Section ────────────────────────────────────────────────────
interface QuarterGroupSectionProps {
  group: QuarterGroup;
  onRowClick: (campaign: Campaign) => void;
  generatingIds: Set<string>;
}

function QuarterGroupSection({ group, onRowClick, generatingIds }: QuarterGroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { quarter, campaigns } = group;

  return (
    <div className="mb-6 border border-[rgba(59,91,173,0.18)] rounded-[4px] overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-5 py-3 bg-brand-slate border-b border-[rgba(59,91,173,0.18)] hover:bg-brand-blue/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`font-mono text-[10px] uppercase tracking-label px-2 py-0.5 border rounded-[4px] ${QUARTER_BADGE[quarter]}`}>{quarter}</span>
          <span className="font-heading font-semibold text-brand-offwhite text-[13px]">
            {quarter === 'Q1' ? 'Jan – Mar' : quarter === 'Q2' ? 'Apr – Jun' : quarter === 'Q3' ? 'Jul – Sep' : 'Oct – Dec'}
          </span>
          <span className="font-mono text-[10px] text-brand-muted uppercase tracking-label">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
          </span>
        </div>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-brand-muted stroke-[1.5]" />
          : <ChevronUp className="w-4 h-4 text-brand-muted stroke-[1.5]" />}
      </button>

      {!collapsed && (
        <div className="bg-brand-navy">
          <table className="w-full text-left table-fixed">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[9%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
            </colgroup>
            <thead>
              <tr className="bg-brand-slate border-b border-[rgba(59,91,173,0.18)]">
                {['Festival', 'Quarter', 'Scheduled', 'Days Away', 'Recipients', 'Channel', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-label text-brand-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <CampaignRow
                  key={c.id}
                  campaign={c}
                  onClick={onRowClick}
                  generatingIds={generatingIds}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Campaign Detail Panel ────────────────────────────────────────────────────
interface CampaignDetailPanelProps {
  campaign: Campaign;
  onClose: () => void;
  onEdit: (c: Campaign) => void;
  onGenerate: (id: string) => void;
  onApprove: (c: Campaign) => void;
  onReject: (c: Campaign) => void;
  onMoveToPending: (id: string) => void;
  onChannelChange: (id: string, ch: CampaignChannel) => void;
  generatingIds: Set<string>;
}

// Channel options shown in the detail panel picker
const DETAIL_CHANNEL_OPTIONS: Array<{ id: CampaignChannel; label: string; icon: React.ReactNode; desc: string }> = [
  { id: 'whatsapp', label: 'WhatsApp',       icon: <MessageSquare className="w-3.5 h-3.5 stroke-[1.5]" />, desc: 'Gallabox' },
  { id: 'email',    label: 'Email',          icon: <Mail          className="w-3.5 h-3.5 stroke-[1.5]" />, desc: 'Omnisend' },
  { id: 'both',     label: 'Both',           icon: <Layers        className="w-3.5 h-3.5 stroke-[1.5]" />, desc: 'WA + Email' },
];

function CampaignDetailPanel({
  campaign, onClose, onEdit, onGenerate, onApprove, onReject, onMoveToPending, onChannelChange, generatingIds,
}: CampaignDetailPanelProps) {
  const isGenerating = generatingIds.has(campaign.id) || campaign.image_status === 'generating';
  const effectiveChannel: CampaignChannel = campaign.channel ?? (campaign.send_email ? 'both' : 'whatsapp');
  const showWA    = effectiveChannel === 'whatsapp' || effectiveChannel === 'both';
  const showEmail = effectiveChannel === 'email'    || effectiveChannel === 'both';

  // Local channel picker state
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [pickerChannel, setPickerChannel] = useState<CampaignChannel>(effectiveChannel);

  function handlePickerSave() {
    onChannelChange(campaign.id, pickerChannel);
    setPickerOpen(false);
  }

  function handlePickerCancel() {
    setPickerChannel(effectiveChannel);
    setPickerOpen(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-navy border border-[rgba(59,91,173,0.18)] rounded-[4px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-[0_16px_64px_rgba(0,0,0,0.7)]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(59,91,173,0.18)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getFestivalEmoji(campaign.festival ?? campaign.name)}</span>
            <div>
              <h2 className="font-heading font-semibold text-brand-offwhite text-lg tracking-tight">{campaign.festival ?? campaign.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <StatusBadge status={campaign.status} />
                <ChannelBadge channel={campaign.channel} sendEmail={campaign.send_email} />
                {campaign.scheduled_at && (
                  <span className="font-mono text-[10px] uppercase tracking-label text-brand-muted flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(campaign.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-brand-muted hover:text-brand-yellow transition-colors rounded-[4px]">
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className={`grid gap-5 ${showWA && showEmail ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-lg mx-auto'}`}>
            {showWA && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 stroke-[1.5] text-green-400" />
                  <p className="font-mono text-[11px] uppercase tracking-label text-brand-muted">WhatsApp</p>
                </div>
                <div className="rounded-[4px] overflow-hidden border border-[rgba(59,91,173,0.18)] bg-brand-yellow/10 aspect-square flex items-center justify-center">
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-2 text-brand-yellow">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <p className="font-mono text-[11px] uppercase tracking-label">Generating…</p>
                    </div>
                  ) : campaign.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={campaign.image_url} alt="Campaign banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-brand-muted opacity-50">
                      <ImageIcon className="w-10 h-10" />
                      <p className="font-mono text-[11px] uppercase tracking-label">No image generated</p>
                    </div>
                  )}
                </div>
                {campaign.message_template && (
                  <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-4">
                    <p className="label-eyebrow text-brand-muted mb-2">Caption</p>
                    <p className="font-body text-[13px] text-brand-offwhite whitespace-pre-wrap leading-relaxed">{campaign.message_template}</p>
                  </div>
                )}
              </div>
            )}

            {showEmail && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 stroke-[1.5] text-brand-blue" />
                  <p className="font-mono text-[11px] uppercase tracking-label text-brand-muted">Email</p>
                </div>
                <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-3">
                  <p className="label-eyebrow text-brand-muted mb-1">Subject</p>
                  {campaign.email_subject
                    ? <p className="font-heading font-medium text-brand-offwhite text-[13px]">{campaign.email_subject}</p>
                    : <p className="font-body text-[13px] text-brand-muted italic">No subject set</p>}
                </div>
                <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-3">
                  <p className="label-eyebrow text-brand-muted mb-1">Body</p>
                  {(campaign.email_body || campaign.message_template)
                    ? <p className="font-body text-[13px] text-brand-offwhite whitespace-pre-wrap leading-relaxed">{campaign.email_body ?? campaign.message_template}</p>
                    : <p className="font-body text-[13px] text-brand-muted italic">No body set</p>}
                </div>
                {Array.isArray(campaign.email_attachments) && campaign.email_attachments.length > 0 ? (
                  <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-3">
                    <p className="label-eyebrow text-brand-muted mb-2">Attachments</p>
                    <div className="flex flex-col gap-1.5">
                      {(campaign.email_attachments as { name?: string; url?: string; path?: string }[]).map((att, i) => (
                        <a
                          key={i}
                          href={att.url ?? att.path ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-brand-navy border border-brand-blue/30 rounded-[4px] font-mono text-[11px] text-brand-blue hover:border-brand-yellow hover:text-brand-yellow transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{att.name ?? `Attachment ${i + 1}`}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-3">
                    <p className="label-eyebrow text-brand-muted mb-1">Attachments</p>
                    <p className="font-body text-[13px] text-brand-muted italic">No attachments</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-5 border-t border-[rgba(59,91,173,0.18)] shrink-0">
          <div className="flex flex-wrap gap-2 justify-end">
            {campaign.status !== 'executed' && (
              <div className="relative">
                {/* Channel picker trigger */}
                <button
                  onClick={() => { setPickerChannel(effectiveChannel); setPickerOpen((v) => !v); }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:border-brand-blue hover:text-brand-offwhite rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
                >
                  <Layers className="w-3.5 h-3.5 stroke-[1.5]" />
                  Channel: {effectiveChannel === 'whatsapp' ? 'WA' : effectiveChannel === 'email' ? 'Email' : 'Both'}
                </button>

                {/* Dropdown picker */}
                {pickerOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 bg-brand-navy border border-[rgba(59,91,173,0.3)] rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-10 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[rgba(59,91,173,0.18)]">
                      <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted">Select Channel</p>
                    </div>

                    <div className="px-4 py-3 space-y-2">
                      {DETAIL_CHANNEL_OPTIONS.map((opt) => {
                        const active = pickerChannel === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPickerChannel(opt.id)}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2.5 border rounded-[4px]
                              font-mono text-[11px] uppercase tracking-label transition-all text-left
                              ${active
                                ? 'border-brand-yellow bg-brand-yellow/10 text-brand-yellow'
                                : 'border-[rgba(59,91,173,0.2)] text-brand-muted hover:border-brand-blue/50 hover:text-brand-offwhite'}
                            `}
                          >
                            {/* Checkbox */}
                            <span className={`w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 transition-colors
                              ${active ? 'border-brand-yellow bg-brand-yellow' : 'border-brand-muted/40'}`}
                            >
                              {active && (
                                <svg viewBox="0 0 8 8" aria-hidden="true">
                                  <path d="M1 4l2 2 4-4" stroke="#1A2847" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                            {opt.icon}
                            <div>
                              <span>{opt.label}</span>
                              <span className="ml-1.5 font-body text-[10px] normal-case tracking-normal opacity-60">{opt.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Save / Cancel */}
                    <div className="flex gap-2 px-4 pb-4">
                      <button
                        onClick={handlePickerCancel}
                        className="flex-1 px-3 py-2 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:text-brand-offwhite rounded-[4px] font-mono text-[10px] uppercase tracking-label transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePickerSave}
                        className="flex-1 px-3 py-2 bg-brand-yellow text-brand-navy font-mono text-[10px] uppercase tracking-label rounded-[4px] hover:brightness-110 transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {campaign.status !== 'executed' && (
              <button
                onClick={() => { onClose(); onEdit(campaign); }}
                className="flex items-center gap-1.5 px-3 py-2 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:border-brand-yellow hover:text-brand-yellow rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
              >
                <Pencil className="w-3.5 h-3.5 stroke-[1.5]" /> Edit
              </button>
            )}

            {(campaign.status === 'pending' || campaign.status === 'to_be_approved') && !isGenerating && (
              <button
                onClick={() => onGenerate(campaign.id)}
                className="flex items-center gap-1.5 px-3 py-2 border border-brand-yellow/40 text-brand-yellow hover:bg-brand-yellow/10 rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 stroke-[1.5]" /> Generate Image
              </button>
            )}
            {isGenerating && (
              <span className="flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] text-brand-yellow">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…
              </span>
            )}

            {(campaign.status === 'rejected' || campaign.status === 'draft') && (
              <button
                onClick={() => { onMoveToPending(campaign.id); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-2 border border-brand-yellow/40 text-brand-yellow hover:bg-brand-yellow/10 rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[1.5]" /> Move to To Do
              </button>
            )}

            {campaign.status === 'to_be_approved' && (
              <button
                onClick={() => { onClose(); onReject(campaign); }}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
              >
                <XCircle className="w-3.5 h-3.5 stroke-[1.5]" /> Reject &amp; Regenerate
              </button>
            )}

            {campaign.status === 'to_be_approved' && (
              <button
                onClick={() => onApprove(campaign)}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-semibold text-[12px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </button>
            )}

            {campaign.status === 'executed' && campaign.executed_at && (
              <span className="flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] text-brand-muted">
                <Send className="w-3.5 h-3.5" />
                Sent {new Date(campaign.executed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {campaign.sent_count != null && ` · ${campaign.sent_count} recipients`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Rejection Modal ──────────────────────────────────────────────────────────
interface RejectionModalProps {
  campaign: Campaign;
  onClose: () => void;
  onRegenerated: (updated: Campaign) => void;
}

function RejectionModal({ campaign, onClose, onRegenerated }: RejectionModalProps) {
  const [captionPrompt, setCaptionPrompt] = useState(campaign.message_template ?? '');
  const [imagePrompt, setImagePrompt] = useState(campaign.festival ?? campaign.name);
  const [step, setStep] = useState<'edit' | 'preview' | 'generating'>('edit');
  const [previewCaption, setPreviewCaption] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setStep('generating');
    setError('');
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const captionRes = await fetch('/api/campaigns/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: captionPrompt, festival: campaign.festival ?? campaign.name }),
      });
      const captionData = await captionRes.json();
      if (!captionRes.ok) throw new Error(captionData.error ?? 'Caption generation failed');
      const newCaption: string = captionData.content ?? captionPrompt;

      const imgRes = await fetch('/api/campaigns/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ campaignId: campaign.id, festival: campaign.festival ?? campaign.name, theme: imagePrompt }),
      });
      const imgData = await imgRes.json();
      if (!imgRes.ok) throw new Error(imgData.error ?? 'Image generation failed');

      const updateRes = await fetch('/api/campaigns/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ campaignId: campaign.id, status: 'to_be_approved', message_template: newCaption }),
      });
      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.error ?? 'Update failed');

      setPreviewCaption(newCaption);
      setPreviewImageUrl(imgData.imageUrl ?? null);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('edit');
    }
  };

  const handleConfirm = async () => {
    const sb = getSupabaseClient();
    const { data } = await sb.from('campaigns').select('*').eq('id', campaign.id).single();
    if (data) onRegenerated(data as Campaign);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-navy border border-[rgba(59,91,173,0.18)] rounded-[4px] w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_16px_64px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between p-6 border-b border-[rgba(59,91,173,0.18)]">
          <div>
            <h2 className="font-heading font-semibold text-brand-offwhite flex items-center gap-2">
              <Wand2 className="w-5 h-5 stroke-[1.5] text-brand-yellow" /> Reject &amp; Regenerate
            </h2>
            <p className="font-body text-[12px] text-brand-muted mt-0.5">Edit prompts, then regenerate caption + image via Gemini</p>
          </div>
          <button onClick={onClose} className="p-2 text-brand-muted hover:text-brand-yellow transition-colors">
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {step === 'preview' ? (
            <>
              <div className="rounded-[4px] overflow-hidden border border-[rgba(59,91,173,0.18)] bg-brand-yellow/10">
                <div className="w-full aspect-square flex items-center justify-center overflow-hidden">
                  {previewImageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={previewImageUrl} alt="Regenerated banner" className="w-full h-full object-cover" />
                    : <ImageIcon className="w-8 h-8 text-brand-yellow opacity-40" />}
                </div>
              </div>
              <div>
                <p className="label-eyebrow text-brand-muted mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> New Caption
                </p>
                <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-4">
                  <p className="font-body text-[13px] text-brand-offwhite whitespace-pre-wrap leading-relaxed">{previewCaption}</p>
                </div>
              </div>
              <p className="font-body text-[13px] text-brand-muted text-center">Happy with the result? Confirm to send back for approval.</p>
            </>
          ) : (
            <>
              <div>
                <label className="label-eyebrow text-brand-muted mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Caption Prompt
                </label>
                <textarea
                  value={captionPrompt}
                  onChange={(e) => setCaptionPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe the message you want Gemini to write…"
                  className="w-full px-3 py-2.5 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] font-body text-[13px] text-brand-offwhite placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-yellow transition-colors resize-none"
                />
              </div>
              <div>
                <label className="label-eyebrow text-brand-muted mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Additional Image Context
                </label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Diwali, warm golden tones, diyas and rangoli"
                  className="w-full px-3 py-2.5 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] font-body text-[13px] text-brand-offwhite placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-yellow transition-colors resize-none"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-900/20 border border-red-500/40 rounded-[4px] font-body text-[13px] text-red-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-[rgba(59,91,173,0.18)] flex gap-3">
          {step === 'preview' ? (
            <>
              <button
                onClick={() => setStep('edit')}
                className="flex-1 px-4 py-3 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:border-brand-yellow hover:text-brand-yellow rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
              >
                Back &amp; Edit Again
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-semibold text-[12px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5"
              >
                <CheckCircle className="w-4 h-4" /> Confirm &amp; Send for Approval
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:border-brand-yellow hover:text-brand-yellow rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={step === 'generating' || !captionPrompt.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-blue hover:brightness-110 text-brand-offwhite font-heading font-semibold text-[12px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5 disabled:opacity-50"
              >
                {step === 'generating'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="w-4 h-4" /> Regenerate with Gemini</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main CampaignsPanel ──────────────────────────────────────────────────────
export function CampaignsPanel() {
  const supabase = getSupabaseClient();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [quarterFilter, setQuarterFilter] = useState<Quarter | ''>('');
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [approvalCampaign, setApprovalCampaign] = useState<Campaign | null>(null);
  const [rejectionCampaign, setRejectionCampaign] = useState<Campaign | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { toasts, show: showToast } = useToast();

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('scheduled_at', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setCampaigns((data as Campaign[]) ?? []);
    } catch (err) {
      showToast('Failed to load campaigns', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const filtered = useMemo(() => campaigns.filter((c) => {
    if (activeTab !== 'all' && c.status !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !(c.festival ?? '').toLowerCase().includes(q)) return false;
    }
    if (quarterFilter && c.scheduled_at && getQuarter(c.scheduled_at) !== quarterFilter) return false;
    return true;
  }), [campaigns, activeTab, search, quarterFilter]);

  const quarterGroups: QuarterGroup[] = useMemo(() => {
    const map: Record<Quarter, Campaign[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
    filtered.forEach((c) => { const q: Quarter = c.scheduled_at ? getQuarter(c.scheduled_at) : 'Q1'; map[q].push(c); });
    return (['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).filter((q) => map[q].length > 0).map((q) => ({ quarter: q, campaigns: map[q] }));
  }, [filtered]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;
    setGeneratingIds((prev) => new Set(prev).add(campaignId));
    setCampaigns((prev) => prev.map((c) => c.id === campaignId ? { ...c, image_status: 'generating' } : c));
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';
      const res = await fetch('/api/campaigns/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ campaignId, festival: campaign.festival ?? campaign.name, theme: campaign.festival ?? campaign.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setCampaigns((prev) => prev.map((c) => c.id === campaignId ? (data.campaign as Campaign) : c));
      showToast(`Image generated for ${campaign.festival ?? campaign.name}`, 'success');
    } catch (err) {
      setCampaigns((prev) => prev.map((c) => c.id === campaignId ? { ...c, image_status: 'not_generated' } : c));
      showToast(err instanceof Error ? err.message : 'Image generation failed', 'error');
    } finally {
      setGeneratingIds((prev) => { const next = new Set(prev); next.delete(campaignId); return next; });
    }
  }, [campaigns, showToast]);

  const handleApprove = useCallback(async (campaignId: string) => {
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';
      const res = await fetch('/api/campaigns/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ campaignId, status: 'approved' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Approval failed');
      setCampaigns((prev) => prev.map((c) => c.id === campaignId ? (data.campaign as Campaign) : c));
      showToast('Campaign approved and queued for sending', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed', 'error');
    }
  }, [showToast]);

  const handleReject = useCallback(async (campaignId: string) => {
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';
      const res = await fetch('/api/campaigns/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ campaignId, status: 'rejected' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Rejection failed');
      setCampaigns((prev) => prev.map((c) => c.id === campaignId ? (data.campaign as Campaign) : c));
      showToast('Campaign rejected', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Rejection failed', 'error');
    }
  }, [showToast]);

  const handleMoveToPending = useCallback(async (campaignId: string) => {
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';
      const res = await fetch('/api/campaigns/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ campaignId, status: 'pending' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to move campaign');
      setCampaigns((prev) => prev.map((c) => c.id === campaignId ? (data.campaign as Campaign) : c));
      showToast('Campaign moved to To Do', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  }, [showToast]);

  const handleChannelChange = useCallback(async (campaignId: string, channel: CampaignChannel) => {
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';
      const res = await fetch('/api/campaigns/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ campaignId, channel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Channel update failed');
      setCampaigns((prev) => prev.map((c) => c.id === campaignId ? (data.campaign as Campaign) : c));
      showToast(`Channel updated to ${channel}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Channel update failed', 'error');
    }
  }, [showToast]);

  const TABS: { id: StatusTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Backlogs' },
    { id: 'pending', label: 'To Do' },
    { id: 'to_be_approved', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'executed', label: 'Executed' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="flex flex-col h-full bg-brand-navy overflow-y-auto">
      {/* Header */}
      <div className="bg-brand-navy border-b border-[rgba(59,91,173,0.18)] px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-2">
            <Sparkles className="w-5 h-5 text-brand-yellow stroke-[1.5]" />
            <div>
              <p className="label-eyebrow text-brand-muted leading-none mb-0.5">Marketing</p>
              <h1 className="font-display font-bold text-brand-offwhite text-[20px] tracking-tighter leading-none">
                Campaigns
              </h1>
            </div>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 stroke-[1.5] text-brand-muted" />
            <input
              type="text"
              placeholder="Search campaigns or festivals…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] font-body text-[13px] text-brand-offwhite placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-yellow transition-colors"
            />
          </div>
          <select
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value as Quarter | '')}
            className="px-3 py-2 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] font-mono text-[11px] uppercase tracking-label text-brand-muted focus:outline-none focus:border-brand-yellow transition-colors"
          >
            <option value="">All Quarters</option>
            <option value="Q1">Q1 (Jan–Mar)</option>
            <option value="Q2">Q2 (Apr–Jun)</option>
            <option value="Q3">Q3 (Jul–Sep)</option>
            <option value="Q4">Q4 (Oct–Dec)</option>
          </select>
          <button
            onClick={loadCampaigns}
            className="p-2 text-brand-muted hover:text-brand-yellow border border-[rgba(59,91,173,0.18)] rounded-[4px] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 stroke-[1.5] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-semibold text-[12px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 stroke-[2]" /> New Campaign
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 shrink-0">
        <div className="flex gap-1 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-1 w-fit overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`
                px-3 py-1.5 rounded-[4px] font-mono text-[10px] uppercase tracking-label transition-colors whitespace-nowrap
                ${activeTab === id
                  ? 'bg-brand-yellow text-brand-navy font-bold'
                  : 'text-brand-muted hover:text-brand-offwhite hover:bg-brand-blue/20'}
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-brand-blue/30" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-yellow animate-spin" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-brand-muted gap-4">
            <div className="w-14 h-14 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] flex items-center justify-center">
              <Calendar className="w-7 h-7 stroke-[1.5] text-brand-blue" />
            </div>
            <div className="text-center">
              <p className="font-heading font-semibold text-brand-offwhite text-sm">No campaigns found</p>
              <p className="font-mono text-[11px] uppercase tracking-label text-brand-muted mt-1">
                {campaigns.length === 0 ? 'Create your first campaign' : 'Try adjusting filters'}
              </p>
            </div>
            {campaigns.length === 0 && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-semibold text-[12px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" /> New Campaign
              </button>
            )}
          </div>
        ) : (
          quarterGroups.map((group) => (
            <QuarterGroupSection
              key={group.quarter}
              group={group}
              onRowClick={setDetailCampaign}
              generatingIds={generatingIds}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateCampaignModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); void loadCampaigns(); }} />
      )}
      {approvalCampaign && (
        <ApprovalModal
          campaign={approvalCampaign}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setApprovalCampaign(null)}
        />
      )}
      {rejectionCampaign && (
        <RejectionModal
          campaign={rejectionCampaign}
          onClose={() => setRejectionCampaign(null)}
          onRegenerated={(updated) => {
            setCampaigns((prev) => prev.map((c) => c.id === updated.id ? updated : c));
            setRejectionCampaign(null);
            showToast('Campaign regenerated — ready for approval', 'success');
          }}
        />
      )}
      {detailCampaign && (
        <CampaignDetailPanel
          campaign={detailCampaign}
          onClose={() => setDetailCampaign(null)}
          onEdit={(c) => { setDetailCampaign(null); setEditCampaign(c); }}
          onGenerate={(id) => { handleGenerate(id); setDetailCampaign((prev) => prev ? { ...prev, image_status: 'generating' } : prev); }}
          onApprove={(c) => { setApprovalCampaign(c); setDetailCampaign(null); }}
          onReject={(c) => { setRejectionCampaign(c); setDetailCampaign(null); }}
          onMoveToPending={(id) => { handleMoveToPending(id); setDetailCampaign(null); }}
          onChannelChange={(id, ch) => { handleChannelChange(id, ch); setDetailCampaign((prev) => prev ? { ...prev, channel: ch } : prev); }}
          generatingIds={generatingIds}
        />
      )}
      {editCampaign && (
        <EditCampaignModal
          campaign={editCampaign}
          onClose={() => setEditCampaign(null)}
          onSaved={(updated) => {
            setCampaigns((prev) => prev.map((c) => c.id === updated.id ? updated : c));
            setEditCampaign(null);
            showToast('Campaign updated', 'success');
          }}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
