/**
 * Platform Credential Verifier
 *
 * Routes a decrypted credential payload to the appropriate external service
 * factory and tests the live connection. Each call is wrapped in a 35-second
 * timeout; errors are sanitised before being returned to callers.
 *
 * Requirements: 7.1, 7.3, 7.4, 10.1
 */

import { createGallaboxService } from '../services/external/GallaboxService';
import { createOmnisendService } from '../services/external/OmnisendService';
import type { PlatformName } from './repo';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface VerifyResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VERIFY_TIMEOUT_MS = 35_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strips everything after the first newline and truncates to 200 characters.
 * Prevents stack traces, internal paths, and secrets from leaking to callers.
 */
export function sanitise(raw: string): string {
  return raw.replace(/\n[\s\S]*/g, '').slice(0, 200);
}

/**
 * Races `promise` against a 35-second rejection.
 * The rejection uses the sentinel message 'TIMEOUT' so the catch block can
 * translate it to a user-friendly error.
 */
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), VERIFY_TIMEOUT_MS)
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Verifies that the supplied plaintext credentials are valid for the given
 * platform by calling the platform's `testConnection()` method.
 *
 * @param platform - One of the supported PlatformName values.
 * @param plaintext - Decrypted credential key/value pairs (from decryptCredential).
 * @returns A VerifyResult indicating success or a sanitised error message.
 */
export async function verifyPlatformCredential(
  platform: PlatformName,
  plaintext: Record<string, string>
): Promise<VerifyResult> {
  try {
    switch (platform) {
      case 'gallabox': {
        const svc = createGallaboxService({
          apiKey:    plaintext['apiKey']    ?? '',
          apiSecret: plaintext['apiSecret'] ?? '',
          accountId: plaintext['accountId'] ?? '',
        });
        const result = await withTimeout(svc.testConnection());
        return { success: result.success, ...(result.error ? { error: result.error } : {}) };
      }

      case 'omnisend': {
        // OmnisendService already accepts optional overrides via createOmnisendService.
        const svc = createOmnisendService({
          apiKey: plaintext['apiKey'] ?? '',
        });
        const result = await withTimeout(svc.testConnection());
        return { success: result.success, ...(result.error ? { error: result.error } : {}) };
      }

      case 'shopify':
        return { success: false, error: 'Verification not implemented for shopify' };

      case 'meta_ads':
        return { success: false, error: 'Verification not implemented for meta_ads' };

      case 'klaviyo':
        return { success: false, error: 'Verification not implemented for klaviyo' };

      default: {
        // Exhaustiveness guard — TypeScript will catch unhandled PlatformName values.
        const _exhaustive: never = platform;
        return { success: false, error: `Verification not implemented for ${_exhaustive}` };
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg === 'TIMEOUT') {
      return { success: false, error: 'Connection timed out' };
    }
    return { success: false, error: sanitise(msg) };
  }
}
