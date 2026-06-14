/**
 * POST /api/integrations/gallabox/connect
 *
 * Save Gallabox credentials to the `integrations` table and optionally test them.
 * Body: { apiKey, apiSecret, accountId?, channelId?, testFirst?: boolean, brandId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../supabase/supabase';
import { GallaboxService, resetGallaboxService } from '../../../../../lib/services/external/GallaboxService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, apiSecret, accountId, channelId, testFirst = true, brandId } = body;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: 'apiKey and apiSecret are required' },
        { status: 400 }
      );
    }

    // ── Optional connection test before saving ─────────────────────────────
    let testStatus: string | null = null;
    let testError:  string | null = null;

    if (testFirst) {
      const svc    = new GallaboxService({ apiKey, apiSecret, accountId: accountId ?? '' });
      const result = await svc.testConnection();
      testStatus   = result.success ? 'ok' : 'error';
      testError    = result.error ?? null;

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: `Connection test failed: ${result.error}` },
          { status: 422 }
        );
      }
    }

    // ── Upsert into integrations table ─────────────────────────────────────
    const row: Record<string, any> = {
      provider:      'gallabox',
      label:         'Gallabox WhatsApp',
      api_key:       apiKey,
      api_secret:    apiSecret,
      account_id:    accountId ?? null,
      extra:         channelId ? { channelId } : {},
      is_active:     true,
      last_tested_at: testFirst ? new Date().toISOString() : null,
      test_status:   testStatus,
      test_error:    testError,
      updated_at:    new Date().toISOString(),
    };

    if (brandId) row.brand_id = brandId;

    // Try to match on existing row
    const filter = brandId
      ? supabaseAdmin.from('integrations').select('id').eq('brand_id', brandId).eq('provider', 'gallabox').maybeSingle()
      : supabaseAdmin.from('integrations').select('id').is('brand_id', null).eq('provider', 'gallabox').maybeSingle();

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
    resetGallaboxService();
    return NextResponse.json({
      success: true,
      integrationId: savedId,
      testStatus,
      message: 'Gallabox credentials saved successfully.',
    });

    // Reset singleton so next call uses new credentials
    
  } catch (error) {
    console.error('[Gallabox Connect] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
