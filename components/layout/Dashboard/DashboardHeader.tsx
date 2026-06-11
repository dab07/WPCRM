'use client';

import Image from 'next/image';

export function DashboardHeader() {
  return (
    <header
      className="
        h-[72px] shrink-0 flex items-center
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
    </header>
  );
}
