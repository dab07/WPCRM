import { supabaseAdmin } from '../../supabase/supabase';
import type { EncryptedCredential } from './crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlatformName =
  | 'gallabox'
  | 'omnisend'
  | 'shopify'
  | 'meta_ads'
  | 'klaviyo'
  | 'openweathermap'
  | 'gemini';

export interface CredentialRow extends EncryptedCredential {
  id: string;
  userId: string;
  platformName: PlatformName;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Maps a raw DB row (snake_case) to a typed CredentialRow (camelCase).
 */
function mapRow(raw: Record<string, unknown>): CredentialRow {
  return {
    id: raw['id'] as string,
    userId: raw['user_id'] as string,
    platformName: raw['platform_name'] as PlatformName,
    encryptedPayload: raw['encrypted_payload'] as string,
    encryptedDek: raw['encrypted_dek'] as string,
    iv: raw['iv'] as string,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
    lastVerifiedAt: (raw['last_verified_at'] as string | null) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Upserts encrypted credentials for a user+platform pair.
 * Uses onConflict on the (user_id, platform_name) unique constraint so that
 * a second call simply overwrites the existing row.
 *
 * Requirements: 2.2, 4.3, 7.2
 */
export async function upsertCredential(
  uid: string,
  platform: PlatformName,
  encrypted: EncryptedCredential
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('platform_credentials')
    .upsert(
      {
        user_id: uid,
        platform_name: platform,
        encrypted_payload: encrypted.encryptedPayload,
        encrypted_dek: encrypted.encryptedDek,
        iv: encrypted.iv,
      },
      { onConflict: 'user_id,platform_name' }
    );

  if (error) {
    throw new Error(`upsertCredential failed: ${error.message}`);
  }
}

/**
 * Returns the CredentialRow for the given user+platform, or null if not found.
 * Query is explicitly scoped to uid to prevent cross-user access (RLS is a
 * second line of defence, not the only guard).
 *
 * Requirements: 2.2, 4.3
 */
export async function getCredential(
  uid: string,
  platform: PlatformName
): Promise<CredentialRow | null> {
  const { data, error } = await supabaseAdmin
    .from('platform_credentials')
    .select('*')
    .eq('user_id', uid)
    .eq('platform_name', platform)
    .maybeSingle();

  if (error) {
    throw new Error(`getCredential failed: ${error.message}`);
  }

  if (!data) return null;

  return mapRow(data as Record<string, unknown>);
}

/**
 * Deletes the credential row for the given user+platform.
 * Silently succeeds if the row does not exist.
 *
 * Requirements: 4.3
 */
export async function deleteCredential(
  uid: string,
  platform: PlatformName
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('platform_credentials')
    .delete()
    .eq('user_id', uid)
    .eq('platform_name', platform);

  if (error) {
    throw new Error(`deleteCredential failed: ${error.message}`);
  }
}

/**
 * Updates last_verified_at to the current timestamp for the given
 * user+platform row.  Called only when an external verification succeeds.
 *
 * Requirements: 7.2
 */
export async function touchLastVerified(
  uid: string,
  platform: PlatformName
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('platform_credentials')
    .update({ last_verified_at: new Date().toISOString() })
    .eq('user_id', uid)
    .eq('platform_name', platform);

  if (error) {
    throw new Error(`touchLastVerified failed: ${error.message}`);
  }
}

/**
 * Returns the platform name and last-verified timestamp for every credential
 * row belonging to the given user.  Used by the status endpoint and the
 * settings page server component.
 *
 * Requirements: 2.2, 4.3
 */
export async function listCredentialStatuses(
  uid: string
): Promise<Array<{ platformName: PlatformName; lastVerifiedAt: string | null }>> {
  const { data, error } = await supabaseAdmin
    .from('platform_credentials')
    .select('platform_name, last_verified_at')
    .eq('user_id', uid);

  if (error) {
    throw new Error(`listCredentialStatuses failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    platformName: row['platform_name'] as PlatformName,
    lastVerifiedAt: (row['last_verified_at'] as string | null) ?? null,
  }));
}
