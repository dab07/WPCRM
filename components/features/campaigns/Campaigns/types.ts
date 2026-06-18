import type { Campaign, Quarter } from '../../../../lib/types/api/campaigns';

export type { Quarter };

export type StatusTab = 'all' | 'draft' | 'pending' | 'to_be_approved' | 'approved' | 'executed' | 'rejected';

export interface TabCount {
  all: number;
  draft: number;
  pending: number;
  to_be_approved: number;
  approved: number;
  executed: number;
  rejected: number;
  intelligent: number;
}

export interface QuarterGroup {
  quarter: Quarter;
  campaigns: Campaign[];
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Backlog',
  pending: 'To Do',
  to_be_approved: 'Pending',
  approved: 'Approved',
  executed: 'Executed',
  rejected: 'Rejected',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  to_be_approved: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  executed: 'bg-purple-100 text-purple-700 border-purple-200',
  rejected: 'bg-red-100 text-red-600 border-red-200',
};

export const QUARTER_COLORS: Record<Quarter, string> = {
  Q1: 'bg-brand-slate/80 border-brand-blue/20 text-brand-offwhite',
  Q2: 'bg-brand-slate/80 border-brand-blue/20 text-brand-offwhite',
  Q3: 'bg-brand-slate/80 border-brand-blue/20 text-brand-offwhite',
  Q4: 'bg-brand-slate/80 border-brand-blue/20 text-brand-offwhite',
};

export const QUARTER_BADGE: Record<Quarter, string> = {
  Q1: 'border-brand-blue/40 text-brand-blue bg-brand-blue/10',
  Q2: 'border-brand-yellow/40 text-brand-yellow bg-brand-yellow/10',
  Q3: 'border-green-500/40 text-green-400 bg-green-500/10',
  Q4: 'border-red-500/40 text-red-400 bg-red-500/10',
};
