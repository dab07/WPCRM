import { NextRequest, NextResponse } from 'next/server';
import { ContentGenerationService } from '@/lib/services/intelligence/ContentGenerationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { opportunityId } = body;

    if (!opportunityId) {
      return NextResponse.json(
        { success: false, error: 'opportunityId is required' },
        { status: 400 }
      );
    }

    console.log(`[ContentGen API] Generating content for opportunity ${opportunityId}`);
    const service = new ContentGenerationService();
    const result = await service.generateContent(opportunityId);

    return NextResponse.json({
      success: true,
      ...result,
      assetsGenerated: result.assets.length,
    });
  } catch (error) {
    console.error('[ContentGen API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Content generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
