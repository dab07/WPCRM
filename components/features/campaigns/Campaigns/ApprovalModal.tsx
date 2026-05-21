'use client';

import { useState } from 'react';
import {
  X,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ImageIcon,
  Sparkles,
  MessageSquare,
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
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Campaign Approval
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Review the image and caption before approving
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Image + Caption side by side on larger screens */}
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Image */}
            <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 bg-[#F5C400]">
              <div className="w-full aspect-square flex items-center justify-center overflow-hidden">
                {campaign.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={campaign.image_url}
                    alt={`${campaign.festival ?? campaign.name} campaign banner`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-amber-700 opacity-40 gap-2">
                    <ImageIcon className="w-10 h-10" />
                    <p className="text-sm">No image generated</p>
                  </div>
                )}
              </div>
            </div>

            {/* Caption */}
            <div className="flex-1 flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp Caption
                </p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 min-h-[100px]">
                  {campaign.message_template ? (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {campaign.message_template}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No caption set</p>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Festival</p>
                  <p className="font-semibold text-slate-900 text-sm">{campaign.festival ?? campaign.name}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Quarter</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${QUARTER_BADGE[quarter]}`}>
                    {quarter}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Scheduled</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <p className="font-semibold text-slate-900 text-sm">
                      {campaign.scheduled_at
                        ? new Date(campaign.scheduled_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Days Away</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <p className={`font-bold text-sm ${daysColor}`}>
                      {daysAway < 0 ? `${Math.abs(daysAway)}d ago` : `${daysAway}d`}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Target Recipients</p>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <p className="font-semibold text-slate-900 text-sm">
                      {campaign.target_count ?? campaign.sent_count ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            onClick={handleReject}
            disabled={loading !== null}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors font-medium disabled:opacity-50"
          >
            {loading === 'reject' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            Reject
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
