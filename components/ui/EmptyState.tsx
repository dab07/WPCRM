'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-brand-muted">
      {/* Icon in brand-blue tinted box */}
      <div className="w-14 h-14 border border-[rgba(59,91,173,0.18)] bg-brand-slate flex items-center justify-center rounded-[4px]">
        <Icon className="w-7 h-7 stroke-[1.5] text-brand-blue" />
      </div>
      <div className="text-center">
        <p className="font-heading font-semibold text-brand-offwhite text-sm">{title}</p>
        {description && (
          <p className="font-body text-[13px] text-brand-muted mt-1">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
