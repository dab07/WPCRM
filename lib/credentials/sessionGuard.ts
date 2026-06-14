import { supabaseAdmin } from '../../supabase/supabase';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  uid: string;
  email: string;
}

/**
 * Validates the Bearer token from the Authorization header using supabaseAdmin.
 *
 * Returns `{ user: { uid, email } }` on success, or a NextResponse 401 on:
 * - Missing Authorization header
 * - Malformed/invalid token
 * - supabase.auth.getUser() error
 * - Null user returned
 */
export async function requireSession(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const token = request.headers.get('authorization')?.slice(7) ?? '';
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return {
    user: {
      uid: data.user.id,
      email: data.user.email ?? '',
    },
  };
}
