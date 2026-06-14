'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase } from '../../supabase/supabase';

export default function LoginPage() {
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true); // checking existing session
  const [error,    setError]    = useState<string | null>(null);

  // If already signed in, go straight to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/');
      else setChecking(false);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.replace('/');
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / heading */}
        <div className="mb-8 text-center">
          <h1 className="font-heading text-[28px] font-bold text-brand-offwhite leading-tight">
            Zavops CRM
          </h1>
          <p className="font-body text-[13px] text-brand-muted mt-1">
            Sign in to your account
          </p>
          {/* Yellow accent line */}
          <div className="mx-auto mt-4 w-10 h-[2px] bg-brand-yellow opacity-80 rounded-full" />
        </div>

        {/* Card */}
        <div className="rounded-[6px] border border-brand-border bg-brand-slate p-6 space-y-5">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 rounded-[4px] border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-[12px] font-body text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                placeholder="you@example.com"
                className="
                  w-full bg-brand-navy border border-[rgba(59,91,173,0.3)] rounded-[4px]
                  px-3 py-2.5 font-mono text-[12px] text-brand-offwhite
                  placeholder:text-brand-muted/50
                  focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                "
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block font-mono text-[10px] uppercase tracking-label text-brand-muted mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  className="
                    w-full bg-brand-navy border border-[rgba(59,91,173,0.3)] rounded-[4px]
                    px-3 py-2.5 pr-10 font-mono text-[12px] text-brand-offwhite
                    placeholder:text-brand-muted/50
                    focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  disabled={loading}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="
                    absolute right-3 top-1/2 -translate-y-1/2
                    text-brand-muted hover:text-brand-offwhite
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors focus:outline-none
                  "
                >
                  {showPw
                    ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                    : <Eye    className="w-3.5 h-3.5" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="
                w-full flex items-center justify-center gap-2
                px-4 py-2.5 rounded-[4px]
                bg-brand-yellow text-brand-navy
                font-heading font-bold text-[12px] uppercase tracking-label
                hover:brightness-110 hover:-translate-y-0.5
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow
              "
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

          </form>
        </div>

        <p className="mt-4 text-center font-body text-[11px] text-brand-muted/60">
          Access is invite-only. Contact your administrator for an account.
        </p>
      </div>
    </div>
  );
}
