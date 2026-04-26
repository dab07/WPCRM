// [NEW: multi-tenant-isolation] — added 2026-04-18
// Next.js edge middleware — enforces brand context on all /api routes
// except public webhooks and health checks.

import { NextRequest, NextResponse } from 'next/server';

// Routes that are intentionally public (webhooks, cron triggers, health)
const PUBLIC_ROUTES = [
  '/api/integrations/webhooks/',
  '/api/webhooks/',
  '/api/cron/',
  '/api/testing/',
  '/api/n8n',
  '/api/health',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(prefix => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Only gate API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public routes through without auth
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Require Authorization header on all other API routes.
  // Full user→brand validation happens inside each route handler
  // via resolveBrandContext() — middleware only gates the header presence
  // to fail fast at the edge before hitting any service logic.
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized — Bearer token required' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
