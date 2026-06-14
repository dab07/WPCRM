/**
 * GET /api/integrations/gallabox/status
 *
 * Returns the currently saved Gallabox integration row (credentials masked).
 * Query: ?brandId=<uuid>  (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../supabase/supabase';

export async function GET(request: NextRequest) {
  try {
    const brandId = request.nextUrl.searchParams.get('brandId');

    const query = brandId
      ? supabaseAdmin
          .from('integrations')
          .select('id, provider, label, account_id, extra, is_active, last_tested_at, test_status, test_error, updated_at')
          .eq('brand_id', brandId)
          .eq('provider', 'gallabox')
          .maybeSingle()
      : supabaseAdmin
          .from('integrations')
          .select('id, provider, label, account_id, extra, is_active, last_tested_at, test_status, test_error, updated_at')
          .is('brand_id', null)
          .eq('provider', 'gallabox')
          .maybeSingle();

    const { data, error } = await query;
    if (error) throw error;

    if (!data) {
      return NextResponse.json({ connected: false, integration: null });
    }

    return NextResponse.json({ connected: data.is_active, integration: data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/gallabox/status
 * Disconnect (set is_active = false).
 */
export async function DELETE(request: NextRequest) {
  try {
    const brandId = request.nextUrl.searchParams.get('brandId');

    const query = brandId
      ? supabaseAdmin
          .from('integrations')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('brand_id', brandId)
          .eq('provider', 'gallabox')
      : supabaseAdmin
          .from('integrations')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .is('brand_id', null)
          .eq('provider', 'gallabox');

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Gallabox disconnected.' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
