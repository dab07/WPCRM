'use client';

import { LucideIcon } from 'lucide-react';
import { Card } from '../ui';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  subtitle?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export function MetricCard({ title, value, icon: Icon, iconColor, subtitle, trend }: MetricCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 ${iconColor} rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {(trend || subtitle) && (
        <div className="mt-4 flex items-center text-sm">
          {trend && (
            <>
              <span className={trend.positive ? 'text-green-600' : 'text-red-600'}>
                {trend.value}
              </span>
            </>
          )}
          {subtitle && <span className="text-slate-600">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}
