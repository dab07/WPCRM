// [NEW: multi-tenant-isolation] — added 2026-04-18
// Extracts and validates brand context from an incoming API request.
// Used by all protected API routes to enforce brand-scoped access.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../supabase/supabase';
import type { BrandContext } from '../types/api/auth';

export class BrandContextError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 403
  ) {
    super(message);
    this.name = 'BrandContextError';
  }
}

/**
 * Resolves the authenticated user from the Authorization header (Bearer JWT).
 * Returns null if the token is missing or invalid.
 */
async function resolveUser(request: NextRequest): Promise<{ id: string; email: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? '' };
}

/**
 * Verifies the user is a member of the requested brand.
 * Returns the BrandContext (userId, brandId, role) or throws BrandContextError.
 */
export async function resolveBrandContext(
  request: NextRequest,
  brandId: string
): Promise<BrandContext> {
  const user = await resolveUser(request);

  if (!user) {
    throw new BrandContextError('Unauthorized — missing or invalid token', 401);
  }

  const { data, error } = await supabaseAdmin
    .from('user_brands')
    .select('role')
    .eq('user_id', user.id)
    .eq('brand_id', brandId)
    .single();

  if (error || !data) {
    throw new BrandContextError(
      `Access denied — user does not belong to brand ${brandId}`,
      403
    );
  }

  return { userId: user.id, brandId, role: data.role };
}

/**
 * Middleware helper: wraps a route handler with brand context enforcement.
 * Extracts brandId from the request body (POST) or query params (GET).
 *
 * Usage in a route:
 *   export const POST = withBrandContext(async (req, ctx) => { ... });
 */
export function withBrandContext(
  handler: (request: NextRequest, ctx: BrandContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      let brandId: string | null = null;

      if (request.method === 'GET') {
        brandId = new URL(request.url).searchParams.get('brandId');
      } else {
        // Clone to avoid consuming the body stream
        const body = await request.clone().json().catch(() => ({}));
        brandId = body.brandId ?? null;
      }

      if (!brandId) {
        return NextResponse.json(
          { success: false, error: 'brandId is required' },
          { status: 400 }
        );
      }

      const ctx = await resolveBrandContext(request, brandId);
      return handler(request, ctx);
    } catch (err) {
      if (err instanceof BrandContextError) {
        return NextResponse.json(
          { success: false, error: err.message },
          { status: err.statusCode }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Asserts that a given record's brand_id matches the resolved context.
 * Throws BrandContextError if there's a mismatch (tenant leak guard).
 */
export function assertBrandOwnership(
  recordBrandId: string,
  ctx: BrandContext,
  resourceName = 'resource'
): void {
  if (recordBrandId !== ctx.brandId) {
    throw new BrandContextError(
      `Tenant isolation violation: ${resourceName} belongs to a different brand`,
      403
    );
  }
}
