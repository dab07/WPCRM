'use client';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'conversation' | 'campaign';
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const getStatusStyle = () => {
    if (variant === 'conversation') {
      switch (status) {
        case 'active':
          return 'border-green-500 text-green-400 bg-green-500/10';
        case 'ai_handled':
          return 'border-brand-blue text-brand-offwhite bg-brand-blue/20';
        case 'agent_assigned':
          return 'border-brand-yellow text-brand-yellow bg-brand-yellow/10';
        case 'closed':
          return 'border-brand-muted text-brand-muted bg-brand-muted/10';
        default:
          return 'border-brand-muted text-brand-muted bg-brand-muted/10';
      }
    }

    if (variant === 'campaign') {
      switch (status) {
        case 'draft':
          return 'border-brand-muted text-brand-muted bg-brand-muted/10';
        case 'scheduled':
          return 'border-brand-blue text-brand-offwhite bg-brand-blue/20';
        case 'running':
          return 'border-brand-yellow text-brand-yellow bg-brand-yellow/10';
        case 'completed':
          return 'border-green-500 text-green-400 bg-green-500/10';
        case 'paused':
          return 'border-brand-muted text-brand-muted bg-brand-muted/10';
        default:
          return 'border-brand-muted text-brand-muted bg-brand-muted/10';
      }
    }

    return 'border-brand-muted text-brand-muted bg-brand-muted/10';
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label
        px-2 py-0.5 border rounded-[4px]
        ${getStatusStyle()}
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.replace('_', ' ')}
    </span>
  );
}
