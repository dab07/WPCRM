/**
 * GET /api/credentials/status
 *
 * Returns the credential status for all 5 supported platforms for the
 * authenticated user.  Platforms with no stored row are reported as
 * `not_configured`; rows with a null `last_verified_at` are `configured`;
 * rows with a non-null `last_verified_at` are `verified`.
 *
 * Requirements: 4.1, 4.2, 5.1, 6.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '../../../../lib/credentials/sessionGuard';
import { checkRateLimit } from '../../../../lib/credentials/rateLimiter';
import { listCredentialStatuses, type PlatformName } from '../../../../lib/credentials/repo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CredentialStatus = 'not_configured' | 'configured' | 'verified';

interface PlatformStatusEntry {
  platformName: PlatformName;
  status: CredentialStatus;
  lastVerifiedAt: string | null;
}

interface CredentialStatusResponse {
  platforms: PlatformStatusEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_PLATFORMS: PlatformName[] = [
  'gallabox',
  'omnisend',
  'shopify',
  'meta_ads',
  'klaviyo',
];

// ---------------------------------------------------------------------------
// Status derivation (inline — statusUtils.ts is implemented in task 10.1)
// ---------------------------------------------------------------------------

function deriveStatus(
  rowExists: boolean,
  lastVerifiedAt: string | null
): CredentialStatus {
  if (!rowExists) return 'not_configured';
  if (!lastVerifiedAt) return 'configured';
  return 'verified';
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  // 3. Fetch rows that exist for this user
  let existingRows: Array<{ platformName: PlatformName; lastVerifiedAt: string | null }>;
  try {
    existingRows = await listCredentialStatuses(auth.user.uid);
  } catch (err) {
    console.error('[GET /api/credentials/status] listCredentialStatuses error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Build a quick lookup map: platform → lastVerifiedAt
  const rowMap = new Map<PlatformName, string | null>(
    existingRows.map((r) => [r.platformName, r.lastVerifiedAt])
  );

  // 4. Merge with all 5 platforms to fill in not_configured for missing ones
  const platforms: PlatformStatusEntry[] = ALL_PLATFORMS.map((platformName) => {
    const rowExists = rowMap.has(platformName);
    const lastVerifiedAt = rowMap.get(platformName) ?? null;
    return {
      platformName,
      status: deriveStatus(rowExists, lastVerifiedAt),
      lastVerifiedAt,
    };
  });

  const body: CredentialStatusResponse = { platforms };
  return NextResponse.json(body);
}
