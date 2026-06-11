'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  className = '',
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-heading font-semibold uppercase tracking-label transition-all duration-200 rounded-[4px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow';

  const variants = {
    // Yellow fill, navy text — main CTA
    primary:
      'bg-brand-yellow text-brand-navy hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
    // Slate background, off-white text — secondary action
    secondary:
      'bg-brand-slate text-brand-offwhite border border-[rgba(59,91,173,0.18)] hover:border-brand-yellow hover:bg-[rgba(247,195,26,0.06)] disabled:opacity-50',
    // Danger — red toned
    danger:
      'bg-red-700 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed',
    // Ghost — transparent, blue border
    ghost:
      'bg-transparent border-[1.5px] border-brand-blue text-brand-blue hover:bg-brand-yellow-glow hover:text-brand-yellow hover:border-brand-yellow disabled:opacity-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[11px] h-8',
    md: 'px-4 py-2 text-[12px] h-10',
    lg: 'px-6 py-3 text-[13px] h-12',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 stroke-[1.5]" />}
      {children}
    </button>
  );
}
