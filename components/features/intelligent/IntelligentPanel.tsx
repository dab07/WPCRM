'use client';

import { useState, useEffect } from 'react';
import { Loader2, BrainCircuit, CheckCircle, AlertTriangle, CloudRain, CalendarDays, History, RotateCcw, PackageMinus, Plus, Info } from 'lucide-react';
import { getSupabaseClient } from '../../../supabase/supabase';
import type { CampaignSuggestion } from '../../../lib/types/campaign-suggestions';

type SignalTab = 'weather' | 'local_event' | 'history' | 'repurchase' | 'inventory';

const TABS: { id: SignalTab; label: string; icon: any }[] = [
  { id: 'weather', label: 'Weather & Location', icon: CloudRain },
  { id: 'local_event', label: 'Local Events', icon: CalendarDays },
  { id: 'history', label: 'History Campaigns', icon: History },
  { id: 'repurchase', label: 'Repurchase', icon: RotateCcw },
  { id: 'inventory', label: 'Inventory Clearance', icon: PackageMinus },
];

export function IntelligentPanel() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pushingId, setPushingId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<CampaignSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<SignalTab>('weather');
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupClosable, setPopupClosable] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('intelligent_campaign_suggestions');
      if (cached) {
        const parsed = JSON.parse(cached);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.timestamp < twentyFourHours) {
          setSuggestions(parsed.data);
        } else {
          localStorage.removeItem('intelligent_campaign_suggestions');
        }
      }
    } catch (e) {
      console.warn("Failed to load cached suggestions", e);
    }
  }, []);

  const generateSignals = async () => {
    setLoading(true);
    setError('');
    
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const res = await fetch('/api/campaigns/generate-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate campaign signals');

      setSuggestions(data.suggestions);
      try {
        localStorage.setItem('intelligent_campaign_suggestions', JSON.stringify({
          timestamp: Date.now(),
          data: data.suggestions
        }));
      } catch (e) {
        console.warn("Failed to save suggestions to cache", e);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    setSyncing(true);
    setError('');
    
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const res = await fetch('/api/campaigns/sync', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to sync data');
      
      // Could show a toast here, for now just relying on the button state to indicate success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong during sync');
    } finally {
      setSyncing(false);
    }
  };

  const pushToCampaign = async (suggestion: CampaignSuggestion, index: number) => {
    setPushingId(index);
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';
        
      const uniqueTag = suggestion.suggested_tag ?? `${suggestion.signal_type}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const payload = {
        name: suggestion.suggested_name,
        festival: suggestion.suggested_festival,
        message_template: suggestion.suggested_message,
        target_tags: [uniqueTag],
        scheduled_at: suggestion.suggested_scheduled_at,
        channel: suggestion.signal_type === 'weather' || suggestion.signal_type === 'local_event' ? 'gallabox,omnisend_email'
                 : suggestion.signal_type === 'repurchase' ? 'omnisend_email'
                 : suggestion.signal_type === 'inventory' ? 'omnisend_email,omnisend_sms'
                 : 'gallabox',
        send_email: suggestion.signal_type !== 'history',
        wa_campaign_type: 'standard',
        brand_label: 'Zavops',
        signal_source: suggestion.signal_type,
        metadata: suggestion.metadata
      };

      const res = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create campaign');

      setShowPopup(true);
      setPopupClosable(false);
      setTimeout(() => {
        setPopupClosable(true);
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setPushingId(null);
    }
  };

  const filteredSuggestions = suggestions.filter(s => s.signal_type === activeTab);

  return (
    <div className="h-full overflow-y-auto w-full px-4">
      <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-8 pb-24">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-brand-yellow/10 rounded-full flex items-center justify-center">
            <BrainCircuit className="w-8 h-8 text-brand-yellow" />
          </div>
          <div>
            <h2 className="font-display font-bold text-brand-offwhite text-2xl tracking-tight">Intelligent Campaigns</h2>
            <p className="font-body text-brand-muted max-w-lg mt-2 mx-auto">
              ZavopsAI scans your real-time customer locations, local events, order repurchase cycles, and inventory to suggest hyper-targeted campaigns.
            </p>
            <p className="text-[11px] text-brand-yellow/80 mt-1 uppercase tracking-label font-mono font-medium bg-brand-yellow/10 inline-block px-2 py-0.5 rounded">
              Note: These suggested campaigns will disappear within the next 24 hours.
            </p>
          </div>
          <div className="flex gap-4 mt-2">
            <button
              onClick={syncData}
              disabled={syncing || loading}
              className="flex items-center gap-2 px-6 py-3 border border-brand-yellow/50 hover:bg-brand-yellow/10 text-brand-yellow font-heading font-semibold text-[13px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {syncing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Syncing...</>
              ) : (
                <><RotateCcw className="w-4 h-4" /> Sync Data</>
              )}
            </button>
            <button
              onClick={generateSignals}
              disabled={loading || syncing}
              className="flex items-center gap-2 px-8 py-3 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-semibold text-[13px] uppercase tracking-label rounded-[4px] transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Scanning Signals…</>
              ) : (
                <><BrainCircuit className="w-4 h-4" /> Generate</>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/40 rounded-[4px] text-red-300 flex items-center gap-2 font-mono text-[12px]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Tabs Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {TABS.map((tab) => {
                const count = suggestions.filter(s => s.signal_type === tab.id).length;
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-[4px] font-heading font-semibold text-[11px] tracking-label uppercase whitespace-nowrap transition-colors ${
                      isActive 
                        ? 'bg-brand-slate text-brand-yellow border-b-2 border-brand-yellow' 
                        : 'bg-transparent text-brand-muted hover:text-brand-offwhite hover:bg-brand-slate/50 border-b-2 border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-brand-yellow/20 text-brand-yellow' : 'bg-brand-navy border border-[rgba(59,91,173,0.3)] text-brand-muted'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuggestions.length === 0 ? (
                <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-[rgba(59,91,173,0.2)] rounded-[4px] bg-brand-slate/30 text-brand-muted">
                  <Info className="w-8 h-8 mb-3 opacity-50" />
                  <p className="font-body text-sm">No signals detected for this category right now.</p>
                </div>
              ) : (
                filteredSuggestions.map((suggestion, index) => (
                  <div key={index} className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-heading font-bold text-brand-offwhite text-md mb-1">{suggestion.title}</h4>
                        <p className="font-body text-xs text-brand-muted">{suggestion.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-mono uppercase shrink-0 ${
                        suggestion.urgency === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        suggestion.urgency === 'medium' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {suggestion.urgency} Priority
                      </span>
                    </div>

                    <div className="bg-brand-navy border border-[rgba(59,91,173,0.12)] p-3 rounded-[4px]">
                      <p className="label-eyebrow text-brand-muted mb-2">Suggested Message</p>
                      <p className="font-body text-sm text-brand-offwhite whitespace-pre-wrap">{suggestion.suggested_message}</p>
                    </div>

                    <div className="mt-auto pt-2 flex justify-between items-center">
                      <div className="text-[10px] font-mono text-brand-muted uppercase">
                        {suggestion.signal_type === 'inventory' && Boolean(suggestion.metadata?.is_clearance) && (
                          <span className="text-brand-yellow flex items-center gap-1">
                            <PackageMinus className="w-3 h-3" /> Creates Discount
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => pushToCampaign(suggestion, index)}
                        disabled={pushingId !== null}
                        className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:brightness-110 text-brand-offwhite font-heading font-semibold text-[11px] uppercase tracking-label rounded-[4px] transition-all disabled:opacity-50"
                      >
                        {pushingId === index ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Push to Campaigns
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-brand-navy/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-brand-slate border border-[rgba(59,91,173,0.3)] p-8 rounded-[8px] max-w-md text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="font-heading font-bold text-brand-offwhite text-xl mb-3">Campaign Created!</h3>
            <p className="font-body text-brand-muted text-sm mb-8 leading-relaxed">
              Your intelligent campaign has been pushed successfully. Please review the schedule and audience tags on the Campaigns page.
            </p>
            <button
              onClick={() => popupClosable && setShowPopup(false)}
              disabled={!popupClosable}
              className="w-full py-3 bg-brand-yellow hover:brightness-110 text-brand-navy font-heading font-bold text-[13px] uppercase tracking-label rounded-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {popupClosable ? 'Acknowledge & Close' : 'Please read (Wait 3s)...'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
