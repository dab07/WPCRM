'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Rocket,
  CheckCircle,
  AlertTriangle,
  Loader2,
  MessageSquare,
  Mail,
  Layers,
  ImageIcon,
  Users,
  Calendar,
  ArrowRight,
  RefreshCw,
  Tag,
  Hash,
  Link2,
  Percent,
} from 'lucide-react';
import type { Campaign } from '../../../../lib/types/api/campaigns';
import { getSupabaseClient } from '../../../../supabase/supabase';
import { parseChannels, CHANNEL_DEFS } from './ChannelPicker';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeployModalProps {
  campaign: Campaign;
  onClose: () => void;
  onDeployed: (updated: Campaign) => void;
}

type DeployStep = 'review' | 'deploying' | 'success' | 'error';

// ─── Attribute mapping definitions ────────────────────────────────────────────
interface AttributeRow {
  attribute: string;
  omnisend: string;
  gallabox: string;
  icon: React.ReactNode;
  /** Only show when these channels are active */
  showWhen?: 'whatsapp' | 'email' | 'both' | 'always';
}

const ATTRIBUTE_MAP: AttributeRow[] = [
  {
    attribute: 'Campaign Name',
    omnisend: 'Campaign name (internal)',
    gallabox: '—',
    icon: <Tag className="w-3.5 h-3.5" />,
    showWhen: 'always',
  },
  {
    attribute: 'Email Subject',
    omnisend: 'Subject line',
    gallabox: '—',
    icon: <Mail className="w-3.5 h-3.5" />,
    showWhen: 'email',
  },
  {
    attribute: 'Email Body',
    omnisend: 'HTML body content',
    gallabox: '—',
    icon: <Mail className="w-3.5 h-3.5" />,
    showWhen: 'email',
  },
  {
    attribute: 'WhatsApp Caption',
    omnisend: '—',
    gallabox: 'Message body / image caption',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    showWhen: 'whatsapp',
  },
  {
    attribute: 'Campaign Image',
    omnisend: 'Embedded <img> in email',
    gallabox: 'Image message attachment',
    icon: <ImageIcon className="w-3.5 h-3.5" />,
    showWhen: 'always',
  },
  {
    attribute: 'Target Tags',
    omnisend: 'Contact tags (upsert)',
    gallabox: 'Contact filter criteria',
    icon: <Tag className="w-3.5 h-3.5" />,
    showWhen: 'always',
  },
  {
    attribute: 'Contact Email',
    omnisend: 'Recipient email',
    gallabox: '—',
    icon: <Mail className="w-3.5 h-3.5" />,
    showWhen: 'email',
  },
  {
    attribute: 'Contact Phone',
    omnisend: '—',
    gallabox: 'Recipient phone number',
    icon: <Hash className="w-3.5 h-3.5" />,
    showWhen: 'whatsapp',
  },
  {
    attribute: 'Contact Name',
    omnisend: 'firstName / lastName',
    gallabox: '{{name}} personalization',
    icon: <Users className="w-3.5 h-3.5" />,
    showWhen: 'always',
  },
  {
    attribute: 'Campaign Type',
    omnisend: '—',
    gallabox: 'Standard / Discount / URL',
    icon: <Layers className="w-3.5 h-3.5" />,
    showWhen: 'whatsapp',
  },
  {
    attribute: 'Discount Code',
    omnisend: '—',
    gallabox: 'Interactive button text',
    icon: <Percent className="w-3.5 h-3.5" />,
    showWhen: 'whatsapp',
  },
  {
    attribute: 'Button URL',
    omnisend: '—',
    gallabox: 'CTA URL button',
    icon: <Link2 className="w-3.5 h-3.5" />,
    showWhen: 'whatsapp',
  },
];

function getVisibleAttributes(channel: string): AttributeRow[] {
  const channels = parseChannels(channel);
  return ATTRIBUTE_MAP.filter((row) => {
    if (row.showWhen === 'always') return true;
    if (row.showWhen === 'email') return channels.includes('omnisend_email');
    if (row.showWhen === 'whatsapp') return channels.includes('gallabox');
    return true;
  });
}

