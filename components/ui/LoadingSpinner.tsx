'use client';

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      {/* Animated brand spinner */}
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-brand-blue/30" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-yellow animate-spin" />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-label text-brand-muted">
        {message}
      </p>
    </div>
  );
}
