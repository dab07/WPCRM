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
      scheduled_at,
      send_email,
      email_subject,
      email_body,
      email_attachments,
      wa_campaign_type,
      wa_button_text,
      wa_button_url,
      discount_code,
      discount_percentage,
      channel,
      festival,
      brand_label
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
      const imageResult = await imageService.generateCampaignImage({
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

    // Auto-generate Shopify Discount for Inventory Clearance
    let finalDiscountCode = discount_code;
    let finalDiscountPercentage = discount_percentage;

    if (body.metadata?.is_clearance && !discount_code) {
      try {
        const { ShopifyService } = await import('@/lib/services/external/ShopifyService');
        const shopify = new ShopifyService();
        finalDiscountCode = `CLEARANCE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        finalDiscountPercentage = 20; // 20% default clearance
        await shopify.createDiscountCode(finalDiscountCode, finalDiscountPercentage);
        console.log(`[Campaign API] Auto-generated Shopify discount ${finalDiscountCode} at ${finalDiscountPercentage}%`);
      } catch (err) {
        console.error('[Campaign API] Failed to auto-generate discount:', err);
      }
    }

    // Create campaign
    const orchestrator = new CampaignOrchestrator();
    const campaign = await orchestrator.createCampaign({
      name,
      message_template,
      target_tags: target_tags || [],
      scheduled_at,
      send_email,
      email_subject,
      email_body,
      email_attachments,
      wa_campaign_type,
      wa_button_text,
      wa_button_url,
      discount_code: finalDiscountCode,
      discount_percentage: finalDiscountPercentage,
      channel,
      festival,
      brand_label
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
