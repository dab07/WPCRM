'use client';

import { useState } from 'react';
import {
  Mail,
  Paperclip,
  Wand2,
  Loader2,
  X,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { getSupabaseClient } from '../../../../supabase/supabase';

export interface EmailAttachment {
  /** Local File object — present before upload */
  file?: File;
  /** Remote URL — present after upload or when loaded from DB */
  url?: string;
  name: string;
  path?: string;
}

export interface EmailComposerValue {
  subject: string;
  body: string;
  attachments: EmailAttachment[];
}

interface EmailComposerSectionProps {
  value: EmailComposerValue;
  onChange: (value: EmailComposerValue) => void;
  /** Campaign name / festival used as context for AI generation */
  campaignContext?: string;
  /** WhatsApp caption used as seed for AI generation */
  whatsappCaption?: string;
  /** Whether to show the AI generate button */
  showAIGenerate?: boolean;
}

export function EmailComposerSection({
  value,
  onChange,
  campaignContext = '',
  whatsappCaption = '',
  showAIGenerate = true,
}: EmailComposerSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const update = (patch: Partial<EmailComposerValue>) =>
    onChange({ ...value, ...patch });

  // ── AI generate subject + body from campaign context ──────────────────────
  const handleAIGenerate = async () => {
    if (!campaignContext && !whatsappCaption) return;
    setGenerating(true);
    setGenError('');

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
          prompt: `Generate an email for the following campaign. Return ONLY valid JSON with two fields:
- subject: a compelling email subject line (max 80 chars)
- body: a warm, professional HTML-free email body (plain text, 3-5 short paragraphs, include {{name}} placeholder for personalisation)

Campaign: ${campaignContext}
WhatsApp caption (use as tone reference): ${whatsappCaption}

Return ONLY the JSON object, no markdown, no explanation.`,
          festival: campaignContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');

      const content: string = data.content ?? '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response');

      const parsed = JSON.parse(jsonMatch[0]);
      update({
        subject: parsed.subject ?? value.subject,
        body: parsed.body ?? value.body,
      });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // ── Attachment handling ───────────────────────────────────────────────────
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: EmailAttachment[] = Array.from(e.target.files).map((f) => ({
      file: f,
      name: f.name,
    }));
    update({ attachments: [...value.attachments, ...newFiles] });
    // Reset input so the same file can be re-added after removal
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    const next = [...value.attachments];
    next.splice(index, 1);
    update({ attachments: next });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Subject */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          Email Subject
        </label>
        <input
          type="text"
          value={value.subject}
          onChange={(e) => update({ subject: e.target.value })}
          placeholder="e.g. 🪔 Wishing you a bright Diwali!"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Email Body
          </label>
          {showAIGenerate && (
            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={generating || (!campaignContext && !whatsappCaption)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              {generating ? 'Generating…' : 'AI Generate'}
            </button>
          )}
        </div>
        <textarea
          value={value.body}
          onChange={(e) => update({ body: e.target.value })}
          rows={8}
          placeholder="Write your email body here, or use AI Generate to create one from your campaign details.&#10;&#10;Use {{name}} to personalise with the recipient's name."
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y font-mono leading-relaxed"
        />
        <p className="text-xs text-slate-400 mt-1">
          Use <code className="bg-slate-100 px-1 rounded">{'{{name}}'}</code> for personalisation. Plain text only — no HTML.
        </p>
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          Attachments
          {value.attachments.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">
              {value.attachments.length}
            </span>
          )}
        </label>

        {/* File list */}
        {value.attachments.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {value.attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate text-slate-700 font-medium">{att.name}</span>
                  {att.file && (
                    <span className="text-slate-400 shrink-0">
                      {formatBytes(att.file.size)}
                    </span>
                  )}
                  {att.url && !att.file && (
                    <span className="text-emerald-600 shrink-0">uploaded</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="shrink-0 p-0.5 text-red-400 hover:text-red-600 transition-colors"
                  aria-label={`Remove ${att.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone / picker */}
        <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-slate-300 hover:border-violet-400 rounded-xl cursor-pointer text-sm text-slate-500 hover:text-violet-600 transition-colors">
          <Paperclip className="w-4 h-4" />
          Add attachments
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleFilePick}
          />
        </label>
        <p className="text-xs text-slate-400 mt-1">
          PDF, images, documents — files are uploaded when you save the campaign.
        </p>
      </div>

      {/* AI error */}
      {genError && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {genError}
        </div>
      )}
    </div>
  );
}
