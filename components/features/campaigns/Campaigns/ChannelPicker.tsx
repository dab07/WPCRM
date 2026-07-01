'use client';

import { MessageSquare, Mail, Bell, Smartphone } from 'lucide-react';

// ─── Channel definitions ───────────────────────────────────────────────────────
export type ChannelId = 'gallabox' | 'omnisend_email' | 'omnisend_push' | 'omnisend_sms';

interface ChannelDef {
  id: ChannelId;
  group: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  checkColor: string;
}

export const CHANNEL_DEFS: ChannelDef[] = [
  {
    id: 'gallabox',
    group: 'Gallabox',
    label: 'WhatsApp',
    description: 'Broadcast via Gallabox',
    icon: <MessageSquare className="w-4 h-4 stroke-[1.5]" />,
    iconColor: 'text-green-400',
    borderColor: 'border-green-500/40',
    bgColor: 'bg-green-500/10',
    checkColor: 'bg-green-500 border-green-500',
  },
  {
    id: 'omnisend_email',
    group: 'Omnisend',
    label: 'Email',
    description: 'Email campaigns via Omnisend',
    icon: <Mail className="w-4 h-4 stroke-[1.5]" />,
    iconColor: 'text-sky-400',
    borderColor: 'border-sky-500/40',
    bgColor: 'bg-sky-500/10',
    checkColor: 'bg-sky-500 border-sky-500',
  },
  {
    id: 'omnisend_push',
    group: 'Omnisend',
    label: 'Push Notifications',
    description: 'Web push via Omnisend',
    icon: <Bell className="w-4 h-4 stroke-[1.5]" />,
    iconColor: 'text-violet-400',
    borderColor: 'border-violet-500/40',
    bgColor: 'bg-violet-500/10',
    checkColor: 'bg-violet-500 border-violet-500',
  },
  {
    id: 'omnisend_sms',
    group: 'Omnisend',
    label: 'SMS',
    description: 'SMS campaigns via Omnisend',
    icon: <Smartphone className="w-4 h-4 stroke-[1.5]" />,
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-500/10',
    checkColor: 'bg-amber-500 border-amber-500',
  },
];

interface ChannelPickerProps {
  selected: ChannelId[];
  onChange: (channels: ChannelId[]) => void;
  labelCls?: string;
}

export function ChannelPicker({ selected, onChange, labelCls }: ChannelPickerProps) {
  const toggle = (id: ChannelId) => {
    if (selected.includes(id)) {
      onChange(selected.filter(c => c !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  // Group by provider
  const groups: Record<string, ChannelDef[]> = {};
  for (const ch of CHANNEL_DEFS) {
    if (!groups[ch.group]) groups[ch.group] = [];
    groups[ch.group]!.push(ch);
  }

  return (
    <div className="space-y-2">
      {labelCls && (
        <p className={labelCls}>Send Via</p>
      )}
      {Object.entries(groups).map(([group, channels]) => (
        <div key={group}>
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-brand-muted/60 mb-1.5 px-0.5">
            {group}
          </p>
          <div className="space-y-1.5">
            {channels.map((ch) => {
              const isActive = selected.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  id={`channel-${ch.id}`}
                  type="button"
                  onClick={() => toggle(ch.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-[4px] border
                    transition-all duration-150 text-left
                    focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-yellow
                    ${isActive
                      ? `${ch.borderColor} ${ch.bgColor}`
                      : 'border-[rgba(59,91,173,0.2)] hover:border-[rgba(59,91,173,0.4)]'
                    }
                  `}
                >
                  {/* Checkbox */}
                  <span className={`
                    w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors
                    ${isActive ? ch.checkColor : 'border-brand-muted/40 bg-transparent'}
                  `}>
                    {isActive && (
                      <svg viewBox="0 0 8 8" className="w-2.5 h-2.5" aria-hidden="true">
                        <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>

                  {/* Icon */}
                  <span className={isActive ? ch.iconColor : 'text-brand-muted'}>
                    {ch.icon}
                  </span>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-mono text-[11px] uppercase tracking-label leading-none ${isActive ? ch.iconColor : 'text-brand-muted'}`}>
                      {ch.label}
                    </p>
                    <p className="font-body text-[10px] text-brand-muted/70 mt-0.5 leading-snug">
                      {ch.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {selected.length === 0 && (
        <p className="font-mono text-[10px] text-amber-400/70 px-0.5 pt-1">
          ⚠ Select at least one channel
        </p>
      )}
    </div>
  );
}

/** Convert stored channel string (comma-sep or legacy) to ChannelId[] */
export function parseChannels(channel?: string | null): ChannelId[] {
  if (!channel) return ['gallabox'];
  if (channel === 'whatsapp') return ['gallabox'];
  if (channel === 'email') return ['omnisend_email'];
  if (channel === 'both') return ['gallabox', 'omnisend_email'];
  return channel.split(',').filter(c => ['gallabox', 'omnisend_email', 'omnisend_push', 'omnisend_sms'].includes(c.trim())) as ChannelId[];
}

/** Serialize ChannelId[] to the comma-sep string stored in DB */
export function serializeChannels(channels: ChannelId[]): string {
  return channels.join(',') || 'gallabox';
}
