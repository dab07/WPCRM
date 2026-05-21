import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../supabase/supabase';
import { GeminiService } from '../../../../lib/services/external/GeminiService';
import fs from 'fs';
import path from 'path';

// Read the Zavops logo once at module load (server-side only)
function loadLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'logos', 'Zavops logo full (1).png');
    return fs.readFileSync(logoPath).toString('base64');
  } catch (err) {
    console.warn('[generate-image] Could not load Zavops logo:', err);
    return null;
  }
}

const ZAVOPS_LOGO_BASE64 = loadLogoBase64();


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

    // Generate image via Gemini
    const gemini = new GeminiService();
    const result = await gemini.generateCampaignImage({
      campaignName: festival,
      theme: theme || festival,
      logoBase64: ZAVOPS_LOGO_BASE64,
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

    const { imageBase64, mimeType } = result.data;

    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const fileName = `festival-campaigns/${campaignId}-${Date.now()}.${ext}`;
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const { error: uploadErr } = await supabase.storage
      .from('campaign-images')
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    let imageUrl: string | null = null;

    if (uploadErr) {
      // Storage upload failed â€” store base64 data URL as fallback
      console.warn('[generate-image] Storage upload failed, using data URL:', uploadErr.message);
      imageUrl = `data:${mimeType};base64,${imageBase64}`;
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

