// [NEW: multi-tenant-isolation] — added 2026-04-18
// Runs tenant isolation test scenarios and returns a signed report.
// Requires admin role. Body: { brandAId, brandBId }

import { NextRequest, NextResponse } from 'next/server';
import { TenantIsolationService } from '@/lib/services/tenancy/TenantIsolationService';
import { resolveBrandContext } from '@/lib/middleware/brandContext';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandAId, brandBId } = body;

    if (!brandAId || !brandBId) {
      return NextResponse.json(
        { success: false, error: 'brandAId and brandBId are required' },
        { status: 400 }
      );
    }

    // Caller must be a member of brandA (admin or owner) to run isolation tests
    const ctx = await resolveBrandContext(request, brandAId);
    if (!['owner', 'admin'].includes(ctx.role)) {
      return NextResponse.json(
        { success: false, error: 'Only brand owners or admins can run isolation tests' },
        { status: 403 }
      );
    }

    console.log(`[Tenancy Test] Running isolation tests: Brand A=${brandAId}, Brand B=${brandBId}`);
    const service = new TenantIsolationService();
    const report = await service.runIsolationTests(brandAId, brandBId);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[Tenancy Test] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Isolation test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
