import { NextResponse } from 'next/server';
import { generateIntelligentCampaign } from '../../../../lib/services/external/GeminiService';
import { IntelligentDataFetcher } from '../../../../lib/services/intelligence/IntelligentDataFetcher';

export async function POST() {
  try {
    const params = await IntelligentDataFetcher.fetchContextData("Zavops");

    const campaign = await generateIntelligentCampaign(params);

    if (!campaign.success) {
      return NextResponse.json({ error: campaign.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: campaign.data
    });

  } catch (error) {
    console.error('[Generate Intelligent Campaign API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate intelligent campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
