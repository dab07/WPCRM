'use client';


import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Settings,
  RefreshCw,
  ImageIcon,
  CheckCircle,
  Eye,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Send,
  Calendar,
  Users,
  Sparkles,
  BarChart3,
  Clock,
} from 'lucide-react';
import { getSupabaseClient } from '../../../../supabase/supabase';
import type { Campaign, Quarter } from '../../../../lib/types/api/campaigns';
import { getQuarter, getDaysAway } from '../../../../lib/types/api/campaigns';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  QUARTER_BADGE,
  QUARTER_COLORS,
  type StatusTab,
  type TabCount,
  type QuarterGroup,
} from './types';
import { ApprovalModal } from './ApprovalModal';
import { N8nWorkflowsModal } from './N8nWorkflowsModal';

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

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
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2 animate-in slide-in-from-right-4 ${
            t.type === 'success'
              ? 'bg-emerald-600'
              : t.type === 'error'
              ? 'bg-red-600'
              : 'bg-slate-800'
          }`}
        >
          {t.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
          {t.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Days Away Badge ──────────────────────────────────────────────────────────
function DaysAwayBadge({ dateStr }: { dateStr: string }) {
  const days = getDaysAway(dateStr);
  const color =
    days < 0
      ? 'text-red-600 bg-red-50'
      : days < 14
      ? 'text-red-500 bg-red-50'
      : days < 60
      ? 'text-amber-600 bg-amber-50'
      : 'text-emerald-600 bg-emerald-50';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Image Action Cell ────────────────────────────────────────────────────────
interface ImageActionProps {
  campaign: Campaign;
  onGenerate: (id: string) => void;
  onView: (campaign: Campaign) => void;
  generatingIds: Set<string>;
}

function ImageActionCell({ campaign, onGenerate, onView, generatingIds }: ImageActionProps) {
  const isGenerating = generatingIds.has(campaign.id) || campaign.image_status === 'generating';

  if (campaign.status === 'draft') {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed"
      >
        <ImageIcon className="w-3.5 h-3.5" />
        Generate
      </button>
    );
  }

  if (isGenerating) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Generating…
      </span>
    );
  }

  if (campaign.image_status === 'generated' && campaign.image_url) {
    return (
      <button
        onClick={() => onView(campaign)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
        View Image
      </button>
    );
  }

  if (campaign.status === 'pending') {
    return (
      <button
        onClick={() => onGenerate(campaign.id)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-400 hover:bg-amber-500 text-white rounded-lg transition-colors shadow-sm"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Generate
      </button>
    );
  }

  return null;
}

// ─── Campaign Row ─────────────────────────────────────────────────────────────
interface CampaignRowProps {
  campaign: Campaign;
  onGenerate: (id: string) => void;
  onView: (campaign: Campaign) => void;
  onApprove: (campaign: Campaign) => void;
  generatingIds: Set<string>;
}

function CampaignRow({ campaign, onGenerate, onView, onApprove, generatingIds }: CampaignRowProps) {
  const quarter: Quarter = campaign.scheduled_at ? getQuarter(campaign.scheduled_at) : 'Q1';

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      {/* Festival */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getFestivalEmoji(campaign.festival ?? campaign.name)}</span>
          <div>
            <p className="font-medium text-slate-900 text-sm leading-tight">
              {campaign.festival ?? campaign.name}
            </p>
            <p className="text-xs text-slate-400 truncate max-w-[160px]">{campaign.name}</p>
          </div>
        </div>
      </td>

      {/* Quarter */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${QUARTER_BADGE[quarter]}`}>
          {quarter}
        </span>
      </td>

      {/* Scheduled Date */}
      <td className="px-4 py-3 text-sm text-slate-600">
        {campaign.scheduled_at
          ? new Date(campaign.scheduled_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '—'}
      </td>

      {/* Days Away */}
      <td className="px-4 py-3">
        {campaign.scheduled_at ? <DaysAwayBadge dateStr={campaign.scheduled_at} /> : <span className="text-slate-400 text-xs">—</span>}
      </td>

      {/* Target Count */}
      <td className="px-4 py-3 text-sm text-slate-700 font-medium">
        {campaign.status === 'executed' ? (
          <div>
            <p className="font-semibold text-purple-700">{campaign.sent_count ?? 0}</p>
            <p className="text-xs text-slate-400">sent</p>
          </div>
        ) : (
          campaign.target_count ?? '—'
        )}
      </td>

      {/* Image */}
      <td className="px-4 py-3">
        <ImageActionCell
          campaign={campaign}
          onGenerate={onGenerate}
          onView={onView}
          generatingIds={generatingIds}
        />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={campaign.status} />
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {campaign.status === 'to_be_approved' && (
            <>
              <button
                onClick={() => onView(campaign)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
              <button
                onClick={() => onApprove(campaign)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Approve
              </button>
            </>
          )}
          {campaign.status === 'executed' && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Send className="w-3.5 h-3.5" />
              {campaign.executed_at
                ? new Date(campaign.executed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'Sent'}
            </span>
          )}
          {campaign.status === 'overdue' && (
            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Overdue
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Quarter Group ────────────────────────────────────────────────────────────
interface QuarterGroupSectionProps {
  group: QuarterGroup;
  onGenerate: (id: string) => void;
  onView: (campaign: Campaign) => void;
  onApprove: (campaign: Campaign) => void;
  generatingIds: Set<string>;
}

function QuarterGroupSection({ group, onGenerate, onView, onApprove, generatingIds }: QuarterGroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { quarter, campaigns } = group;
  const headerCls = QUARTER_COLORS[quarter];

  return (
    <div className="mb-6 rounded-xl border overflow-hidden shadow-sm">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={`w-full flex items-center justify-between px-5 py-3 border-b ${headerCls} transition-colors`}
      >
        <div className="flex items-center gap-3">
          <span className={`font-bold text-sm px-2.5 py-0.5 rounded-full ${QUARTER_BADGE[quarter]}`}>
            {quarter}
          </span>
          <span className="font-semibold text-sm">
            {quarter === 'Q1' ? 'Jan – Mar' : quarter === 'Q2' ? 'Apr – Jun' : quarter === 'Q3' ? 'Jul – Sep' : 'Oct – Dec'}
          </span>
          <span className="text-xs opacity-70">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</span>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronUp className="w-4 h-4 opacity-60" />}
      </button>

      {!collapsed && (
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Festival</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quarter</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Scheduled</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Days Away</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recipients</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Image</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <CampaignRow
                  key={c.id}
                  campaign={c}
                  onGenerate={onGenerate}
                  onView={onView}
                  onApprove={onApprove}
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

// ─── Image Preview Modal ──────────────────────────────────────────────────────
function ImagePreviewModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{campaign.festival ?? campaign.name}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            ✕
          </button>
        </div>
        {campaign.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={campaign.image_url} alt="Campaign banner" className="w-full object-contain max-h-[70vh]" />
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-400">No image available</div>
        )}
      </div>
    </div>
  );
}

// ─── Status Legend ────────────────────────────────────────────────────────────
function StatusLegend() {
  const items = [
    { status: 'draft', desc: 'Outside automation window' },
    { status: 'pending', desc: 'Ready for image generation' },
    { status: 'to_be_approved', desc: 'Waiting owner approval' },
    { status: 'approved', desc: 'Queued for sending' },
    { status: 'executed', desc: 'Completed' },
    { status: 'overdue', desc: 'Approval missed before schedule' },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(({ status, desc }) => (
        <div key={status} className="flex items-center gap-1.5">
          <StatusBadge status={status} />
          <span className="text-xs text-slate-500 hidden lg:inline">{desc}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Emoji helper ─────────────────────────────────────────────────────────────
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function FestivalCampaignDashboard() {
  const supabase = getSupabaseClient();

  // Data state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [festivalFilter, setFestivalFilter] = useState('');
  const [quarterFilter, setQuarterFilter] = useState<Quarter | ''>('');
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [approvalCampaign, setApprovalCampaign] = useState<Campaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [showN8n, setShowN8n] = useState(false);

  const { toasts, show: showToast } = useToast();

  // ── Load campaigns ──────────────────────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      setCampaigns((data as Campaign[]) ?? []);
    } catch (err) {
      showToast('Failed to load campaigns', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const festivalOptions = useMemo(() => {
    const set = new Set(campaigns.map((c) => c.festival ?? c.name).filter(Boolean));
    return Array.from(set).sort();
  }, [campaigns]);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (activeTab !== 'all' && c.status !== activeTab) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !(c.festival ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      if (festivalFilter && (c.festival ?? c.name) !== festivalFilter) return false;
      if (quarterFilter && c.scheduled_at && getQuarter(c.scheduled_at) !== quarterFilter) return false;
      return true;
    });
  }, [campaigns, activeTab, search, festivalFilter, quarterFilter]);

  const tabCounts: TabCount = useMemo(() => {
    const base = { all: campaigns.length, draft: 0, pending: 0, to_be_approved: 0, approved: 0, executed: 0 };
    campaigns.forEach((c) => {
      if (c.status in base) { const cur = (base as Record<string, number>)[c.status] ?? 0; (base as Record<string, number>)[c.status] = cur + 1; }
    });
    return base;
  }, [campaigns]);

  const quarterGroups: QuarterGroup[] = useMemo(() => {
    const map: Record<Quarter, Campaign[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
    filtered.forEach((c) => {
      const q: Quarter = c.scheduled_at ? getQuarter(c.scheduled_at) : 'Q1';
      map[q].push(c);
    });
    return (['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[])
      .filter((q) => map[q].length > 0)
      .map((q) => ({ quarter: q, campaigns: map[q] }));
  }, [filtered]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: campaigns.length,
    pending: campaigns.filter((c) => c.status === 'pending').length,
    toApprove: campaigns.filter((c) => c.status === 'to_be_approved').length,
    executed: campaigns.filter((c) => c.status === 'executed').length,
    totalSent: campaigns.reduce((s, c) => s + (c.sent_count ?? 0), 0),
  }), [campaigns]);

  // ── Generate image ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    setGeneratingIds((prev) => new Set(prev).add(campaignId));
    // Optimistic update
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, image_status: 'generating' } : c))
    );

    try {
      const res = await fetch('/api/campaigns/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          festival: campaign.festival ?? campaign.name,
          theme: campaign.festival ?? campaign.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');

      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? (data.campaign as Campaign) : c))
      );
      showToast(`Image generated for ${campaign.festival ?? campaign.name}`, 'success');
    } catch (err) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, image_status: 'not_generated' } : c))
      );
      showToast(err instanceof Error ? err.message : 'Image generation failed', 'error');
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(campaignId);
        return next;
      });
    }
  }, [campaigns, showToast]);

  // ── Approve ─────────────────────────────────────────────────────────────────
  const handleApprove = useCallback(async (campaignId: string) => {
    const res = await fetch('/api/campaigns/update-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, status: 'approved' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Approval failed');
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? (data.campaign as Campaign) : c))
    );
    showToast('Campaign approved and queued for sending', 'success');
  }, [showToast]);

  // ── Reject ──────────────────────────────────────────────────────────────────
  const handleReject = useCallback(async (campaignId: string) => {
    const res = await fetch('/api/campaigns/update-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, status: 'pending' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Rejection failed');
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? (data.campaign as Campaign) : c))
    );
    showToast('Campaign sent back for regeneration', 'info');
  }, [showToast]);

  const TABS: { id: StatusTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'pending', label: 'Pending' },
    { id: 'to_be_approved', label: 'To Be Approved' },
    { id: 'approved', label: 'Approved' },
    { id: 'executed', label: 'Executed' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex flex-col gap-4">
          {/* Title row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Festival Campaign Manager
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">WhatsApp marketing automation for Indian festivals</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadCampaigns}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowN8n(true)}
                className="flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <Settings className="w-4 h-4" />
                n8n Workflows
              </button>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search campaigns or festivals…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
              />
            </div>
            <select
              value={festivalFilter}
              onChange={(e) => setFestivalFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
            >
              <option value="">All Festivals</option>
              {festivalOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value as Quarter | '')}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
            >
              <option value="">All Quarters</option>
              <option value="Q1">Q1 (Jan–Mar)</option>
              <option value="Q2">Q2 (Apr–Jun)</option>
              <option value="Q3">Q3 (Jul–Sep)</option>
              <option value="Q4">Q4 (Oct–Dec)</option>
            </select>
          </div>

          {/* Status legend */}
          <StatusLegend />
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────────────── */}
      <div className="px-6 pt-4 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: <BarChart3 className="w-4 h-4" />, color: 'text-slate-600 bg-slate-100' },
            { label: 'Pending', value: stats.pending, icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-100' },
            { label: 'To Approve', value: stats.toApprove, icon: <CheckCircle className="w-4 h-4" />, color: 'text-blue-600 bg-blue-100' },
            { label: 'Executed', value: stats.executed, icon: <Send className="w-4 h-4" />, color: 'text-purple-600 bg-purple-100' },
            { label: 'Msgs Sent', value: stats.totalSent, icon: <Users className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-100' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 shadow-sm">
              <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-lg font-bold text-slate-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-4 shrink-0">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tabCounts[id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Calendar className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">No campaigns found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          quarterGroups.map((group) => (
            <QuarterGroupSection
              key={group.quarter}
              group={group}
              onGenerate={handleGenerate}
              onView={setPreviewCampaign}
              onApprove={setApprovalCampaign}
              generatingIds={generatingIds}
            />
          ))
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {approvalCampaign && (
        <ApprovalModal
          campaign={approvalCampaign}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setApprovalCampaign(null)}
        />
      )}
      {previewCampaign && (
        <ImagePreviewModal
          campaign={previewCampaign}
          onClose={() => setPreviewCampaign(null)}
        />
      )}
      {showN8n && <N8nWorkflowsModal onClose={() => setShowN8n(false)} />}

      <ToastContainer toasts={toasts} />
    </div>
  );
}




