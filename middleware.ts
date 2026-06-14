// [NEW: multi-tenant-isolation] — added 2026-04-18
// Next.js edge middleware — enforces brand context on all /api routes
// except public webhooks and health checks.
//
// [EXTENDED: secure-auth-credentials] — added 2026
// • /settings and sub-paths: session-cookie guard via @supabase/ssr → redirect /login
// • /api/credentials/*: Bearer token presence check → 401 JSON if missing

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// Routes that are intentionally public (webhooks, cron triggers, health)
const PUBLIC_ROUTES = [
  '/api/integrations/webhooks/',
  '/api/integrations/n8n',
  '/api/webhooks/',
  '/api/cron/',
  '/api/testing/',
  '/api/n8n',
  '/api/health',
];

const CREDENTIAL_API_PREFIX = '/api/credentials/';
const SETTINGS_PREFIX = '/settings';

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(prefix => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // --- Settings page: session-cookie auth ---
  if (pathname.startsWith(SETTINGS_PREFIX)) {
    // Build a response object that cookie helpers can mutate (set/delete)
    const response = NextResponse.next({
      request: { headers: request.headers },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
  }

  // --- Credential API: Bearer token presence check ---
  // Full token validation (getUser) is handled inside each route handler via
  // requireSession(). Middleware only gates header presence to fail fast at
  // the edge before any service logic runs.
  if (pathname.startsWith(CREDENTIAL_API_PREFIX)) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // --- Existing logic: gate all other API routes ---

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
  matcher: [
    '/api/:path*',
    '/settings',
    '/settings/:path*',
    '/api/credentials/:path*',
  ],
};
