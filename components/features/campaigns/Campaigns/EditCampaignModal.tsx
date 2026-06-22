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
  const [waCampaignType, setWaCampaignType] = useState(campaign.wa_campaign_type || 'standard');
  const [discountPercentage, setDiscountPercentage] = useState(campaign.discount_percentage?.toString() || '');
  const [discountCode, setDiscountCode] = useState(campaign.discount_code || '');
  const [waButtonText, setWaButtonText] = useState(campaign.wa_button_text || '');
  const [waButtonUrl, setWaButtonUrl] = useState(campaign.wa_button_url || '');
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
          wa_campaign_type: showWhatsApp ? waCampaignType : campaign.wa_campaign_type,
          discount_percentage: showWhatsApp && waCampaignType === 'discount' && discountPercentage ? Number(discountPercentage) : null,
          discount_code: showWhatsApp && waCampaignType === 'discount' ? discountCode : null,
          wa_button_text: showWhatsApp && waCampaignType === 'url_button' ? waButtonText : null,
          wa_button_url: showWhatsApp && waCampaignType === 'url_button' ? waButtonUrl : null,
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
    <div className="fixed inset-0 bg-[#1A2847]/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#2C3A5C] rounded-[4px] border border-[#3B5BAD]/30 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Subtle background pixel pattern (optional simulated via CSS or just the color) */}
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#3B5BAD]/30 shrink-0 relative overflow-hidden bg-[#1A2847]">
          {/* Subtle diagonal accent */}
          <div className="absolute -left-16 top-0 w-32 h-full bg-[#F7C31A]/5 rotate-15 pointer-events-none" />
          <div className="absolute left-1/4 -top-10 w-px h-32 bg-[#F7C31A]/20 rotate-[15deg] pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter flex items-center gap-3" style={{ fontFamily: 'Syne, sans-serif' }}>
              <Pencil className="w-5 h-5 text-[#F7C31A]" />
              EDIT CAMPAIGN
            </h2>
            <p className="text-xs text-[#8A96B0] mt-1 tracking-[0.1em] uppercase" style={{ fontFamily: 'Space Mono, monospace' }}>{campaign.festival ?? campaign.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2C3A5C] rounded-[4px] text-[#8A96B0] hover:text-[#F7C31A] transition-colors relative z-10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#1A2847]">
          {/* ── Channel selector ── */}
          <div>
            <p className="text-[10px] font-bold text-[#F7C31A] uppercase tracking-[0.2em] mb-3 flex items-center gap-2" style={{ fontFamily: 'Space Mono, monospace' }}>
              <span className="w-8 h-[1px] bg-[#F7C31A]"></span>
              SEND VIA
            </p>
            <div className="grid grid-cols-3 gap-0 border border-[#3B5BAD]/30 rounded-[4px] p-1 bg-[#0F1A30]">
              {(
                [
                  {
                    id: 'whatsapp' as Channel,
                    label: 'WHATSAPP',
                    icon: <MessageSquare className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'email' as Channel,
                    label: 'EMAIL',
                    icon: <Mail className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'both' as Channel,
                    label: 'BOTH',
                    icon: <Layers className="w-3.5 h-3.5" />,
                  },
                ] as const
              ).map((opt) => {
                const isActive = channel === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setChannel(opt.id)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-[2px] text-[11px] font-semibold transition-all uppercase tracking-[0.1em] ${
                      isActive 
                        ? 'bg-[#F7C31A] text-[#1A2847]' 
                        : 'text-[#8A96B0] hover:text-white hover:bg-[#2C3A5C]'
                    }`}
                    style={{ fontFamily: 'Space Mono, monospace' }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Scheduled date ── */}
          <div>
            <label className="text-[10px] font-bold text-[#8A96B0] uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'Space Mono, monospace' }}>
              <Calendar className="w-3.5 h-3.5 text-[#F7C31A]" />
              SCHEDULED DATE & TIME
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-0 py-2.5 border-b border-[#3B5BAD]/40 bg-transparent text-white focus:outline-none focus:border-[#F7C31A] transition-colors text-sm"
              style={{ colorScheme: 'dark', fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          {/* ── WhatsApp section ── */}
          {showWhatsApp && (
            <div className="rounded-[4px] border border-[#3B5BAD]/30 bg-[#2C3A5C]/40 p-6 space-y-6 relative group hover:border-[#F7C31A]/30 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-6xl pointer-events-none" style={{ fontFamily: 'Syne, sans-serif' }}>I</div>
              
              <p className="text-[10px] font-bold text-[#F7C31A] uppercase tracking-[0.2em] flex items-center gap-2" style={{ fontFamily: 'Space Mono, monospace' }}>
                <span className="w-4 h-[1px] bg-[#F7C31A]"></span>
                <MessageSquare className="w-3.5 h-3.5" />
                WHATSAPP PAYLOAD
              </p>

              {/* Image upload */}
              <div>
                <label className="text-[10px] font-bold text-[#8A96B0] uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5" style={{ fontFamily: 'Space Mono, monospace' }}>
                  <ImageIcon className="w-3.5 h-3.5" />
                  CAMPAIGN MEDIA
                </label>
                {imagePreview && (
                  <div className="w-full aspect-video rounded-[4px] overflow-hidden border border-[#3B5BAD]/30 bg-[#1A2847] mb-4 relative group-hover:border-[#F7C31A]/50 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover mix-blend-luminosity opacity-70 group-hover:mix-blend-normal group-hover:opacity-100 transition-all duration-500" />
                    <div className="absolute inset-0 bg-[#3B5BAD]/20 mix-blend-overlay pointer-events-none" />
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 w-full px-4 py-4 border border-dashed border-[#3B5BAD]/50 hover:border-[#F7C31A] bg-[#1A2847]/50 rounded-[4px] cursor-pointer text-xs text-[#8A96B0] hover:text-[#F7C31A] transition-colors" style={{ fontFamily: 'Space Mono, monospace' }}>
                  <Upload className="w-4 h-4" />
                  {imageFile ? imageFile.name.toUpperCase() : 'UPLOAD MEDIA OVERRIDE'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              {/* Campaign Type */}
              <div>
                <label className="text-[10px] font-bold text-[#8A96B0] uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'Space Mono, monospace' }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  CAMPAIGN TYPE
                </label>
                <select
                  value={waCampaignType}
                  onChange={(e) => setWaCampaignType(e.target.value as any)}
                  className="w-full px-0 py-3 border-b border-[#3B5BAD]/40 focus:border-[#F7C31A] bg-[#1A2847]/50 text-white transition-colors text-[13px] focus:outline-none rounded-none cursor-pointer appearance-none"
                  style={{ 
                    fontFamily: 'Inter, sans-serif',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23F7C31A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 0px center',
                    backgroundRepeat: 'no-repeat',
                    paddingRight: '24px'
                  }}
                >
                  <option value="standard" className="bg-[#1A2847]">Standard Message</option>
                  <option value="discount" className="bg-[#1A2847]">Discount Campaign (with Quick Reply code)</option>
                  <option value="url_button" className="bg-[#1A2847]">URL Button Campaign</option>
                </select>
              </div>

              {/* Caption */}
              <div>
                <label className="text-[10px] font-bold text-[#8A96B0] uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'Space Mono, monospace' }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  CAPTION TEXT
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={5}
                  className="w-full px-0 py-3 border-b border-[#3B5BAD]/40 focus:border-[#F7C31A] bg-transparent text-white transition-colors text-[13px] resize-none focus:outline-none"
                  style={{ fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}
                />
              </div>

              {waCampaignType === 'discount' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#8A96B0] uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'Space Mono, monospace' }}>DISCOUNT PERCENTAGE</label>
                    <input
                      type="number"
                      placeholder="e.g. 20"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(e.target.value)}
                      className="w-full px-0 py-2.5 border-b border-[#3B5BAD]/40 bg-transparent text-white focus:outline-none focus:border-[#F7C31A] transition-colors text-[13px]"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#8A96B0] uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'Space Mono, monospace' }}>DISCOUNT CODE</label>
                    <input
                      type="text"
                      placeholder="e.g. SUMMER20"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="w-full px-0 py-2.5 border-b border-[#3B5BAD]/40 bg-transparent text-white focus:outline-none focus:border-[#F7C31A] transition-colors text-[13px]"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>
                </div>
              )}

              {waCampaignType === 'url_button' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#8A96B0] uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'Space Mono, monospace' }}>BUTTON TEXT</label>
                    <input
                      type="text"
                      placeholder="e.g. Shop Now"
                      value={waButtonText}
                      onChange={(e) => setWaButtonText(e.target.value)}
                      className="w-full px-0 py-2.5 border-b border-[#3B5BAD]/40 bg-transparent text-white focus:outline-none focus:border-[#F7C31A] transition-colors text-[13px]"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#8A96B0] uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'Space Mono, monospace' }}>BUTTON URL</label>
                    <input
                      type="url"
                      placeholder="e.g. https://store.com/sale"
                      value={waButtonUrl}
                      onChange={(e) => setWaButtonUrl(e.target.value)}
                      className="w-full px-0 py-2.5 border-b border-[#3B5BAD]/40 bg-transparent text-white focus:outline-none focus:border-[#F7C31A] transition-colors text-[13px]"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Email section ── */}
          {showEmail && (
            <div className="rounded-[4px] border border-[#3B5BAD]/30 bg-[#2C3A5C]/40 p-6 relative hover:border-[#F7C31A]/30 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-6xl pointer-events-none" style={{ fontFamily: 'Syne, sans-serif' }}>II</div>
              
              <p className="text-[10px] font-bold text-[#F7C31A] uppercase tracking-[0.2em] flex items-center gap-2 mb-6" style={{ fontFamily: 'Space Mono, monospace' }}>
                <span className="w-4 h-[1px] bg-[#F7C31A]"></span>
                <Mail className="w-3.5 h-3.5" />
                EMAIL SEQUENCE
              </p>
              <div className="[&_input]:border-[#3B5BAD]/40 [&_input]:bg-transparent [&_input]:text-white [&_input:focus]:border-[#F7C31A] [&_textarea]:border-[#3B5BAD]/40 [&_textarea]:bg-transparent [&_textarea]:text-white [&_textarea:focus]:border-[#F7C31A] [&_label]:text-[#8A96B0] [&_label]:font-mono [&_label]:text-[10px] [&_label]:tracking-[0.12em] [&_button]:rounded-[4px]">
                <EmailComposerSection
                  value={email}
                  onChange={setEmail}
                  campaignContext={`${campaign.festival ?? campaign.name}`}
                  whatsappCaption={caption}
                  showAIGenerate
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#1A2847] border-l-2 border-red-500 rounded-r-[4px] text-sm text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', letterSpacing: '0.05em' }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#3B5BAD]/30 flex gap-4 shrink-0 bg-[#0F1A30]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-[1.5px] border-[#3B5BAD] text-[#3B5BAD] hover:bg-[#F7C31A]/10 hover:text-[#F7C31A] hover:border-[#F7C31A] transition-colors font-semibold text-[12px] tracking-[0.1em] uppercase h-12"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#F7C31A] hover:bg-[#E5B518] hover:-translate-y-[2px] text-[#1A2847] transition-all font-bold text-[12px] tracking-[0.1em] uppercase h-12 disabled:opacity-50 disabled:hover:translate-y-0"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'PROCESSING...' : 'DEPLOY CHANGES'}
          </button>
        </div>
      </div>
    </div>
  );
}
