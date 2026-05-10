'use client';

import { useState } from 'react';
import {
  X,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  RefreshCw,
  ImageIcon,
  Sparkles,
} from 'lucide-react';
import type { Campaign, Quarter } from '../../../../lib/types/api/campaigns';
import { getQuarter, getDaysAway } from '../../../../lib/types/api/campaigns';
import { QUARTER_BADGE } from './types';

interface ApprovalModalProps {
  campaign: Campaign;
  onApprove: (campaignId: string) => Promise<void>;
  onReject: (campaignId: string) => Promise<void>;
  onClose: () => void;
}

export function ApprovalModal({ campaign, onApprove, onReject, onClose }: ApprovalModalProps) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  const quarter: Quarter = campaign.scheduled_at ? getQuarter(campaign.scheduled_at) : 'Q1';
  const daysAway = campaign.scheduled_at ? getDaysAway(campaign.scheduled_at) : 0;

  const handleApprove = async () => {
    setLoading('approve');
    try {
      await onApprove(campaign.id);
      onClose();
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading('reject');
    try {
      await onReject(campaign.id);
      onClose();
    } finally {
      setLoading(null);
    }
  };

  const daysColor =
    daysAway < 0
      ? 'text-red-600'
      : daysAway < 14
      ? 'text-red-500'
      : daysAway < 60
      ? 'text-amber-500'
      : 'text-emerald-600';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Campaign Approval</h2>
            <p className="text-sm text-slate-500 mt-0.5">Review and approve this festival campaign</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Image Preview */}
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            {campaign.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.image_url}
                alt={`${campaign.festival ?? campaign.name} campaign banner`}
                className="w-full object-contain max-h-80"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <ImageIcon className="w-12 h-12 mb-2" />
                <p className="text-sm">No image generated yet</p>
              </div>
            )}
          </div>

          {/* Campaign Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Festival</p>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <p className="font-semibold text-slate-900">{campaign.festival ?? campaign.name}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Quarter</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${QUARTER_BADGE[quarter]}`}>
                {quarter}
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Scheduled Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <p className="font-semibold text-slate-900">
                  {campaign.scheduled_at
                    ? new Date(campaign.scheduled_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Days Away</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <p className={`font-bold text-lg ${daysColor}`}>
                  {daysAway < 0 ? `${Math.abs(daysAway)} days ago` : `${daysAway} days`}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Target Recipients</p>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <p className="font-semibold text-slate-900">
                  {campaign.target_count ?? campaign.sent_count ?? '—'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Image Status</p>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  campaign.image_status === 'generated'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {campaign.image_status === 'generated' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Image Ready
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    Not Generated
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Message Preview */}
          {campaign.message_template && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Message Preview</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {campaign.message_template}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            onClick={handleReject}
            disabled={loading !== null}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
          >
            {loading === 'reject' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Reject / Regenerate
          </button>
          <button
            onClick={handleApprove}
            disabled={loading !== null}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-semibold disabled:opacity-50 shadow-sm"
          >
            {loading === 'approve' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Approve Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
