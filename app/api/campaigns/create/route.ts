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

    // Trigger async targeting and segmentation sync in background
    if (target_tags && target_tags.length > 0) {
      runAsyncTargetingAndSync(
        name,
        message_template,
        target_tags[0],
        body.metadata?.target_emails
      ).catch(err => console.error('[Campaign API] Background targeting error:', err));
    }

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

async function runAsyncTargetingAndSync(
  name: string,
  messageTemplate: string,
  targetTag: string,
  metadataTargetEmails?: string[]
) {
  try {
    const { supabaseAdmin } = await import('../../../../supabase/supabase');
    const { selectTargetCustomers } = await import('../../../../lib/services/external/GeminiService');
    const { getOmnisendService } = await import('../../../../lib/services/external/OmnisendService');

    // 1. Fetch all customers
    const { data: allCustomers } = await supabaseAdmin
      .from('customers')
      .select('id, name, email, phone, location, tags, total_orders, last_order_date');

    if (!allCustomers || allCustomers.length === 0) {
      console.log(`[Async Targeting] No customers found in DB.`);
      return;
    }

    // 2. Resolve matching customer emails (either from metadata or AI)
    let targetEmails = metadataTargetEmails || [];
    if (targetEmails.length === 0) {
      console.log(`[Async Targeting] metadata.target_emails is empty. Running Gemini to select target customers...`);
      targetEmails = await selectTargetCustomers({ name, message_template: messageTemplate }, allCustomers);
      console.log(`[Async Targeting] Gemini selected ${targetEmails.length} target customers.`);
    }

    if (targetEmails.length === 0) {
      console.log(`[Async Targeting] No target customers resolved.`);
      return;
    }

    // 3. Update matching customers in the local database
    const matchingCustomers = allCustomers.filter(c => c.email && targetEmails.includes(c.email));
    if (matchingCustomers.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < matchingCustomers.length; i += chunkSize) {
        const chunk = matchingCustomers.slice(i, i + chunkSize);
        await Promise.all(chunk.map((c: any) => {
          const currentTags = Array.isArray(c.tags) ? c.tags : [];
          const newTags = Array.from(new Set([...currentTags, targetTag]));
          return supabaseAdmin.from('customers').update({ tags: newTags }).eq('id', c.id);
        }));
      }
      console.log(`[Async Targeting] Local database: Tagged ${matchingCustomers.length} customers with ${targetTag}`);
    }

    // 4. Sync matching customers to Omnisend to build the segment
    let omnisend;
    try {
      omnisend = await getOmnisendService();
    } catch (err) {
      console.warn(`[Async Targeting] Omnisend not configured, skipping contacts sync.`);
      return;
    }

    if (omnisend) {
      console.log(`[Async Targeting] Omnisend: Syncing ${matchingCustomers.length} contacts with tag ${targetTag}...`);
      for (const contact of matchingCustomers) {
        if (contact.email) {
          try {
            await omnisend.upsertContact({
              email: contact.email,
              firstName: contact.name,
              phone: contact.phone,
              tags: [targetTag],
              status: 'subscribed'
            });
          } catch (err) {
            console.error(`[Async Targeting] Failed to sync contact ${contact.email} to Omnisend:`, err);
          }
        }
      }
      console.log(`[Async Targeting] Omnisend sync completed.`);
    }
  } catch (err) {
    console.error('[Async Targeting] Error in targeting pipeline:', err);
  }
}
