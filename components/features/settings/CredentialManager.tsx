'use client';

import { CredentialCard, PLATFORM_FIELDS } from './CredentialCard';
import { deriveStatus } from '@/lib/credentials/statusUtils';
import type { PlatformName } from '@/lib/credentials/repo';
import { supabase } from '../../../supabase/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CredentialManagerProps {
  initialStatuses: Array<{ platformName: PlatformName; lastVerifiedAt: string | null }>;
}

// ---------------------------------------------------------------------------
// Platform configuration (ordered)
// ---------------------------------------------------------------------------

const PLATFORMS: Array<{ name: PlatformName; label: string }> = [
  { name: 'gallabox', label: 'Gallabox' },
  { name: 'omnisend', label: 'Omnisend' },
  { name: 'shopify', label: 'Shopify' },
  { name: 'meta_ads', label: 'Meta Ads' },
  { name: 'klaviyo', label: 'Klaviyo' },
  { name: 'openweathermap', label: 'OpenWeatherMap' },
  { name: 'gemini', label: 'Google Gemini' },
];

// ---------------------------------------------------------------------------
// CredentialManager component
// ---------------------------------------------------------------------------

export function CredentialManager({ initialStatuses }: CredentialManagerProps) {
  async function getToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }

  return (
    <div>
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-brand-offwhite leading-tight">
          Platform Credentials
        </h1>
        <p className="font-body text-sm text-brand-muted mt-1.5">
          Manage API credentials for each platform integration.
        </p>
      </div>

      {/* Credential cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const statusRow = initialStatuses.find(
            (s) => s.platformName === platform.name
          );
          const rowExists = !!statusRow;
          const lastVerifiedAt = statusRow?.lastVerifiedAt ?? null;
          const status = deriveStatus(rowExists, lastVerifiedAt);

          return (
            <CredentialCard
              key={platform.name}
              platform={platform.name}
              platformLabel={platform.label}
              fields={PLATFORM_FIELDS[platform.name]}
              initialStatus={status}
              initialLastVerifiedAt={lastVerifiedAt}
              getToken={getToken}
            />
          );
        })}
      </div>
    </div>
  );
}
