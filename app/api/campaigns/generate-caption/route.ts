import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '../../../../lib/services/external/GeminiService';

/**
 * POST /api/campaigns/generate-caption
 * Generates a WhatsApp campaign caption from a user prompt via Gemini.
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt, festival } = await request.json() as {
      prompt: string;
      festival?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const gemini = new GeminiService();

    const fullPrompt = `You are a campaign planning assistant and WhatsApp marketing expert.

Festival / Campaign: ${festival ?? 'General'}
User instructions: ${prompt}

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
