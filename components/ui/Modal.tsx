'use client';

import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}: ModalProps) {
  if (!isOpen) return null;

  const widthClasses = {
    sm:  'max-w-sm',
    md:  'max-w-md',
    lg:  'max-w-lg',
    xl:  'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className={`
          bg-brand-navy border border-[rgba(59,91,173,0.18)] rounded-[4px] shadow-[0_8px_48px_rgba(0,0,0,0.6)]
          w-full ${widthClasses[maxWidth]} mx-4
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(59,91,173,0.18)]">
          <h2 className="font-heading font-semibold text-brand-offwhite tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-brand-muted hover:text-brand-yellow transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
