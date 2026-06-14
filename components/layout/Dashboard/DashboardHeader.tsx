'use client';

import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { supabase } from '../../../supabase/supabase';

export function DashboardHeader() {
  async function handleSignOut() {
    await supabase.auth.signOut();
    // onAuthStateChange in app/page.tsx handles the redirect
  }

  return (
    <header
      className="
        h-[72px] shrink-0 flex items-center justify-between
        bg-brand-navy/95 backdrop-blur-md
        border-b border-[rgba(59,91,173,0.18)]
        px-6
      "
    >
      <div className="flex items-center gap-3">
        <div>
          <Image
            src="/logos/zavops-logo.png"
            alt="Zavops"
            width={120}
            height={36}
            priority
            className="object-contain"
          />
        </div>
      </div>

      {/* Diagonal slash accent */}
      <div
        aria-hidden="true"
        className="ml-8 w-[60px] h-[2px] bg-brand-yellow opacity-60"
        style={{ transform: 'rotate(15deg)' }}
      />

      {/* Sign out */}
      <button
        type="button"
        onClick={handleSignOut}
        aria-label="Sign out"
        className="
          ml-auto flex items-center gap-2 px-3 py-1.5 rounded-[4px]
          font-mono text-[10px] uppercase tracking-label
          text-brand-muted hover:text-brand-offwhite hover:bg-brand-slate
          transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-yellow
        "
      >
        <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
        Sign out
      </button>
    </header>
  );
}
