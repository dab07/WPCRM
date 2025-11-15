'use client';

import { Campaign } from '../../lib/api';
import { Send, Calendar, Users } from 'lucide-react';
import { Card, StatusBadge } from '../ui';

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Card hover className="p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-slate-900 text-lg">{campaign.name}</h3>
        <StatusBadge status={campaign.status} variant="campaign" />
      </div>

      {campaign.description && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{campaign.description}</p>
      )}

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-2">
            <Send className="w-4 h-4" />
            Sent
          </span>
          <span className="font-medium text-slate-900">
            {campaign.sent_count}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Delivered
          </span>
          <span className="font-medium text-slate-900">{campaign.delivered_count}</span>
        </div>

        {campaign.scheduled_at && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Scheduled
            </span>
            <span className="font-medium text-slate-900">
              {new Date(campaign.scheduled_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {campaign.target_tags && campaign.target_tags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-2">Target Tags:</p>
          <div className="flex gap-1 flex-wrap">
            {campaign.target_tags.map((tag) => (
              <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
