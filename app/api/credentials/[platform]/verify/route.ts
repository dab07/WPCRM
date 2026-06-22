/**
 * POST /api/credentials/[platform]/verify
 *
 * Decrypts the stored credential for the authenticated user and tests
 * the live connection to the external platform API.
 *
 * Pipeline:
 *   1. Session guard        → 401 if invalid/missing token
 *   2. Rate limit           → 429 if over quota
 *   3. Validate platform    → 400 for unknown platform names
 *   4. getCredential        → 404 if no row exists for user+platform
 *   5. decryptCredential    → 422 on AES-GCM auth tag mismatch
 *   6. verifyPlatformCredential → 502 on external API error, 504 on timeout
 *   7. touchLastVerified    → only on success
 *
 * Requirements: 4.1, 4.2, 5.1, 7.1, 7.2, 7.3, 7.4, 10.1, 10.2, 10.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '../../../../../lib/credentials/sessionGuard';
import { checkRateLimit } from '../../../../../lib/credentials/rateLimiter';
import { decryptCredential } from '../../../../../lib/credentials/crypto';
import {
  getCredential,
  touchLastVerified,
  type PlatformName,
} from '../../../../../lib/credentials/repo';
import { verifyPlatformCredential } from '../../../../../lib/credentials/verifier';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_PLATFORMS = new Set<string>([
  'gallabox',
  'omnisend',
  'shopify',
  'meta_ads',
  'klaviyo',
  'gemini',
  'openweathermap',
]);

function isValidPlatform(value: string): value is PlatformName {
  return VALID_PLATFORMS.has(value);
}

type RouteContext = { params: { platform: string } };

// ---------------------------------------------------------------------------
// POST — verify stored credential against external API
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  // 1. Session validation
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

  // 2. Rate limiting
  const rl = checkRateLimit(auth.user.uid);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSeconds) },
      }
    );
  }

  // 3. Validate platform name
  if (!isValidPlatform(params.platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const { uid } = auth.user;
  const platform = params.platform;

  // 4. Fetch credential row (404 if not configured)
  let row;
  try {
    row = await getCredential(uid, platform);
  } catch (err) {
    console.error('[POST /api/credentials/[platform]/verify] getCredential error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: 'Credential not configured' }, { status: 404 });
  }

  // 5. Decrypt (422 on auth tag mismatch / corrupted data)
  let plaintext: Record<string, string>;
  try {
    plaintext = await decryptCredential(row);
  } catch {
    return NextResponse.json({ error: 'Credential data is corrupted' }, { status: 422 });
  }

  // 6. Verify with external platform API (35-second timeout enforced in verifier)
  let verifyResult;
  try {
    verifyResult = await verifyPlatformCredential(platform, plaintext);
  } catch (err) {
    console.error(
      '[POST /api/credentials/[platform]/verify] verifyPlatformCredential threw:',
      err
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // plaintext is a local variable; it will be GC'd after this function returns (Req 10.3)

  // Handle timeout
  if (!verifyResult.success && verifyResult.error === 'TIMEOUT') {
    return NextResponse.json({ error: 'Gateway timeout' }, { status: 504 });
  }

  // Handle external API failure
  if (!verifyResult.success) {
    return NextResponse.json(
      { error: verifyResult.error ?? 'Verification failed' },
      { status: 502 }
    );
  }

  // 7. Update last_verified_at (only on success)
  try {
    await touchLastVerified(uid, platform);
  } catch (err) {
    // Non-fatal: verification succeeded; log but still return success
    console.error('[POST /api/credentials/[platform]/verify] touchLastVerified error:', err);
  }

  return NextResponse.json({ success: true });
}
