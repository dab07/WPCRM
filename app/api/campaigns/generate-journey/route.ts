import { NextResponse } from 'next/server';
import { generateCustomerJourneyStrategy } from '../../../../lib/services/external/GeminiService';
import { IntelligentDataFetcher } from '../../../../lib/services/intelligence/IntelligentDataFetcher';

export async function POST() {
  try {
    const params = await IntelligentDataFetcher.fetchContextData("Zavops");
    const strategy = await generateCustomerJourneyStrategy(params);

    if (!strategy.success) {
      return NextResponse.json({ error: strategy.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: strategy.data
    });

  } catch (error) {
    console.error('[Generate Journey Strategy API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate journey strategy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
