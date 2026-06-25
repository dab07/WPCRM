'use client';

import { useState, useEffect } from 'react';
import {
  X, Wand2, Loader2, AlertTriangle, Sparkles, CheckCircle,
  MessageSquare, Mail, Layers, Smartphone, BarChart2,
} from 'lucide-react';
import { getSupabaseClient } from '../../../../supabase/supabase';
import { EmailComposerSection, type EmailComposerValue } from './EmailComposerSection';

// ── Channel type ──────────────────────────────────────────────────────────────
type Channel = 'whatsapp' | 'email' | 'both';

interface ChannelOption {
  id: Channel;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: <MessageSquare className="w-4 h-4 stroke-[1.5]" />,
    description: 'WhatsApp Business via Gallabox',
  },
  {
    id: 'email',
    label: 'Email',
    icon: <Mail className="w-4 h-4 stroke-[1.5]" />,
    description: 'Broadcast via Omnisend',
  },
  {
    id: 'both',
    label: 'WhatsApp + Email',
    icon: <Layers className="w-4 h-4 stroke-[1.5]" />,
    description: 'Both channels simultaneously',
  },
];

// Upcoming channels (disabled — shown greyed out)
const UPCOMING_CHANNELS = [
  { id: 'meta', label: 'Meta Ads', icon: <BarChart2 className="w-4 h-4 stroke-[1.5]" /> },
  { id: 'sms', label: 'SMS', icon: <Smartphone className="w-4 h-4 stroke-[1.5]" /> },
];

// ── Preview state ─────────────────────────────────────────────────────────────
interface PreviewState {
  name: string;
  festival: string;
  message_template: string;
  scheduled_at: string;
  target_tags: string[];
  channel: Channel;
  email: EmailComposerValue;
  wa_campaign_type: 'standard' | 'discount' | 'url_button';
  wa_button_text: string;
  wa_button_url: string;
  discount_code: string;
  discount_percentage: string;
}

interface CreateCampaignModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const INPUT_CLS = `
  w-full px-0 py-2.5 bg-transparent
  border-0 border-b border-[rgba(59,91,173,0.18)] rounded-none
  font-body text-[13px] text-brand-offwhite
  placeholder:text-brand-muted/50
  focus:outline-none focus:ring-0 focus:border-brand-yellow
  transition-colors
`;

const SELECT_ARROW_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23F7C31A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundPosition: 'right 0px center',
  backgroundRepeat: 'no-repeat',
  paddingRight: '24px'
};

const LABEL_CLS = 'block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5';

