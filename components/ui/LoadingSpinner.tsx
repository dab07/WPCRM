'use client';

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400">{message}</div>
    </div>
  );
}
