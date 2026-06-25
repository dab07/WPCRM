import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/services/external/GeminiService';
import { supabaseAdmin } from '../../../../supabase/supabase';

/**
 * POST /api/campaigns/generate-caption
 * Generates a WhatsApp campaign caption from a user prompt via Gemini.
 */
export async function POST(request: NextRequest) {
  try {
    let { prompt, festival, fileUrl, logoUrl, campaignId } = await request.json() as {
      prompt: string;
      festival?: string;
      fileUrl?: string;
      logoUrl?: string;
      campaignId?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // If a campaignId is provided but no fileUrl/logoUrl, fetch from DB
    if (campaignId && (!fileUrl || !logoUrl)) {
      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .select('brand_label')
        .eq('id', campaignId)
        .single();
        
      if (campaign?.brand_label) {
        const { data: guideline } = await supabaseAdmin
          .from('brand_guidelines')
          .select('file_url, logo_url')
          .eq('label', campaign.brand_label)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (guideline) {
          if (!fileUrl && guideline.file_url) fileUrl = guideline.file_url;
          if (!logoUrl && guideline.logo_url) logoUrl = guideline.logo_url;
        }
      }
    }

    let fileContent = '';
    if (fileUrl) {
      try {
        const fileRes = await fetch(fileUrl);
        if (fileRes.ok) {
          const text = await fileRes.text();
          if (text) {
            fileContent = text.slice(0, 10000); // Limit to 10k chars to avoid huge context blowup
          }
        }
      } catch (err) {
        console.error('Failed to fetch fileUrl content:', err);
      }
    }

    const gemini = new GeminiService();

    const fullPrompt = `You are a campaign planning assistant and WhatsApp marketing expert.

Festival / Campaign: ${festival ?? 'General'}
User instructions: ${prompt}
${logoUrl ? `Brand Logo URL: ${logoUrl}\n` : ''}${fileContent ? `\nReference Brand Guidelines Document:\n${fileContent}\n` : ''}

Provide your response according to the exact JSON structure requested in the user instructions. Do NOT add any explanation, preamble, or markdown formatting. Output ONLY the JSON.`;

    const result = await gemini.generateAIResponse(fullPrompt);

    if (!result.success || !result.data?.response) {
      return NextResponse.json(
        { error: result.error ?? 'Caption generation failed' },
        { status: 500 }
      );
    }

    let content = result.data.response;

    try {
      // Clean up markdown block if present
      const cleanContent = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      if (parsed && typeof parsed === 'object' && parsed.caption) {
        content = parsed.caption;
      }
    } catch (err) {
      // If parsing fails, we just use the raw text response
    }

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error('[generate-caption] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
