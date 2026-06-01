'use client';

import { useState } from 'react';
import {
  X,
  Pencil,
  ImageIcon,
  MessageSquare,
  Calendar,
  Mail,
  Layers,
  Upload,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { getSupabaseClient } from '../../../../supabase/supabase';
import type { Campaign } from '../../../../lib/types/api/campaigns';
import {
  EmailComposerSection,
  type EmailComposerValue,
} from './EmailComposerSection';

type Channel = 'whatsapp' | 'email' | 'both';

function deriveChannel(campaign: Campaign): Channel {
  const hasEmail = !!campaign.send_email;
  const hasWhatsApp = !!campaign.message_template;
  if (hasEmail && hasWhatsApp) return 'both';
  if (hasEmail) return 'email';
  return 'whatsapp';
}

interface EditCampaignModalProps {
  campaign: Campaign;
  onClose: () => void;
  onSaved: (updated: Campaign) => void;
}

export function EditCampaignModal({ campaign, onClose, onSaved }: EditCampaignModalProps) {
  const [caption, setCaption] = useState(campaign.message_template ?? '');
  const [scheduledAt, setScheduledAt] = useState(
    campaign.scheduled_at ? campaign.scheduled_at.slice(0, 16) : ''
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(campaign.image_url ?? null);
  const [channel, setChannel] = useState<Channel>(deriveChannel(campaign));
  const [email, setEmail] = useState<EmailComposerValue>({
    subject: campaign.email_subject ?? '',
    body: campaign.email_body ?? '',
    attachments: Array.isArray(campaign.email_attachments)
      ? (campaign.email_attachments as any[]).map((a) => ({
          url: a.url ?? a.path,
          name: a.name ?? 'attachment',
          path: a.path,
        }))
      : [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const showWhatsApp = channel === 'whatsapp' || channel === 'both';
  const showEmail = channel === 'email' || channel === 'both';

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
      const {
        data: { session },
      } = await sb.auth.getSession();
      const token = session?.access_token ?? 'anon';

      let imageUrl: string | null = campaign.image_url ?? null;

      // Upload new image if selected
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const fileName = `festival-campaigns/${campaign.id}-${Date.now()}.${ext}`;

        const { error: uploadErr } = await sb.storage
          .from('campaign-images')
          .upload(fileName, imageFile, { contentType: imageFile.type, upsert: true });

        if (uploadErr) {
          throw new Error(
            `Image upload failed: ${uploadErr.message}. Make sure the "campaign-images" bucket exists and is public.`
          );
        }

        const { data: urlData } = sb.storage.from('campaign-images').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      // Upload any new email attachments
      const sendEmail = showEmail;
      const uploadedAttachments: { url: string; name: string; path: string }[] = [];

      if (sendEmail) {
        for (const att of email.attachments) {
          if (!att.file) {
            if (att.url) uploadedAttachments.push({ url: att.url, name: att.name, path: att.path ?? '' });
            continue;
          }
          const fileExt = att.file.name.split('.').pop();
          const fileName = `${campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

          const { error: uploadErr } = await sb.storage
            .from('campaign-attachments')
            .upload(fileName, att.file);

          if (uploadErr) throw new Error(`Attachment upload failed: ${uploadErr.message}`);

          const {
            data: { publicUrl },
          } = sb.storage.from('campaign-attachments').getPublicUrl(fileName);

          uploadedAttachments.push({ url: publicUrl, name: att.file.name, path: fileName });
        }
      }

      const res = await fetch('/api/campaigns/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          campaignId: campaign.id,
          message_template: showWhatsApp ? caption : campaign.message_template,
          scheduled_at: scheduledAt || null,
          ...(imageFile ? { image_url: imageUrl, image_status: 'generated' } : {}),
          send_email: sendEmail,
          email_subject: sendEmail ? email.subject : null,
          email_body: sendEmail ? email.body : null,
          email_attachments: sendEmail ? uploadedAttachments : [],
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
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-500" />
              Edit Campaign
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{campaign.festival ?? campaign.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ── Channel selector ── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Send via
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    id: 'whatsapp' as Channel,
                    label: 'WhatsApp',
                    icon: <MessageSquare className="w-4 h-4" />,
                    active: 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200',
                    idle: 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50',
                  },
                  {
                    id: 'email' as Channel,
                    label: 'Email',
                    icon: <Mail className="w-4 h-4" />,
                    active: 'border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-200',
                    idle: 'border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50',
                  },
                  {
                    id: 'both' as Channel,
                    label: 'Both',
                    icon: <Layers className="w-4 h-4" />,
                    active: 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200',
                    idle: 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50',
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChannel(opt.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    channel === opt.id ? opt.active : opt.idle
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Scheduled date ── */}
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

          {/* ── WhatsApp section ── */}
          {showWhatsApp && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-4">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp
              </p>

              {/* Image upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Campaign Image
                </label>
                {imagePreview && (
                  <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-200 bg-[#F5C400] mb-3 max-h-48 object-cover">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
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
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none bg-white"
                />
              </div>
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
                value={email}
                onChange={setEmail}
                campaignContext={`${campaign.festival ?? campaign.name}`}
                whatsappCaption={caption}
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

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
          >
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
