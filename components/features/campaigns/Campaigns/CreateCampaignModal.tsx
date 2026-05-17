'use client';

import { useState } from 'react';
import { X, Wand2, Loader2, AlertTriangle, Sparkles, CheckCircle } from 'lucide-react';
import { getSupabaseClient } from '../../../../supabase/supabase';

interface CreateCampaignModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EXAMPLE_PROMPTS = [
  'Diwali campaign on 20 Oct 2026 for all VIP customers',
  'Christmas sale campaign on 25 Dec 2026 targeting premium and loyal tags',
  'Holi greetings on 14 Mar 2027 for all contacts',
  'Eid Mubarak campaign on 30 Mar 2027 for active customers',
];

export function CreateCampaignModal({ onClose, onSuccess }: CreateCampaignModalProps) {
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState<'prompt' | 'generating' | 'preview'>('prompt');
  const [preview, setPreview] = useState<{
    name: string;
    festival: string;
    message_template: string;
    scheduled_at: string;
    target_tags: string[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStep('generating');
    setError('');

    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

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

Description: ${prompt}

Return ONLY valid JSON, no markdown, no explanation.`,
          festival: 'campaign',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');

      // Try to parse JSON from the response
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
      });
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('prompt');
    }
  };

  const handleCreate = async () => {
    if (!preview) return;
    setSaving(true);
    setError('');

    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              New Campaign
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Describe your campaign and AI will set it up</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {step === 'generating' ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
              <p className="font-medium">Generating campaign details…</p>
              <p className="text-sm text-slate-400">Gemini is crafting your campaign</p>
            </div>
          ) : step === 'preview' && preview ? (
            /* ── Preview ── */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Campaign details generated — review and confirm
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Campaign Name</label>
                  <input
                    value={preview.name}
                    onChange={(e) => setPreview({ ...preview, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Festival</label>
                  <input
                    value={preview.festival}
                    onChange={(e) => setPreview({ ...preview, festival: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">WhatsApp Caption</label>
                  <textarea
                    value={preview.message_template}
                    onChange={(e) => setPreview({ ...preview, message_template: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Scheduled Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={preview.scheduled_at ? preview.scheduled_at.slice(0, 16) : ''}
                    onChange={(e) => setPreview({ ...preview, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Target Tags</label>
                  <input
                    value={preview.target_tags.join(', ')}
                    onChange={(e) => setPreview({ ...preview, target_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                    placeholder="vip, premium, active"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-1">Comma-separated. Leave empty to target all contacts.</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          ) : (
            /* ── Prompt ── */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Describe your campaign</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="e.g. Diwali campaign on 20 Oct 2026 for VIP customers with a warm festive message"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm resize-none"
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                />
                <p className="text-xs text-slate-400 mt-1">Press Ctrl+Enter to generate</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Examples</p>
                <div className="flex flex-col gap-2">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setPrompt(ex)}
                      className="text-left text-xs px-3 py-2 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-lg text-slate-600 hover:text-violet-700 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
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
        <div className="p-6 border-t border-slate-200 flex gap-3">
          {step === 'preview' ? (
            <>
              <button
                onClick={() => { setStep('prompt'); setPreview(null); }}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
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
