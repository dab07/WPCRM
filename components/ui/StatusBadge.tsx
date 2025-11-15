'use client';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'conversation' | 'campaign';
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const getStatusColor = () => {
    if (variant === 'conversation') {
      switch (status) {
        case 'active': return 'bg-green-100 text-green-700';
        case 'ai_handled': return 'bg-blue-100 text-blue-700';
        case 'agent_assigned': return 'bg-orange-100 text-orange-700';
        case 'closed': return 'bg-slate-100 text-slate-700';
        default: return 'bg-slate-100 text-slate-700';
      }
    }

    if (variant === 'campaign') {
      switch (status) {
        case 'draft': return 'bg-slate-100 text-slate-700';
        case 'scheduled': return 'bg-blue-100 text-blue-700';
        case 'running': return 'bg-orange-100 text-orange-700';
        case 'completed': return 'bg-green-100 text-green-700';
        case 'paused': return 'bg-yellow-100 text-yellow-700';
        default: return 'bg-slate-100 text-slate-700';
      }
    }

    return 'bg-slate-100 text-slate-700';
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor()}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
