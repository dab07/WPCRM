import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CredentialManager } from '@/components/features/settings/CredentialManager';
import { listCredentialStatuses } from '@/lib/credentials/repo';
import type { PlatformName } from '@/lib/credentials/repo';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // read-only in RSC context — cookies can be read but not always set
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let initialStatuses: Array<{ platformName: PlatformName; lastVerifiedAt: string | null }> = [];
  try {
    initialStatuses = await listCredentialStatuses(user.id);
  } catch {
    // If fetch fails, render with empty statuses — UI degrades gracefully
  }

  return (
    <div className="min-h-screen bg-brand-navy px-4 py-8 md:px-8">
      <div className="max-w-4xl mx-auto">
        <CredentialManager initialStatuses={initialStatuses} />
      </div>
    </div>
  );
}
