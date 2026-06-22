'use client';

import { useState } from 'react';
import { Loader2, Sparkles, BrainCircuit, CheckCircle, AlertTriangle } from 'lucide-react';
import { getSupabaseClient } from '../../../supabase/supabase';

export function IntelligentPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  const generateCampaign = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const res = await fetch('/api/campaigns/generate-intelligent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate intelligent campaign');

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  const createCampaignFromStrategy = async () => {
    if (!result) return;
    setLoading(true);
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const payload = {
        name: `${result.decision?.campaign_type} - ${result.decision?.contextual_trigger}`,
        festival: result.decision?.contextual_trigger || '',
        message_template: result.content?.whatsapp?.message_body || '',
        target_tags: [],
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        channel: result.strategy?.primary_channel?.includes('whatsapp') && result.strategy?.primary_channel?.includes('email') ? 'both' 
               : result.strategy?.primary_channel?.includes('email') ? 'email' 
               : 'whatsapp',
        send_email: result.strategy?.primary_channel?.includes('email'),
        email_subject: result.content?.email?.subject_line_options?.[0] || '',
        email_body: result.content?.email?.body_paragraph_1 || '',
        email_attachments: [],
        wa_campaign_type: result.content?.whatsapp?.wa_campaign_type || 'standard',
        wa_button_text: result.content?.whatsapp?.cta_button_text || null,
        wa_button_url: result.content?.whatsapp?.cta_button_url || null,
        discount_code: result.strategy?.discount_code || null,
        discount_percentage: result.strategy?.discount_percent || null,
      };

      const res = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create campaign');
      
      alert("Campaign created successfully! You can find it in the Pending or Backlog tab.");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="h-full overflow-y-auto w-full px-4">
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-8 pb-24">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-brand-yellow/10 rounded-full flex items-center justify-center">
            <BrainCircuit className="w-8 h-8 text-brand-yellow" />
          </div>
          <div>
            <h2 className="font-display font-bold text-brand-offwhite text-2xl tracking-tight">Intelligent Campaign</h2>
            <p className="font-body text-brand-muted max-w-lg mt-2">
              Let ZavopsAI analyze your Shopify and Omnisend data, weather patterns, and customer lifecycle to propose the best campaign right now.
            </p>
          </div>
          <button
            onClick={generateCampaign}
            disabled={loading}
            className="mt-2 flex items-center gap-2 px-6 py-3 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-semibold text-[13px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Signals…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Campaign</>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/40 rounded-[4px] text-red-300 flex items-center gap-2 font-mono text-[12px]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[rgba(59,91,173,0.18)]">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="font-heading font-semibold text-brand-offwhite text-lg">Proposed Strategy</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="label-eyebrow text-brand-muted mb-1">Decision</p>
                  <div className="bg-brand-navy p-3 rounded-[4px] border border-[rgba(59,91,173,0.12)]">
                    <p className="font-body text-sm text-brand-offwhite"><span className="text-brand-yellow font-bold">{result.decision?.campaign_type}</span> — {result.decision?.contextual_trigger}</p>
                    <p className="font-body text-xs text-brand-muted mt-2">{result.decision?.why_now}</p>
                  </div>
                </div>
                
                <div>
                  <p className="label-eyebrow text-brand-muted mb-1">Segment</p>
                  <div className="bg-brand-navy p-3 rounded-[4px] border border-[rgba(59,91,173,0.12)] font-body text-sm text-brand-offwhite">
                    {result.segment?.description}
                  </div>
                </div>

                <div>
                  <p className="label-eyebrow text-brand-muted mb-1">Strategy</p>
                  <div className="bg-brand-navy p-3 rounded-[4px] border border-[rgba(59,91,173,0.12)]">
                    <p className="font-mono text-xs text-brand-yellow mb-1 uppercase tracking-label">{result.strategy?.primary_channel}</p>
                    <p className="font-body text-sm text-brand-offwhite">{result.strategy?.objective}</p>
                    <p className="font-body text-xs text-brand-muted mt-1">{result.strategy?.offer_type}: {result.strategy?.offer_detail}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {result.content?.email && result.strategy?.primary_channel?.includes('email') && (
                  <div>
                    <p className="label-eyebrow text-brand-muted mb-1">Email Content</p>
                    <div className="bg-brand-navy p-3 rounded-[4px] border border-[rgba(59,91,173,0.12)] space-y-2">
                      <p className="font-heading text-sm font-semibold text-brand-offwhite">{result.content.email.headline}</p>
                      <p className="font-body text-xs text-brand-muted">{result.content.email.body_paragraph_1}</p>
                      <button className="px-3 py-1 bg-brand-blue text-brand-offwhite rounded-[4px] text-xs font-mono uppercase mt-2 w-full">{result.content.email.cta_text}</button>
                    </div>
                  </div>
                )}

                {result.content?.whatsapp && result.strategy?.primary_channel?.includes('whatsapp') && (
                  <div>
                    <p className="label-eyebrow text-brand-muted mb-1">WhatsApp Content</p>
                    <div className="bg-brand-navy p-3 rounded-[4px] border border-[rgba(59,91,173,0.12)]">
                      <p className="font-body text-xs text-brand-offwhite whitespace-pre-wrap">{result.content.whatsapp.message_body}</p>
                      
                      {result.content.whatsapp.wa_campaign_type === 'discount' && result.strategy?.discount_code && (
                        <div className="mt-2 bg-brand-slate p-2 rounded text-center border border-dashed border-[rgba(59,91,173,0.3)]">
                          <p className="font-mono text-xs text-brand-yellow">Use Code: {result.strategy.discount_code}</p>
                          {result.strategy.discount_percent > 0 && <p className="font-body text-[10px] text-brand-muted">{result.strategy.discount_percent}% OFF</p>}
                        </div>
                      )}
                      
                      {result.content.whatsapp.wa_campaign_type === 'url_button' && result.content.whatsapp.cta_button_url && (
                        <button className="px-3 py-1 border border-brand-yellow text-brand-yellow rounded-[4px] text-xs font-mono uppercase mt-3 w-full">
                          {result.content.whatsapp.cta_button_text} (Link)
                        </button>
                      )}

                      {result.content.whatsapp.wa_campaign_type !== 'url_button' && result.content.whatsapp.cta_button_text && (
                        <button className="px-3 py-1 border border-brand-yellow text-brand-yellow rounded-[4px] text-xs font-mono uppercase mt-3 w-full">
                          {result.content.whatsapp.cta_button_text}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <p className="label-eyebrow text-brand-muted mb-1">Projected Results</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-brand-navy p-2 rounded-[4px] border border-[rgba(59,91,173,0.12)] text-center">
                      <p className="font-display text-lg text-green-400">{result.projected_results?.estimated_open_rate_pct}%</p>
                      <p className="font-mono text-[10px] text-brand-muted uppercase">Est. Open</p>
                    </div>
                    <div className="bg-brand-navy p-2 rounded-[4px] border border-[rgba(59,91,173,0.12)] text-center">
                      <p className="font-display text-lg text-brand-yellow">{result.projected_results?.estimated_revenue}</p>
                      <p className="font-mono text-[10px] text-brand-muted uppercase">Est. Revenue</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={createCampaignFromStrategy}
                disabled={loading}
                className="px-6 py-2 bg-brand-yellow text-brand-navy font-heading font-semibold text-[13px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Campaign from Strategy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