export function CreateCampaignModal({ onClose, onSuccess }: CreateCampaignModalProps) {
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState<'prompt' | 'generating' | 'preview'>('prompt');
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [guidelines, setGuidelines] = useState<Array<{ id: string; label: string; content: string; file_url?: string; logo_url?: string }>>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [brandGuidelines, setBrandGuidelines] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saveForFuture, setSaveForFuture] = useState(false);
  const [guidelineFile, setGuidelineFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    const loadGuidelines = async () => {
      try {
        const sb = getSupabaseClient();
        const { data: { session } } = await sb.auth.getSession();
        const token = session?.access_token ?? 'anon';
        const res = await fetch('/api/campaigns/guidelines', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await res.json();
        if (d?.guidelines) setGuidelines(d.guidelines);
      } catch (e) {
        console.error('Failed to load guidelines', e);
      }
    };
    loadGuidelines();
  }, []);

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStep('generating');
    setError('');
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      let uploadedFileUrl = '';
      let uploadedLogoUrl = '';
      if (saveForFuture && newLabel.trim()) {
        if (guidelineFile) {
          const ext = guidelineFile.name.split('.').pop();
          const filePath = `${Math.random().toString(36).slice(2)}_${Date.now()}.${ext}`;
          const { error: uploadError } = await sb.storage.from('brand-guidelines').upload(filePath, guidelineFile);
          if (uploadError) {
            console.error('Failed to upload guidelines file:', uploadError);
            setError(`Failed to upload guidelines: ${uploadError.message}`);
            setStep('prompt');
            return;
          }
          const { data: { publicUrl } } = sb.storage.from('brand-guidelines').getPublicUrl(filePath);
          uploadedFileUrl = publicUrl;
        }

        if (logoFile) {
          const ext = logoFile.name.split('.').pop();
          const filePath = `logos/${Math.random().toString(36).slice(2)}_${Date.now()}.${ext}`;
          const { error: uploadError } = await sb.storage.from('brand-guidelines').upload(filePath, logoFile);
          if (uploadError) {
            console.error('Failed to upload logo file:', uploadError);
            setError(`Failed to upload logo: ${uploadError.message}`);
            setStep('prompt');
            return;
          }
          const { data: { publicUrl } } = sb.storage.from('brand-guidelines').getPublicUrl(filePath);
          uploadedLogoUrl = publicUrl;
        }

        await fetch('/api/campaigns/guidelines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ label: newLabel.trim(), content: brandGuidelines, file_url: uploadedFileUrl, logo_url: uploadedLogoUrl })
        }).catch(e => console.error('Failed to save guideline:', e));
      }

      let fileUrl = '';
      let logoUrl = '';
      let currentBrandLabel = '';

      if (saveForFuture && newLabel.trim()) {
        fileUrl = uploadedFileUrl;
        logoUrl = uploadedLogoUrl;
        currentBrandLabel = newLabel.trim();
      } else {
        const found = guidelines.find((g) => g.label === selectedLabel);
        fileUrl = found?.file_url ?? '';
        logoUrl = found?.logo_url ?? '';
        currentBrandLabel = selectedLabel;
      }

      const res = await fetch('/api/campaigns/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt: `You are a campaign planning assistant. Based on the following description, extract and return a JSON object with these exact fields:
- name: campaign name (e.g. "Diwali 2026")
- festival: festival or event name (e.g. "Diwali")
- message_template: a warm WhatsApp message under 60 words with 1-2 emojis and {{name}} placeholder
- scheduled_at: ISO datetime string (infer from description, use 09:00 local if no time given)
- target_tags: array of tag strings (e.g. ["vip", "premium"])
- email_subject: an engaging email subject line
- email_body: a warm, professional email body (plain text, 3-5 paragraphs, use {{name}} placeholder)

Description: ${prompt}
${brandGuidelines ? `\nBrand guidelines: ${brandGuidelines}` : ''}

Return ONLY valid JSON, no markdown, no explanation.`,
          festival: 'campaign',
          fileUrl,
          logoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');

      const content: string = data.content ?? '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse campaign details from AI response');

      const parsed = JSON.parse(jsonMatch[0]);
      setPreview({
        name: parsed.name ?? prompt,
        festival: parsed.festival ?? parsed.name ?? prompt,
        message_template: parsed.message_template ?? '',
        scheduled_at: parsed.scheduled_at ?? '',
        target_tags: Array.isArray(parsed.target_tags) ? parsed.target_tags : [],
        channel: 'whatsapp',
        email: {
          subject: parsed.email_subject ?? '',
          body: parsed.email_body ?? '',
          attachments: [],
        },
        wa_campaign_type: 'standard',
        wa_button_text: '',
        wa_button_url: '',
        discount_code: '',
        discount_percentage: '',
      });
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('prompt');
    }
  };

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!preview) return;
    setSaving(true);
    setError('');
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const sendEmail = preview.channel === 'email' || preview.channel === 'both';
      const uploadedAttachments: { url: string; name: string; path: string }[] = [];

      if (sendEmail && preview.email.attachments.length > 0) {
        for (const att of preview.email.attachments) {
          if (!att.file) {
            if (att.url) uploadedAttachments.push({ url: att.url, name: att.name, path: att.path ?? '' });
            continue;
          }
          const ext = att.file.name.split('.').pop();
          const filePath = `${preview.name.replace(/[^a-zA-Z0-9]/g, '_')}/${Math.random().toString(36).slice(2)}_${Date.now()}.${ext}`;
          const { error: uploadError } = await sb.storage.from('campaign-attachments').upload(filePath, att.file);
          if (uploadError) throw new Error(`Attachment upload failed: ${uploadError.message}`);
          const { data: { publicUrl } } = sb.storage.from('campaign-attachments').getPublicUrl(filePath);
          uploadedAttachments.push({ url: publicUrl, name: att.file.name, path: filePath });
        }
      }

      const res = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: preview.name,
          festival: preview.festival,
          message_template: preview.message_template,
          scheduled_at: preview.scheduled_at,
          target_tags: preview.target_tags,
          status: 'draft',
          channel: preview.channel,
          send_email: sendEmail,
          email_subject: sendEmail ? preview.email.subject : null,
          email_body: sendEmail ? preview.email.body : null,
          email_attachments: sendEmail ? uploadedAttachments : [],
          wa_campaign_type: preview.wa_campaign_type,
          wa_button_text: preview.wa_button_text || null,
          wa_button_url: preview.wa_button_url || null,
          discount_code: preview.discount_code || null,
          discount_percentage: preview.discount_percentage ? Number(preview.discount_percentage) : null,
          brand_label: selectedLabel || newLabel.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create campaign');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  const showWhatsApp = preview?.channel === 'whatsapp' || preview?.channel === 'both';
  const showEmail = preview?.channel === 'email' || preview?.channel === 'both';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-navy border border-[rgba(59,91,173,0.18)] rounded-[4px] w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_16px_64px_rgba(0,0,0,0.7)]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(59,91,173,0.18)] shrink-0">
          <div>
            {/* Eyebrow */}
            <p className="font-mono text-[10px] uppercase tracking-label text-brand-yellow flex items-center gap-2 mb-1">
              <span className="inline-block w-8 h-[2px] bg-brand-yellow" />
              Marketing Intelligence
            </p>
            <h2 className="font-heading font-bold text-brand-offwhite text-[18px] tracking-tight flex items-center gap-2 leading-tight">
              <Sparkles className="w-5 h-5 stroke-[1.5] text-brand-yellow" />
              New Campaign
            </h2>
            <p className="font-body text-[12px] text-brand-muted mt-0.5">
              Describe your campaign — AI will set it up instantly
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-brand-muted hover:text-brand-yellow transition-colors rounded-[4px] focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-yellow"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Generating skeleton */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-brand-muted">
              <Loader2 className="w-10 h-10 animate-spin text-brand-yellow" />
              <p className="font-heading font-semibold text-brand-offwhite">Generating campaign details…</p>
              <p className="font-body text-[12px]">Gemini is crafting your campaign</p>
            </div>
          )}

          {/* Preview step */}
          {step === 'preview' && preview && (
            <div className="space-y-5">
              {/* Success banner */}
              <div className="flex items-center gap-2 px-4 py-3 border border-green-500/30 bg-green-500/5 rounded-[4px] font-mono text-[11px] uppercase tracking-label text-green-400">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Campaign generated — review and confirm below
              </div>

              {/* ── Channel selector ── */}
              <div>
                <p className={LABEL_CLS}>Select Channel</p>

                {/* Active channels */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {CHANNEL_OPTIONS.map((opt) => {
                    const active = preview.channel === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPreview(prev => prev ? { ...prev, channel: opt.id } : null)}
                        className={`
                          flex flex-col items-center gap-1.5 px-3 py-3 border rounded-[4px]
                          font-mono text-[11px] uppercase tracking-label transition-all
                          focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-yellow
                          ${active
                            ? 'border-brand-yellow bg-brand-yellow/10 text-brand-yellow'
                            : 'border-[rgba(59,91,173,0.3)] text-brand-muted hover:border-brand-blue/60 hover:text-brand-offwhite'}
                        `}
                      >
                        {/* Custom checkbox dot */}
                        <span className={`w-3 h-3 rounded-[2px] border flex items-center justify-center shrink-0
                          ${active ? 'border-brand-yellow bg-brand-yellow' : 'border-brand-muted/50'}`}
                        >
                          {active && (
                            <svg viewBox="0 0 8 8" className="w-2 h-2 fill-brand-navy" aria-hidden="true">
                              <path d="M1 4l2 2 4-4" stroke="#1A2847" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        {opt.icon}
                        <span>{opt.label}</span>
                        <span className="font-body text-[10px] normal-case tracking-normal text-center leading-tight opacity-70">
                          {opt.description}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Upcoming channels (disabled) */}
                <div className="flex gap-2">
                  {UPCOMING_CHANNELS.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center gap-2 px-3 py-2 border border-[rgba(59,91,173,0.15)] rounded-[4px] opacity-40 cursor-not-allowed"
                    >
                      {ch.icon}
                      <span className="font-mono text-[10px] uppercase tracking-label text-brand-muted">{ch.label}</span>
                      <span className="font-mono text-[9px] uppercase tracking-label text-brand-yellow/60 border border-brand-yellow/30 px-1.5 py-0.5 rounded-[2px]">
                        Soon
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Diagonal slash divider ── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-[1px] bg-[rgba(59,91,173,0.18)]" />
                <div className="w-10 h-[2px] bg-brand-yellow/60" style={{ transform: 'rotate(15deg)' }} aria-hidden="true" />
                <div className="flex-1 h-[1px] bg-[rgba(59,91,173,0.18)]" />
              </div>

              {/* ── Core fields ── */}
              <div className="space-y-3">
                <div>
                  <label className={LABEL_CLS}>Campaign Name</label>
                  <input value={preview.name} onChange={(e) => setPreview(prev => prev ? { ...prev, name: e.target.value } : null)} className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Festival / Event</label>
                  <input value={preview.festival} onChange={(e) => setPreview(prev => prev ? { ...prev, festival: e.target.value } : null)} className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Scheduled Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={preview.scheduled_at ? preview.scheduled_at.slice(0, 16) : ''}
                    onChange={(e) => setPreview(prev => prev ? { ...prev, scheduled_at: e.target.value } : null)}
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Target Tags</label>
                  <input
                    value={preview.target_tags.join(', ')}
                    onChange={(e) => setPreview(prev => prev ? { ...prev, target_tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) } : null)}
                    placeholder="vip, premium, active — leave empty for all contacts"
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              {/* ── WhatsApp section ── */}
              {showWhatsApp && (
                <div className="rounded-[4px] border border-green-500/20 bg-green-500/5 p-4 space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-label text-green-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 stroke-[1.5]" /> WhatsApp Message
                  </p>

                  <div>
                    <label className={LABEL_CLS}>Campaign Type</label>
                    <select
                      value={preview.wa_campaign_type}
                      onChange={(e) => setPreview(prev => prev ? { ...prev, wa_campaign_type: e.target.value as any } : null)}
                      className={`${INPUT_CLS} cursor-pointer appearance-none`}
                      style={SELECT_ARROW_STYLE}
                    >
                      <option value="standard" className="bg-[#1A2847]">Standard Message</option>
                      <option value="discount" className="bg-[#1A2847]">Discount Campaign (with Quick Reply code)</option>
                      <option value="url_button" className="bg-[#1A2847]">URL Button Campaign</option>
                    </select>
                  </div>

                  <textarea
                    value={preview.message_template}
                    onChange={(e) => setPreview(prev => prev ? { ...prev, message_template: e.target.value } : null)}
                    rows={4}
                    className={`${INPUT_CLS} resize-none border-green-500/20 focus:border-green-500/50`}
                  />

                  {preview.wa_campaign_type === 'discount' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Discount Percentage</label>
                        <input
                          type="number"
                          placeholder="e.g. 20"
                          value={preview.discount_percentage}
                          onChange={(e) => setPreview(prev => prev ? { ...prev, discount_percentage: e.target.value } : null)}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Discount Code</label>
                        <input
                          type="text"
                          placeholder="e.g. SUMMER20"
                          value={preview.discount_code}
                          onChange={(e) => setPreview(prev => prev ? { ...prev, discount_code: e.target.value } : null)}
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>
                  )}

                  {preview.wa_campaign_type === 'url_button' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Button Text</label>
                        <input
                          type="text"
                          placeholder="e.g. Shop Now"
                          value={preview.wa_button_text}
                          onChange={(e) => setPreview(prev => prev ? { ...prev, wa_button_text: e.target.value } : null)}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Button URL</label>
                        <input
                          type="url"
                          placeholder="e.g. https://store.com/sale"
                          value={preview.wa_button_url}
                          onChange={(e) => setPreview(prev => prev ? { ...prev, wa_button_url: e.target.value } : null)}
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Email section ── */}
              {showEmail && (
                <div className="rounded-[4px] border border-brand-blue/30 bg-brand-blue/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-label text-brand-blue flex items-center gap-1.5 mb-4">
                    <Mail className="w-3.5 h-3.5 stroke-[1.5]" /> Email via Omnisend
                  </p>
                  <EmailComposerSection
                    value={preview.email}
                    onChange={(email) => setPreview(prev => prev ? { ...prev, email } : null)}
                    campaignContext={`${preview.festival} — ${preview.name}`}
                    whatsappCaption={preview.message_template}
                    showAIGenerate
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 border border-red-500/30 bg-red-500/5 rounded-[4px] font-body text-[12px] text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>
          )}

          {/* Prompt step */}
          {step === 'prompt' && (
            <div className="space-y-5">
              <div>
                <label className={LABEL_CLS}>Describe your campaign</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="e.g. Diwali campaign on 20 Oct 2026 for VIP customers with a warm festive message"
                  className={`${INPUT_CLS} resize-none`}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                />
                <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted/50 mt-1">Press Ctrl+Enter to generate</p>
              </div>

              {/* Brand Guidelines */}
              <div className="space-y-2">
                <label className={LABEL_CLS}>Brand / Guidelines</label>
                <select
                  value={selectedLabel}
                  onChange={(e) => {
                    const label = e.target.value;
                    setSelectedLabel(label);
                    const found = guidelines.find((g) => g.label === label);
                    setBrandGuidelines(found?.content ?? '');
                    setNewLabel('');
                  }}
                  className={`${INPUT_CLS} cursor-pointer appearance-none`}
                  style={SELECT_ARROW_STYLE}
                >
                  <option value="" className="bg-[#1A2847]">Select a Brand…</option>
                  {guidelines.map((g) => (
                    <option key={g.id} value={g.label} className="bg-[#1A2847]">{g.label}</option>
                  ))}
                </select>
                <textarea
                  placeholder="Or write custom brand guidelines here"
                  value={brandGuidelines}
                  onChange={(e) => { setBrandGuidelines(e.target.value); setSelectedLabel(''); }}
                  rows={3}
                  className={`${INPUT_CLS} resize-none`}
                />

                <div className="flex flex-col gap-2 mt-2">
                  <label className={LABEL_CLS}>Upload Guidelines Document (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          setError('File size must be less than 2MB');
                          e.target.value = '';
                          return;
                        }
                        setError('');
                        setGuidelineFile(file);
                      } else {
                        setGuidelineFile(null);
                      }
                    }}
                    className="text-[12px] text-brand-muted file:mr-4 file:py-2 file:px-4 file:rounded-[4px] file:border-0 file:text-[12px] file:font-semibold file:bg-brand-yellow/10 file:text-brand-yellow hover:file:bg-brand-yellow/20"
                  />
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <label className={LABEL_CLS}>Upload Brand Logo (Optional)</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          setError('Logo file size must be less than 2MB');
                          e.target.value = '';
                          return;
                        }
                        setError('');
                        setLogoFile(file);
                      } else {
                        setLogoFile(null);
                      }
                    }}
                    className="text-[12px] text-brand-muted file:mr-4 file:py-2 file:px-4 file:rounded-[4px] file:border-0 file:text-[12px] file:font-semibold file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20"
                  />
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <input
                    type="text"
                    placeholder="New Brand Name (optional)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className={`${INPUT_CLS} flex-1`}
                  />
                  <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-label text-brand-muted cursor-pointer select-none whitespace-nowrap">
                    <span className={`w-4 h-4 border rounded-[2px] flex items-center justify-center transition-colors
                      ${saveForFuture ? 'border-brand-yellow bg-brand-yellow' : 'border-brand-muted/50 bg-transparent'}`}
                      onClick={() => setSaveForFuture((v) => !v)}
                    >
                      {saveForFuture && (
                        <svg viewBox="0 0 8 8" className="w-2.5 h-2.5" aria-hidden="true">
                          <path d="M1 4l2 2 4-4" stroke="#1A2847" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    Save for future
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 border border-red-500/30 bg-red-500/5 rounded-[4px] font-body text-[12px] text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-t border-[rgba(59,91,173,0.18)] flex gap-3 shrink-0">
          {step === 'preview' ? (
            <>
              <button
                onClick={() => { setStep('prompt'); setPreview(null); }}
                className="flex-1 px-4 py-3 border border-[rgba(59,91,173,0.18)] text-brand-muted hover:border-brand-yellow hover:text-brand-yellow rounded-[4px] font-mono text-[11px] uppercase tracking-label transition-all"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-bold text-[12px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? 'Creating…' : 'Create Campaign'}
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
                disabled={!prompt.trim() || step === 'generating'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-bold text-[12px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
              >
                <Wand2 className="w-4 h-4" />
                Generate with AI
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
