import { NextRequest, NextResponse } from 'next/server';
import { CampaignOrchestrator } from '@/lib/services/campaigns/CampaignOrchestrator';
import { CampaignImageService } from '@/lib/services/external/CampaignImageService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      message_template,
      target_tags,
      scheduled_at
    } = body;

    // Validate required fields
    if (!name || !message_template) {
      return NextResponse.json(
        { error: 'Missing required fields: name, message_template' },
        { status: 400 }
      );
    }

    // Preview image generation if requested
    if (body.preview_image) {
      const imageService = new CampaignImageService();
      const imageResult = await imageService.generateCampaignImageSVG({
        campaignName: name,
        theme: null
      });

      if (!imageResult.success) {
        return NextResponse.json(
          { error: 'Failed to generate preview image', details: imageResult.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        preview: {
          imageBase64: imageResult.imageBase64,
          mimeType: imageResult.mimeType
        }
      });
    }

    // Create campaign
    const orchestrator = new CampaignOrchestrator();
    const campaign = await orchestrator.createCampaign({
      name,
      message_template,
      target_tags: target_tags || [],
      scheduled_at
    });

    return NextResponse.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('[Campaign API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const orchestrator = new CampaignOrchestrator();
    const campaigns = await orchestrator.getCampaigns();

    return NextResponse.json({
      success: true,
      campaigns,
      total: campaigns.length
    });

  } catch (error) {
    console.error('[Campaign API] Error fetching campaigns:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch campaigns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
