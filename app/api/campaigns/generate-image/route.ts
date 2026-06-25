import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../supabase/supabase';
import { GeminiService } from '../../../../lib/services/external/GeminiService';
import sharp from 'sharp';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Force the image to exactly 1024×1024 square, then compress to JPEG ≤ maxBytes.
 * Uses 'contain' with the brand background color (#F5C400) so no content is cropped —
 * any non-square output from Gemini gets padded to square with the brand color.
 */
async function processToSquareJpeg(input: Buffer, maxBytes: number): Promise<Buffer> {
  // First pass: force to 1024×1024 square with brand-color padding
  const squared = await sharp(input)
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 245, g: 196, b: 0, alpha: 1 }, // #F5C400
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  if (squared.length <= maxBytes) {
    console.log(`[generate-image] 1024×1024 at quality 90 → ${(squared.length / 1024).toFixed(0)} KB`);
    return squared;
  }

  // Step down quality until it fits
  let quality = 80;
  let output: Buffer = squared;

  while (quality >= 40) {
    output = await sharp(input)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 245, g: 196, b: 0, alpha: 1 },
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    if (output.length <= maxBytes) break;
    quality -= 10;
  }

  console.log(`[generate-image] 1024×1024 at quality ${quality} → ${(output.length / 1024).toFixed(0)} KB`);
  return output;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient(true);

  try {
    const { campaignId, festival, theme } = await request.json();

    if (!campaignId || !festival) {
      return NextResponse.json(
        { error: 'campaignId and festival are required' },
        { status: 400 }
      );
    }

    // Mark as generating
    const { error: markErr } = await supabase
      .from('campaigns')
      .update({ image_status: 'generating' })
      .eq('id', campaignId);

    if (markErr) {
      console.error('[generate-image] Failed to mark generating:', markErr);
    }

    // Fetch brand guidelines for this campaign (if any)
    const { data: campaignRow } = await supabase
      .from('campaigns')
      .select('brand_label')
      .eq('id', campaignId)
      .single();

    let logoBase64: string | null = null;
    let brandGuidelinesText = undefined;

    if (campaignRow?.brand_label) {
      const { data: guideline } = await supabase
        .from('brand_guidelines')
        .select('content, file_url, logo_url')
        .eq('label', campaignRow.brand_label)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (guideline) {
        brandGuidelinesText = guideline.content || '';
        
        if (guideline.file_url) {
          try {
            const fileRes = await fetch(guideline.file_url);
            if (fileRes.ok) {
              const fileText = await fileRes.text();
              brandGuidelinesText += fileText ? `\n--- Document Content ---\n${fileText.slice(0, 10000)}` : '';
            }
          } catch (e) {
            console.warn('Failed to fetch file_url for image generation', e);
          }
        }

        if (guideline.logo_url) {
          try {
            const logoRes = await fetch(guideline.logo_url);
            if (logoRes.ok) {
              const arrayBuffer = await logoRes.arrayBuffer();
              logoBase64 = Buffer.from(arrayBuffer).toString('base64');
            }
          } catch (e) {
            console.warn('Failed to fetch logo_url for image generation', e);
          }
        }
      }
    }

    // Generate image via Gemini, passing any stored guidelines
    const gemini = new GeminiService();
    const result = await gemini.generateCampaignImage({
      campaignName: festival,
      theme: theme || festival,
      logoBase64: logoBase64,
      brandGuidelines: brandGuidelinesText,
    });

    if (!result.success || !result.data) {
      await supabase
        .from('campaigns')
        .update({ image_status: 'not_generated' })
        .eq('id', campaignId);

      return NextResponse.json(
        { error: result.error || 'Image generation failed' },
        { status: 500 }
      );
    }

    const { imageBase64 } = result.data;
    const rawBuffer = Buffer.from(imageBase64, 'base64');

    // Force to 1024×1024 square and compress to ≤ 2 MB
    const compressedBuffer = await processToSquareJpeg(rawBuffer, MAX_BYTES);
    const finalMimeType = 'image/jpeg';
    const fileName = `festival-campaigns/${campaignId}-${Date.now()}.jpg`;

    const { error: uploadErr } = await supabase.storage
      .from('campaign-images')
      .upload(fileName, compressedBuffer, {
        contentType: finalMimeType,
        upsert: true,
      });

    let imageUrl: string | null = null;

    if (uploadErr) {
      console.warn('[generate-image] Storage upload failed:', uploadErr.message);
      // Fallback: store compressed image as base64 data URL
      imageUrl = `data:${finalMimeType};base64,${compressedBuffer.toString('base64')}`;
    } else {
      const { data: urlData } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    // Update campaign record
    const { data: updated, error: updateErr } = await supabase
      .from('campaigns')
      .update({
        image_url: imageUrl,
        image_status: 'generated',
        status: 'to_be_approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (updateErr) {
      console.error('[generate-image] Failed to update campaign:', updateErr);
      return NextResponse.json(
        { error: 'Image generated but failed to save to campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: updated,
      imageUrl,
    });
  } catch (error) {
    console.error('[generate-image] Unexpected error:', error);

    // Attempt to reset status
    try {
      const { campaignId } = await request.json().catch(() => ({}));
      if (campaignId) {
        const supabaseReset = getSupabaseClient(true);
        await supabaseReset
          .from('campaigns')
          .update({ image_status: 'not_generated' })
          .eq('id', campaignId);
      }
    } catch (_) {
      // ignore reset errors
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