// ─── Channel Badge (inline) ───────────────────────────────────────────────────
function ChannelInfo({ channel }: { channel: string }) {
  const selectedChannels = parseChannels(channel);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {selectedChannels.map((chId, idx) => {
        const def = CHANNEL_DEFS.find(d => d.id === chId);
        if (!def) return null;
        return (
          <div key={chId} className="flex items-center gap-2">
            {idx > 0 && <span className="font-mono text-[10px] text-brand-muted">+</span>}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border ${def.borderColor} ${def.bgColor} rounded-[4px]`}>
              <span className={def.iconColor}>{def.icon}</span>
              <span className={`font-mono text-[11px] uppercase tracking-label ${def.iconColor}`}>{def.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Deploy Modal ─────────────────────────────────────────────────────────────
export function DeployModal({ campaign, onClose, onDeployed }: DeployModalProps) {
  const [step, setStep] = useState<DeployStep>('review');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<{ sent: number; channel: string } | null>(null);
  const [contactCount, setContactCount] = useState<number | null>(null);
  const [showMapping, setShowMapping] = useState(false);

  const effectiveChannel = campaign.channel ?? (campaign.send_email ? 'both' : 'whatsapp');
  const channels = parseChannels(effectiveChannel);
  const showWA = channels.includes('gallabox');
  const showEmail = channels.includes('omnisend_email');

  // Estimate recipient count
  useEffect(() => {
    async function fetchCount() {
      try {
        const sb = getSupabaseClient();
        const { data: { session } } = await sb.auth.getSession();
        const token = session?.access_token ?? 'anon';

        const res = await fetch(`/api/campaigns/estimate-contacts`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetTags: campaign.target_tags })
        });
        if (!res.ok) throw new Error();
        const { count } = await res.json();
        setContactCount(count);
      } catch {
        setContactCount(null);
      }
    }
    fetchCount();
  }, [campaign.target_tags]);

  const handleDeploy = useCallback(async () => {
    setStep('deploying');
    setErrorMessage('');

    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const res = await fetch('/api/campaigns/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ campaignId: campaign.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Deployment failed');
      }

      setResult({ sent: data.sent, channel: data.channel });
      setStep('success');

      // Fetch the updated campaign and notify parent
      const { data: updated } = await sb
        .from('campaigns')
        .select('*')
        .eq('id', campaign.id)
        .single();

      if (updated) {
        onDeployed(updated as Campaign);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Deployment failed');
      setStep('error');
    }
  }, [campaign.id, onDeployed]);

  const channelLabel =
    effectiveChannel === 'whatsapp' ? 'Gallabox (WhatsApp)' :
      effectiveChannel === 'email' ? 'Omnisend (Email)' :
        'Gallabox + Omnisend';

  const visibleAttributes = getVisibleAttributes(effectiveChannel);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-navy border border-[rgba(59,91,173,0.18)] rounded-[4px] w-full max-w-3xl max-h-[92vh] flex flex-col shadow-[0_16px_64px_rgba(0,0,0,0.7)]">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(59,91,173,0.18)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-yellow/10 border border-brand-yellow/30 rounded-[4px] flex items-center justify-center">
              <Rocket className="w-5 h-5 text-brand-yellow stroke-[1.5]" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-brand-offwhite text-lg tracking-tight">
                Deploy Campaign
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted mt-0.5">
                {campaign.festival ?? campaign.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-brand-muted hover:text-brand-yellow transition-colors rounded-[4px]"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Deploying state */}
          {step === 'deploying' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-brand-blue/30" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-yellow animate-spin" />
              </div>
              <p className="font-heading font-semibold text-brand-offwhite text-[15px]">
                Deploying to {channelLabel}…
              </p>
              <p className="font-mono text-[11px] uppercase tracking-label text-brand-muted">
                Sending messages to {contactCount ?? '—'} recipients
              </p>
            </div>
          )}

          {/* Success state */}
          {step === 'success' && result && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <p className="font-heading font-semibold text-brand-offwhite text-[15px]">
                Campaign Deployed Successfully
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] px-4 py-3 text-center">
                  <p className="font-display font-bold text-brand-yellow text-2xl">{result.sent}</p>
                  <p className="font-mono text-[9px] uppercase tracking-label text-brand-muted mt-1">Messages Sent</p>
                </div>
                <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] px-4 py-3 text-center">
                  <p className="font-heading font-semibold text-brand-offwhite text-sm capitalize">{result.channel}</p>
                  <p className="font-mono text-[9px] uppercase tracking-label text-brand-muted mt-1">Channel</p>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <p className="font-heading font-semibold text-brand-offwhite text-[15px]">
                Deployment Failed
              </p>
              <div className="flex items-center gap-2 px-4 py-3 bg-red-900/20 border border-red-500/40 rounded-[4px] max-w-md">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="font-body text-[13px] text-red-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Review state */}
          {step === 'review' && (
            <>
              {/* Deployment target */}
              <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-4">
                <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted mb-3">
                  Deploying To
                </p>
                <ChannelInfo channel={effectiveChannel} />
              </div>

              {/* Campaign summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left — preview */}
                <div className="space-y-3">
                  {/* Image */}
                  {campaign.image_url && (
                    <div className="rounded-[4px] overflow-hidden border border-[rgba(59,91,173,0.18)] bg-brand-yellow/10">
                      <div className="w-full aspect-video flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={campaign.image_url}
                          alt="Campaign banner"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* WA caption */}
                  {showWA && campaign.message_template && (
                    <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <MessageSquare className="w-3.5 h-3.5 text-green-400 stroke-[1.5]" />
                        <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted">
                          WhatsApp Caption
                        </p>
                      </div>
                      <p className="font-body text-[13px] text-brand-offwhite whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {campaign.message_template}
                      </p>
                    </div>
                  )}

                  {/* Email preview */}
                  {showEmail && (
                    <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-3 space-y-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Mail className="w-3.5 h-3.5 text-brand-blue stroke-[1.5]" />
                        <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted">
                          Email Preview
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-label text-brand-muted mb-0.5">Subject</p>
                        <p className="font-heading font-medium text-brand-offwhite text-[13px]">
                          {campaign.email_subject || <span className="italic text-brand-muted">No subject set</span>}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-label text-brand-muted mb-0.5">Body</p>
                        <p className="font-body text-[12px] text-brand-offwhite/80 whitespace-pre-wrap leading-relaxed line-clamp-3">
                          {campaign.email_body ?? campaign.message_template ?? <span className="italic text-brand-muted">No body</span>}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right — meta */}
                <div className="space-y-3">
                  {/* Recipients */}
                  <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users className="w-3.5 h-3.5 text-brand-muted stroke-[1.5]" />
                      <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted">
                        Estimated Recipients
                      </p>
                    </div>
                    <p className="font-display font-bold text-brand-yellow text-2xl">
                      {contactCount !== null ? contactCount : '…'}
                    </p>
                    {campaign.target_tags?.length ? (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {campaign.target_tags.map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[9px] uppercase tracking-label px-1.5 py-0.5 border border-brand-blue/30 text-brand-blue bg-brand-blue/10 rounded-[2px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="font-mono text-[10px] text-brand-muted mt-1">All contacts (no tag filter)</p>
                    )}
                  </div>

                  {/* Schedule */}
                  <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-brand-muted stroke-[1.5]" />
                      <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted">
                        Scheduled Date
                      </p>
                    </div>
                    <p className="font-heading font-medium text-brand-offwhite text-[13px]">
                      {campaign.scheduled_at
                        ? new Date(campaign.scheduled_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                        : 'Not scheduled'}
                    </p>
                  </div>

                  {/* WA campaign type */}
                  {showWA && campaign.wa_campaign_type && campaign.wa_campaign_type !== 'standard' && (
                    <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-3">
                      <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted mb-2">
                        WhatsApp Type
                      </p>
                      <span className="px-2 py-1 bg-brand-yellow/10 text-brand-yellow rounded-[2px] text-[10px] uppercase tracking-wider border border-brand-yellow/20 font-mono">
                        {campaign.wa_campaign_type === 'discount' ? 'Discount Campaign' : 'URL Button Campaign'}
                      </span>
                      {campaign.wa_campaign_type === 'discount' && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {campaign.discount_percentage != null && (
                            <div>
                              <p className="font-mono text-[9px] text-brand-muted uppercase">Discount</p>
                              <p className="font-body text-brand-yellow text-[13px] font-medium">{campaign.discount_percentage}%</p>
                            </div>
                          )}
                          {campaign.discount_code && (
                            <div>
                              <p className="font-mono text-[9px] text-brand-muted uppercase">Code</p>
                              <p className="font-mono text-brand-offwhite text-[13px] tracking-wider">{campaign.discount_code}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {campaign.wa_campaign_type === 'url_button' && campaign.wa_button_text && (
                        <div className="mt-2">
                          <p className="font-mono text-[9px] text-brand-muted uppercase">Button</p>
                          <p className="font-body text-brand-offwhite text-[13px]">{campaign.wa_button_text}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Attribute Mapping Section ───────────────────────────────── */}
              <div className="border border-[rgba(59,91,173,0.18)] rounded-[4px] overflow-hidden">
                <button
                  onClick={() => setShowMapping((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-brand-slate hover:bg-brand-blue/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-muted stroke-[1.5]" />
                    <p className="font-mono text-[11px] uppercase tracking-label text-brand-muted">
                      Attribute Mapping
                    </p>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 border border-green-500/30 text-green-400 bg-green-500/10 rounded-[2px]">
                      {visibleAttributes.length} fields
                    </span>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 text-brand-muted stroke-[1.5] transition-transform duration-200 ${showMapping ? 'rotate-90' : ''
                      }`}
                  />
                </button>

                {showMapping && (
                  <div className="bg-brand-navy">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-brand-slate border-b border-[rgba(59,91,173,0.18)]">
                          <th className="px-4 py-2 font-mono text-[9px] uppercase tracking-label text-brand-muted w-[30%]">
                            Attribute
                          </th>
                          {showEmail && (
                            <th className="px-4 py-2 font-mono text-[9px] uppercase tracking-label text-brand-blue w-[35%]">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Omnisend
                              </span>
                            </th>
                          )}
                          {showWA && (
                            <th className="px-4 py-2 font-mono text-[9px] uppercase tracking-label text-green-400 w-[35%]">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> Gallabox
                              </span>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleAttributes.map((row, i) => (
                          <tr
                            key={row.attribute}
                            className={`border-b border-[rgba(59,91,173,0.08)] ${i % 2 === 0 ? 'bg-brand-navy' : 'bg-brand-slate/30'
                              }`}
                          >
                            <td className="px-4 py-2">
                              <span className="flex items-center gap-1.5 font-body text-[12px] text-brand-offwhite">
                                {row.icon}
                                {row.attribute}
                              </span>
                            </td>
                            {showEmail && (
                              <td className="px-4 py-2 font-mono text-[11px] text-brand-muted">
                                {row.omnisend === '—' ? (
                                  <span className="text-brand-muted/40">—</span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-400/60 shrink-0" />
                                    {row.omnisend}
                                  </span>
                                )}
                              </td>
                            )}
                            {showWA && (
                              <td className="px-4 py-2 font-mono text-[11px] text-brand-muted">
                                {row.gallabox === '—' ? (
                                  <span className="text-brand-muted/40">—</span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-400/60 shrink-0" />
                                    {row.gallabox}
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="p-5 border-t border-[rgba(59,91,173,0.18)] shrink-0">
          {step === 'review' && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:border-brand-yellow hover:text-brand-yellow rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeploy}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-semibold text-[12px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5"
              >
                Deploy
              </button>
            </div>
          )}

          {step === 'deploying' && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px]">
              <Loader2 className="w-4 h-4 animate-spin text-brand-yellow" />
              <span className="font-mono text-[11px] uppercase tracking-label text-brand-muted">
                Processing…
              </span>
            </div>
          )}

          {step === 'success' && (
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-heading font-semibold text-[12px] uppercase tracking-label rounded-[4px] transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              Done
            </button>
          )}

          {step === 'error' && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:border-brand-yellow hover:text-brand-yellow rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
              >
                Close
              </button>
              <button
                onClick={handleDeploy}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-semibold text-[12px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Deployment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
