'use client';


import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
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
  Plus,
  X,
  XCircle,
  Wand2,
  MessageSquare,
  Pencil,
  Upload,
  RotateCcw,
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
import { CreateCampaignModal } from './CreateCampaignModal';

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
        <div key={t.id} className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2 ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
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
  const color = days < 0 ? 'text-red-600 bg-red-50' : days < 14 ? 'text-red-500 bg-red-50' : days < 60 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';
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

// ─── View Campaign Cell ───────────────────────────────────────────────────────
interface ViewCampaignCellProps {
  campaign: Campaign;
  onGenerate: (id: string) => void;
  onView: (campaign: Campaign) => void;
  generatingIds: Set<string>;
}

function ViewCampaignCell({ campaign, onGenerate, onView, generatingIds }: ViewCampaignCellProps) {
  const isGenerating = generatingIds.has(campaign.id) || campaign.image_status === 'generating';

  if (campaign.status === 'draft') {
    return (
      <button disabled className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed">
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
      <button onClick={() => onView(campaign)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors">
        <Eye className="w-3.5 h-3.5" />
        View Campaign
      </button>
    );
  }
  if (campaign.status === 'pending') {
    return (
      <button onClick={() => onGenerate(campaign.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-400 hover:bg-amber-500 text-white rounded-lg transition-colors shadow-sm">
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
  onReject: (campaign: Campaign) => void;
  onEdit: (campaign: Campaign) => void;
  onMoveToPending: (campaignId: string) => void;
  generatingIds: Set<string>;
}

function CampaignRow({ campaign, onGenerate, onView, onApprove, onReject, onEdit, onMoveToPending, generatingIds }: CampaignRowProps) {
  const quarter: Quarter = campaign.scheduled_at ? getQuarter(campaign.scheduled_at) : 'Q1';

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getFestivalEmoji(campaign.festival ?? campaign.name)}</span>
          <div>
            <p className="font-medium text-slate-900 text-sm leading-tight">{campaign.festival ?? campaign.name}</p>
            {campaign.festival && campaign.festival !== campaign.name && (
              <p className="text-xs text-slate-400 truncate max-w-[160px]">{campaign.name}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${QUARTER_BADGE[quarter]}`}>{quarter}</span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
      </td>
      <td className="px-4 py-3">
        {campaign.scheduled_at ? <DaysAwayBadge dateStr={campaign.scheduled_at} /> : <span className="text-slate-400 text-xs">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 font-medium">
        {campaign.status === 'executed' ? (
          <div>
            <p className="font-semibold text-purple-700">{campaign.sent_count ?? 0}</p>
            <p className="text-xs text-slate-400">sent</p>
          </div>
        ) : (campaign.target_count ?? '—')}
      </td>
      <td className="px-4 py-3">
        <ViewCampaignCell campaign={campaign} onGenerate={onGenerate} onView={onView} generatingIds={generatingIds} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={campaign.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Edit button — available on all non-executed campaigns */}
          {campaign.status !== 'executed' && (
            <button onClick={() => onEdit(campaign)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
          {/* Rejected — allow moving back to To Do */}
          {campaign.status === 'rejected' && (
            <button onClick={() => onMoveToPending(campaign.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              Move to To Do
            </button>
          )}
          {campaign.status === 'to_be_approved' && (
            <>
              <button onClick={() => onApprove(campaign)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                <CheckCircle className="w-3.5 h-3.5" />
                Approve
              </button>
              <button onClick={() => onReject(campaign)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </>
          )}
          {campaign.status === 'executed' && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Send className="w-3.5 h-3.5" />
              {campaign.executed_at ? new Date(campaign.executed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Sent'}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Quarter Group Section ────────────────────────────────────────────────────
interface QuarterGroupSectionProps {
  group: QuarterGroup;
  onGenerate: (id: string) => void;
  onView: (campaign: Campaign) => void;
  onApprove: (campaign: Campaign) => void;
  onReject: (campaign: Campaign) => void;
  onEdit: (campaign: Campaign) => void;
  onMoveToPending: (campaignId: string) => void;
  generatingIds: Set<string>;
}

function QuarterGroupSection({ group, onGenerate, onView, onApprove, onReject, onEdit, onMoveToPending, generatingIds }: QuarterGroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { quarter, campaigns } = group;

  return (
    <div className="mb-6 rounded-xl border overflow-hidden shadow-sm">
      <button onClick={() => setCollapsed((c) => !c)} className={`w-full flex items-center justify-between px-5 py-3 border-b ${QUARTER_COLORS[quarter]} transition-colors`}>
        <div className="flex items-center gap-3">
          <span className={`font-bold text-sm px-2.5 py-0.5 rounded-full ${QUARTER_BADGE[quarter]}`}>{quarter}</span>
          <span className="font-semibold text-sm">{quarter === 'Q1' ? 'Jan – Mar' : quarter === 'Q2' ? 'Apr – Jun' : quarter === 'Q3' ? 'Jul – Sep' : 'Oct – Dec'}</span>
          <span className="text-xs opacity-70">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</span>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronUp className="w-4 h-4 opacity-60" />}
      </button>

      {!collapsed && (
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Festival', 'Quarter', 'Scheduled', 'Days Away', 'Recipients', 'View Campaign', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <CampaignRow key={c.id} campaign={c} onGenerate={onGenerate} onView={onView} onApprove={onApprove} onReject={onReject} onEdit={onEdit} onMoveToPending={onMoveToPending} generatingIds={generatingIds} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Campaign Preview Modal (image + caption) ─────────────────────────────────
function CampaignPreviewModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            {getFestivalEmoji(campaign.festival ?? campaign.name)}
            {campaign.festival ?? campaign.name}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto">
          {campaign.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={campaign.image_url} alt="Campaign banner" className="w-full object-contain" />
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 bg-slate-50">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}
          {campaign.message_template && (
            <div className="p-4 bg-emerald-50 border-t border-emerald-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Caption
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{campaign.message_template}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Edit Campaign Modal ──────────────────────────────────────────────────────
interface EditCampaignModalProps {
  campaign: Campaign;
  onClose: () => void;
  onSaved: (updated: Campaign) => void;
}

function EditCampaignModal({ campaign, onClose, onSaved }: EditCampaignModalProps) {
  const [caption, setCaption] = useState(campaign.message_template ?? '');
  const [scheduledAt, setScheduledAt] = useState(
    campaign.scheduled_at ? campaign.scheduled_at.slice(0, 16) : ''
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(campaign.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      let imageUrl: string | null = campaign.image_url ?? null;

      // Upload new image directly to Supabase Storage from the browser
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const fileName = `festival-campaigns/${campaign.id}-${Date.now()}.${ext}`;

        const { error: uploadErr } = await sb.storage
          .from('campaign-images')
          .upload(fileName, imageFile, {
            contentType: imageFile.type,
            upsert: true,
          });

        if (uploadErr) {
          throw new Error(`Image upload failed: ${uploadErr.message}. Make sure the "campaign-images" bucket exists in Supabase Storage and is set to public.`);
        }

        const { data: urlData } = sb.storage
          .from('campaign-images')
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      // Send only the URL (never base64) — keeps the request small
      const res = await fetch('/api/campaigns/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          campaignId: campaign.id,
          message_template: caption,
          scheduled_at: scheduledAt || null,
          ...(imageFile ? { image_url: imageUrl, image_status: 'generated' } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      onSaved(data.campaign as Campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-500" />
              Edit Campaign
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{campaign.festival ?? campaign.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Image upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Campaign Image
            </label>
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Preview" className="w-full rounded-xl object-contain max-h-48 mb-3 border border-slate-200" />
            )}
            <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl cursor-pointer text-sm text-slate-500 hover:text-blue-600 transition-colors">
              <Upload className="w-4 h-4" />
              {imageFile ? imageFile.name : 'Upload new image (replaces AI-generated)'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            />
          </div>

          {/* Scheduled date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Scheduled Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
interface RejectionModalProps {
  campaign: Campaign;
  onClose: () => void;
  onRegenerated: (updated: Campaign) => void;
}

function RejectionModal({ campaign, onClose, onRegenerated }: RejectionModalProps) {
  const [captionPrompt, setCaptionPrompt] = useState(campaign.message_template ?? '');
  const [imagePrompt, setImagePrompt] = useState(
    campaign.festival ?? campaign.name
  );
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

      // 1. Regenerate caption via Gemini
      const captionRes = await fetch('/api/campaigns/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt: captionPrompt,
          festival: campaign.festival ?? campaign.name,
        }),
      });
      const captionData = await captionRes.json();
      if (!captionRes.ok) throw new Error(captionData.error ?? 'Caption generation failed');
      const newCaption: string = captionData.content ?? captionPrompt;

      // 2. Regenerate image
      const imgRes = await fetch('/api/campaigns/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          campaignId: campaign.id,
          festival: campaign.festival ?? campaign.name,
          theme: imagePrompt,
        }),
      });
      const imgData = await imgRes.json();
      if (!imgRes.ok) throw new Error(imgData.error ?? 'Image generation failed');

      // 3. Also update the message_template with the new caption
      const updateRes = await fetch('/api/campaigns/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          campaignId: campaign.id,
          status: 'to_be_approved',
          message_template: newCaption,
        }),
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
    // Re-fetch the updated campaign from Supabase and pass it up
    const sb = getSupabaseClient();
    const { data } = await sb.from('campaigns').select('*').eq('id', campaign.id).single();
    if (data) onRegenerated(data as Campaign);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-violet-500" />
              Reject &amp; Regenerate
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Edit the prompts, then regenerate caption + image via Gemini
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {step === 'preview' ? (
            /* ── Preview step ── */
            <>
              <div className="rounded-xl overflow-hidden border border-slate-200">
                {previewImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewImageUrl} alt="Regenerated banner" className="w-full object-contain max-h-72" />
                ) : (
                  <div className="flex items-center justify-center h-40 text-slate-400 bg-slate-50">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  New Caption
                </p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{previewCaption}</p>
                </div>
              </div>

              <p className="text-sm text-slate-500 text-center">
                Happy with the result? Confirm to send back for approval.
              </p>
            </>
          ) : (
            /* ── Edit step ── */
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Caption Prompt
                </label>
                <textarea
                  value={captionPrompt}
                  onChange={(e) => setCaptionPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe the message you want Gemini to write…"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  This will be sent to Gemini to generate a new WhatsApp caption.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-violet-500" />
                  Additional Image Context
                </label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Diwali, warm golden tones, diyas and rangoli"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Extra context passed to the image generator. Brand guidelines (logo, colors, layout) are always applied automatically.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex gap-3">
          {step === 'preview' ? (
            <>
              <button
                onClick={() => setStep('edit')}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                Back &amp; Edit Again
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm &amp; Send for Approval
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
                disabled={step === 'generating' || !captionPrompt.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-sm disabled:opacity-50"
              >
                {step === 'generating' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Regenerate with Gemini
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Status Legend ────────────────────────────────────────────────────────────
function StatusLegend() {
  const items = [
    { status: 'draft', desc: 'Previous months / outside window' },
    { status: 'pending', desc: 'Ready for image generation' },
    { status: 'to_be_approved', desc: 'Awaiting approval' },
    { status: 'approved', desc: 'Queued — sends on scheduled date' },
    { status: 'executed', desc: 'Sent successfully' },
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

// ─── Main CampaignsPanel ──────────────────────────────────────────────────────
export function CampaignsPanel() {
  const supabase = getSupabaseClient();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [festivalFilter, setFestivalFilter] = useState('');
  const [quarterFilter, setQuarterFilter] = useState<Quarter | ''>('');
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [approvalCampaign, setApprovalCampaign] = useState<Campaign | null>(null);
  const [rejectionCampaign, setRejectionCampaign] = useState<Campaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { toasts, show: showToast } = useToast();

  // ── Load ────────────────────────────────────────────────────────────────────
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

  // ── Derived ─────────────────────────────────────────────────────────────────
  const festivalOptions = useMemo(() => {
    const set = new Set(campaigns.map((c) => c.festival ?? c.name).filter(Boolean));
    return Array.from(set).sort();
  }, [campaigns]);

  const filtered = useMemo(() => campaigns.filter((c) => {
    if (activeTab !== 'all' && c.status !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !(c.festival ?? '').toLowerCase().includes(q)) return false;
    }
    if (festivalFilter && (c.festival ?? c.name) !== festivalFilter) return false;
    if (quarterFilter && c.scheduled_at && getQuarter(c.scheduled_at) !== quarterFilter) return false;
    return true;
  }), [campaigns, activeTab, search, festivalFilter, quarterFilter]);

  const tabCounts: TabCount = useMemo(() => {
    const base: TabCount = { all: campaigns.length, draft: 0, pending: 0, to_be_approved: 0, approved: 0, executed: 0, rejected: 0 };
    campaigns.forEach((c) => {
      const key = c.status as keyof TabCount;
      if (key in base && key !== 'all') base[key]++;
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

  const stats = useMemo(() => ({
    total: campaigns.length,
    pending: campaigns.filter((c) => c.status === 'pending').length,
    toApprove: campaigns.filter((c) => c.status === 'to_be_approved').length,
    executed: campaigns.filter((c) => c.status === 'executed').length,
    totalSent: campaigns.reduce((s, c) => s + (c.sent_count ?? 0), 0),
  }), [campaigns]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    setGeneratingIds((prev) => new Set(prev).add(campaignId));
    setCampaigns((prev) => prev.map((c) => c.id === campaignId ? { ...c, image_status: 'generating' } : c));

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? 'anon';

      const res = await fetch('/api/campaigns/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? 'anon';

    const res = await fetch('/api/campaigns/update-status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ campaignId, status: 'approved' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Approval failed');
    setCampaigns((prev) => prev.map((c) => c.id === campaignId ? (data.campaign as Campaign) : c));
    showToast('Campaign approved and queued for sending', 'success');
  }, [showToast]);

  const handleReject = useCallback(async (campaignId: string) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? 'anon';

    const res = await fetch('/api/campaigns/update-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ campaignId, status: 'rejected' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Rejection failed');
    setCampaigns((prev) => prev.map((c) => c.id === campaignId ? (data.campaign as Campaign) : c));
    showToast('Campaign rejected', 'info');
  }, [showToast]);

  const handleMoveToPending = useCallback(async (campaignId: string) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? 'anon';

    const res = await fetch('/api/campaigns/update-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ campaignId, status: 'pending' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to move campaign');
    setCampaigns((prev) => prev.map((c) => c.id === campaignId ? (data.campaign as Campaign) : c));
    showToast('Campaign moved to To Do', 'success');
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
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Campaigns
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">Festival marketing automation for WhatsApp</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadCampaigns} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors" title="Refresh">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                New Campaign
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search campaigns or festivals…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50" />
            </div>
            <select value={festivalFilter} onChange={(e) => setFestivalFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700">
              <option value="">All Festivals</option>
              {festivalOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={quarterFilter} onChange={(e) => setQuarterFilter(e.target.value as Quarter | '')} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700">
              <option value="">All Quarters</option>
              <option value="Q1">Q1 (Jan–Mar)</option>
              <option value="Q2">Q2 (Apr–Jun)</option>
              <option value="Q3">Q3 (Jul–Sep)</option>
              <option value="Q4">Q4 (Oct–Dec)</option>
            </select>
          </div>

          <StatusLegend />
        </div>
      </div>

      {/* Stats */}
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

      {/* Tabs */}
      <div className="px-6 pt-4 shrink-0">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tabCounts[id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Calendar className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">No campaigns found</p>
            <p className="text-sm mt-1">
              {campaigns.length === 0 ? 'Create your first campaign to get started' : 'Try adjusting your filters'}
            </p>
            {campaigns.length === 0 && (
              <button onClick={() => setShowCreate(true)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                New Campaign
              </button>
            )}
          </div>
        ) : (
          quarterGroups.map((group) => (
            <QuarterGroupSection key={group.quarter} group={group} onGenerate={handleGenerate} onView={setPreviewCampaign} onApprove={setApprovalCampaign} onReject={setRejectionCampaign} onEdit={setEditCampaign} onMoveToPending={handleMoveToPending} generatingIds={generatingIds} />
          ))
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); void loadCampaigns(); }}
        />
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
      {previewCampaign && (
        <CampaignPreviewModal campaign={previewCampaign} onClose={() => setPreviewCampaign(null)} />
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
