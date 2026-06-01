'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Wand2,
  Loader2,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  MessageSquare,
  Mail,
  Layers,
} from 'lucide-react';
import { getSupabaseClient } from '../../../../supabase/supabase';
import {
  EmailComposerSection,
  type EmailComposerValue,
} from './EmailComposerSection';

// ── Channel type ──────────────────────────────────────────────────────────────
type Channel = 'whatsapp' | 'email' | 'both';

interface ChannelOption {
  id: Channel;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  activeColor: string;
}

const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: <MessageSquare className="w-4 h-4" />,
    description: 'Send via WhatsApp only',
    color: 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50',
    activeColor: 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200',
  },
  {
    id: 'email',
    label: 'Email',
    icon: <Mail className="w-4 h-4" />,
    description: 'Send via Omnisend email only',
    color: 'border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50',
    activeColor: 'border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-200',
  },
  {
    id: 'both',
    label: 'Both',
    icon: <Layers className="w-4 h-4" />,
    description: 'WhatsApp + Email simultaneously',
    color: 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50',
    activeColor: 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200',
  },
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
}

interface CreateCampaignModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCampaignModal({ onClose, onSuccess }: CreateCampaignModalProps) {
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState<'prompt' | 'generating' | 'preview'>('prompt');
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [guidelines, setGuidelines] = useState<Array<{ id: string; label: string; content: string }>>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [brandGuidelines, setBrandGuidelines] = useState<string>('');
  const [newLabel, setNewLabel] = useState<string>('');
  const [saveForFuture, setSaveForFuture] = useState(false);

  // Load existing guidelines on mount
  useEffect(() => {
    fetch('/api/campaigns/guidelines')
      .then((res) => res.json())
      .then((data) => {
        if (data?.guidelines) setGuidelines(data.guidelines);
      })
      .catch((e) => console.error('Failed to load guidelines', e));
  }, []);

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStep('generating');
    setError('');

    try {
      const sb = getSupabaseClient();
      const {
        data: { session },
      } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const res = await fetch('/api/campaigns/generate-caption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      });
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('prompt');
    }
  };

  // ── Upload attachments & create ────────────────────────────────────────────
  const handleCreate = async () => {
    if (!preview) return;
    setSaving(true);
    setError('');

    try {
      const sb = getSupabaseClient();
      const {
        data: { session },
      } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const sendEmail = preview.channel === 'email' || preview.channel === 'both';

      // Upload any local File attachments
      const uploadedAttachments: { url: string; name: string; path: string }[] = [];
      if (sendEmail && preview.email.attachments.length > 0) {
        for (const att of preview.email.attachments) {
          if (!att.file) {
            // Already uploaded (has url)
            if (att.url) uploadedAttachments.push({ url: att.url, name: att.name, path: att.path ?? '' });
            continue;
          }
          const fileExt = att.file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          const filePath = `${preview.name.replace(/[^a-zA-Z0-9]/g, '_')}/${fileName}`;

          const { error: uploadError } = await sb.storage
            .from('campaign-attachments')
            .upload(filePath, att.file);

          if (uploadError) throw new Error(`Attachment upload failed: ${uploadError.message}`);

          const {
            data: { publicUrl },
          } = sb.storage.from('campaign-attachments').getPublicUrl(filePath);

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
          send_email: sendEmail,
          email_subject: sendEmail ? preview.email.subject : null,
          email_body: sendEmail ? preview.email.body : null,
          email_attachments: sendEmail ? uploadedAttachments : [],
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              New Campaign
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Describe your campaign and AI will set it up
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ── Generating ── */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
              <p className="font-medium">Generating campaign details…</p>
              <p className="text-sm text-slate-400">Gemini is crafting your campaign</p>
            </div>
          )}

          {/* ── Preview ── */}
          {step === 'preview' && preview && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Campaign details generated — review and confirm
              </div>

              {/* ── Channel selector ── */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Send via
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {CHANNEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPreview({ ...preview, channel: opt.id })}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        preview.channel === opt.id ? opt.activeColor : opt.color
                      }`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                      <span className="text-xs font-normal opacity-70 text-center leading-tight">
                        {opt.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Core fields ── */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Campaign Name
                  </label>
                  <input
                    value={preview.name}
                    onChange={(e) => setPreview({ ...preview, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Festival / Event
                  </label>
                  <input
                    value={preview.festival}
                    onChange={(e) => setPreview({ ...preview, festival: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Scheduled Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={preview.scheduled_at ? preview.scheduled_at.slice(0, 16) : ''}
                    onChange={(e) => setPreview({ ...preview, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Target Tags
                  </label>
                  <input
                    value={preview.target_tags.join(', ')}
                    onChange={(e) =>
                      setPreview({
                        ...preview,
                        target_tags: e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="vip, premium, active"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Comma-separated. Leave empty to target all contacts.
                  </p>
                </div>
              </div>

              {/* ── WhatsApp section ── */}
              {showWhatsApp && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp Message
                  </p>
                  <textarea
                    value={preview.message_template}
                    onChange={(e) =>
                      setPreview({ ...preview, message_template: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none bg-white"
                  />
                </div>
              )}

              {/* ── Email section ── */}
              {showEmail && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1.5 mb-4">
                    <Mail className="w-3.5 h-3.5" />
                    Email (via Omnisend)
                  </p>
                  <EmailComposerSection
                    value={preview.email}
                    onChange={(email) => setPreview({ ...preview, email })}
                    campaignContext={`${preview.festival} — ${preview.name}`}
                    whatsappCaption={preview.message_template}
                    showAIGenerate
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Prompt step ── */}
          {step === 'prompt' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Describe your campaign
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="e.g. Diwali campaign on 20 Oct 2026 for VIP customers with a warm festive message"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
                  }}
                />

                {/* Brand Guidelines */}
                <div className="mt-4 space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Brand Guidelines
                  </label>
                  <select
                    value={selectedLabel}
                    onChange={(e) => {
                      const label = e.target.value;
                      setSelectedLabel(label);
                      const found = guidelines.find((g) => g.label === label);
                      setBrandGuidelines(found?.content || '');
                      setNewLabel('');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a preset…</option>
                    {guidelines.map((g) => (
                      <option key={g.id} value={g.label}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Or write custom brand guidelines here"
                    value={brandGuidelines}
                    onChange={(e) => {
                      setBrandGuidelines(e.target.value);
                      setSelectedLabel('');
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="New label (optional)"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <label className="flex items-center space-x-1 text-sm">
                      <input
                        type="checkbox"
                        checked={saveForFuture}
                        onChange={(e) => setSaveForFuture(e.target.checked)}
                      />
                      <span>Save for future</span>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Press Ctrl+Enter to generate</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex gap-3 shrink-0">
          {step === 'preview' ? (
            <>
              <button
                onClick={() => {
                  setStep('prompt');
                  setPreview(null);
                }}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {saving ? 'Creating…' : 'Create Campaign'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || step === 'generating'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-sm disabled:opacity-50"
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
