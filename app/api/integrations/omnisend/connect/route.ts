import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../supabase/supabase';
import { OmnisendService, resetOmnisendService } from '../../../../../lib/services/external/OmnisendService';
import { encryptCredential } from '../../../../../lib/credentials/crypto';
import { upsertCredential, touchLastVerified } from '../../../../../lib/credentials/repo';
import { requireSession } from '../../../../../lib/credentials/sessionGuard';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { apiKey, testFirst = true, brandId } = body;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'apiKey is required' },
        { status: 400 }
      );
    }

    let testStatus: string | null = null;
    let testError: string | null = null;

    if (testFirst) {
      const svc = new OmnisendService({ apiKey });
      const result = await svc.testConnection();
      testStatus = result.success ? 'ok' : 'error';
      testError = result.error ?? null;

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: `Connection test failed: ${result.error}` },
          { status: 422 }
        );
      }
    }

    // ── Upsert into integrations table (for metadata only, no API key) ──────
    const row: Record<string, any> = {
      provider:      'omnisend',
      label:         'Omnisend Email',
      is_active:     true,
      last_tested_at: testFirst ? new Date().toISOString() : null,
      test_status:   testStatus,
      test_error:    testError,
      updated_at:    new Date().toISOString(),
    };

    if (brandId) row.brand_id = brandId;

    const filter = brandId
      ? supabaseAdmin.from('integrations').select('id').eq('brand_id', brandId).eq('provider', 'omnisend').maybeSingle()
      : supabaseAdmin.from('integrations').select('id').is('brand_id', null).eq('provider', 'omnisend').maybeSingle();

    const { data: existing } = await filter;
    let savedId: string;

    if (existing?.id) {
      const { data, error } = await supabaseAdmin
        .from('integrations')
        .update(row)
        .eq('id', existing.id)
        .select('id')
        .single();
      if (error) throw error;
      savedId = data.id;
    } else {
      const { data, error } = await supabaseAdmin
        .from('integrations')
        .insert(row)
        .select('id')
        .single();
      if (error) throw error;
      savedId = data.id;
    }

    // ── Store actual API key securely in platform_credentials ────────────────
    const encrypted = await encryptCredential({ apiKey });
    await upsertCredential(auth.user.uid, 'omnisend', encrypted);
    if (testStatus === 'ok') {
        await touchLastVerified(auth.user.uid, 'omnisend');
    }

    resetOmnisendService();

    return NextResponse.json({
      success: true,
      integrationId: savedId,
      testStatus,
      message: 'Omnisend credentials securely saved.',
    });
  } catch (error) {
    console.error('[Omnisend Connect] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
