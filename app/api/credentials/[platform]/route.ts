/**
 * PUT    /api/credentials/[platform]  — upsert encrypted credential
 * DELETE /api/credentials/[platform]  — delete credential
 *
 * Requirements:
 *   PUT:    3.1, 3.2, 4.1, 4.2, 4.3, 5.1
 *   DELETE: 4.1, 4.2, 4.3, 4.4, 5.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '../../../../lib/credentials/sessionGuard';
import { checkRateLimit } from '../../../../lib/credentials/rateLimiter';
import { encryptCredential } from '../../../../lib/credentials/crypto';
import {
  upsertCredential,
  getCredential,
  deleteCredential,
  type PlatformName,
} from '../../../../lib/credentials/repo';
import { resetGallaboxService } from '../../../../lib/services/external/GallaboxService';
import { resetOmnisendService } from '../../../../lib/services/external/OmnisendService';

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
// Shared guard helper
// ---------------------------------------------------------------------------

/**
 * Runs session + rate limit checks.
 * Returns the auth object on success, or a NextResponse on failure.
 */
async function runGuards(
  request: NextRequest
): Promise<{ user: { uid: string; email: string } } | NextResponse> {
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

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

  return auth;
}

// ---------------------------------------------------------------------------
// PUT — upsert encrypted credential
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  // 1 & 2. Session + rate limit
  const guard = await runGuards(request);
  if (guard instanceof NextResponse) return guard;

  // 3. Validate platform name
  if (!isValidPlatform(params.platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  // 4. Parse request body
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // 5. Encrypt credential (422 on any crypto failure)
  let encrypted;
  try {
    encrypted = await encryptCredential(body);
  } catch (err) {
    console.error('[PUT /api/credentials/[platform]] encryptCredential error:', err);
    return NextResponse.json(
      { error: 'Credential data is corrupted' },
      { status: 422 }
    );
  }

  // 6. Upsert to database
  try {
    await upsertCredential(guard.user.uid, params.platform, encrypted);
  } catch (err) {
    console.error('[PUT /api/credentials/[platform]] upsertCredential error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Reset the in-memory singleton so the next service call re-fetches from DB
  if (params.platform === 'gallabox') resetGallaboxService();
  if (params.platform === 'omnisend') resetOmnisendService();

  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// DELETE — delete credential
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  // 1 & 2. Session + rate limit
  const guard = await runGuards(request);
  if (guard instanceof NextResponse) return guard;

  // 3. Validate platform name
  if (!isValidPlatform(params.platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const { uid } = guard.user;
  const platform = params.platform;

  // 4. Verify the row exists and belongs to this user (cross-user guard)
  let existing;
  try {
    existing = await getCredential(uid, platform);
  } catch (err) {
    console.error('[DELETE /api/credentials/[platform]] getCredential error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Credential not configured' }, { status: 404 });
  }

  // RLS is the primary defence, but double-check the userId explicitly.
  // getCredential already scopes by uid, so a mismatch here signals a cross-user
  // attempt that slipped past the query scope.
  if (existing.userId !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 5. Delete
  try {
    await deleteCredential(uid, platform);
  } catch (err) {
    console.error('[DELETE /api/credentials/[platform]] deleteCredential error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Reset singleton so next service call won't use stale cached instance
  if (platform === 'gallabox') resetGallaboxService();
  if (platform === 'omnisend') resetOmnisendService();

  return NextResponse.json({ success: true });
}
