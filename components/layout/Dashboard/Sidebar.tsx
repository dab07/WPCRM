'use client';

import {
  Brain,
  Users,
  Megaphone,
  ShoppingBag,
  Plug,
  Sparkles,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import type { Tab, TabConfig } from './types';
import { TABS } from './constants';

const TAB_ICONS: Record<Tab, LucideIcon> = {
  agentic: Brain,
  intelligent: Sparkles,
  contacts: Users,
  campaigns: Megaphone,
  shopify: ShoppingBag,
  integrations: Plug,
};

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <nav
      className="
        w-56 shrink-0 flex flex-col
        bg-brand-navy border-r border-[rgba(59,91,173,0.18)]
        py-4
      "
    >
      {/* Nav label */}
      <p className="label-eyebrow px-5 mb-3 text-brand-muted/70">Navigation</p>

      <div className="flex flex-col gap-0.5 px-3">
        {TABS.map((tab: TabConfig) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                group w-full flex gap-3 px-3 py-2.5
                font-mono text-[11px] uppercase tracking-label
                rounded-[4px] transition-all duration-150
                ${isActive
                  ? 'bg-brand-blue text-brand-offwhite'
                  : 'text-brand-muted hover:bg-brand-slate hover:text-brand-offwhite'
                }
              `}
            >
              {tab.label}
              {/* Active indicator bar */}
              {isActive && (
                <span className="ml-auto w-1 h-4 bg-brand-yellow rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
