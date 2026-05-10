import type { Campaign, Quarter } from '../../../../lib/types/api/campaigns';

export type { Quarter };

export type StatusTab = 'all' | 'draft' | 'pending' | 'to_be_approved' | 'approved' | 'executed';

export interface TabCount {
  all: number;
  draft: number;
  pending: number;
  to_be_approved: number;
  approved: number;
  executed: number;
}

export interface QuarterGroup {
  quarter: Quarter;
  campaigns: Campaign[];
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  to_be_approved: 'To Be Approved',
  approved: 'Approved',
  executed: 'Executed',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  to_be_approved: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  executed: 'bg-purple-100 text-purple-700 border-purple-200',
};

export const QUARTER_COLORS: Record<Quarter, string> = {
  Q1: 'bg-sky-50 border-sky-200 text-sky-700',
  Q2: 'bg-violet-50 border-violet-200 text-violet-700',
  Q3: 'bg-orange-50 border-orange-200 text-orange-700',
  Q4: 'bg-rose-50 border-rose-200 text-rose-700',
};

export const QUARTER_BADGE: Record<Quarter, string> = {
  Q1: 'bg-sky-100 text-sky-700',
  Q2: 'bg-violet-100 text-violet-700',
  Q3: 'bg-orange-100 text-orange-700',
  Q4: 'bg-rose-100 text-rose-700',
};
