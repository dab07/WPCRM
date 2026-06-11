'use client';

import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string; // kept for API compatibility, ignored in new design
  subtitle?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export function MetricCard({ title, value, icon: Icon, subtitle, trend }: MetricCardProps) {
  return (
    <div className="card-hover bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-label text-brand-muted mb-2">
            {title}
          </p>
          <p className="font-display font-bold text-brand-yellow text-[32px] leading-none tracking-tighter">
            {value}
          </p>
        </div>
        <div className="w-9 h-9 bg-brand-blue/20 border border-brand-blue/30 rounded-[4px] flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 stroke-[1.5] text-brand-blue" />
        </div>
      </div>

      {/* Yellow rule divider */}
      <div className="w-[48px] h-[1px] bg-brand-yellow opacity-60" />

      {(trend || subtitle) && (
        <div className="text-[12px] font-body">
          {trend && (
            <span className={trend.positive ? 'text-green-400' : 'text-red-400'}>
              {trend.value}
            </span>
          )}
          {subtitle && <span className="text-brand-muted">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
