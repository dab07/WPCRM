/**
 * POST /api/integrations/gallabox/test
 *
 * Test a Gallabox API key+secret WITHOUT saving to the database.
 * Body: { apiKey, apiSecret, accountId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { GallaboxService } from '../../../../../lib/services/external/GallaboxService';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, apiSecret, accountId } = await request.json();

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: 'apiKey and apiSecret are required' },
        { status: 400 }
      );
    }

    const svc    = new GallaboxService({ apiKey, apiSecret, accountId });
    const result = await svc.testConnection();

    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
