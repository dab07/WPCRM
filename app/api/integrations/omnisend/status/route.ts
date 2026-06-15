import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../supabase/supabase';
import { requireSession } from '../../../../../lib/credentials/sessionGuard';
import { getCredential } from '../../../../../lib/credentials/repo';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    // Check integrations metadata
    const filter = brandId
      ? supabaseAdmin.from('integrations').select('*').eq('brand_id', brandId).eq('provider', 'omnisend').maybeSingle()
      : supabaseAdmin.from('integrations').select('*').is('brand_id', null).eq('provider', 'omnisend').maybeSingle();

    const { data: integrationData, error } = await filter;
    
    // Check securely stored credential
    const credential = await getCredential(auth.user.uid, 'omnisend');

    if (error && error.code !== 'PGRST116') {
      throw error; // Not found error is fine
    }

    const isConnected = !!credential && integrationData?.test_status === 'ok';

    return NextResponse.json({
      success: true,
      isConnected,
      integration: integrationData || null,
      lastVerifiedAt: credential?.lastVerifiedAt || null
    });
  } catch (error) {
    console.error('[Omnisend Status] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
