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

    const fullPrompt = `You are a WhatsApp marketing expert writing a festive campaign message.

Festival / Campaign: ${festival ?? 'General'}
User instructions: ${prompt}

Requirements for WhatsApp:
- Keep it under 80 or 100 words
- Warm, personal, and conversational tone
- Include 1–2 relevant emojis
- End with a friendly call-to-action

Requirements for Email:
- Professional yet festive subject line
- Warm and engaging email body (can be longer than WhatsApp)
- End with a friendly call-to-action

You MUST return your response as a valid JSON object matching exactly this schema, with no markdown formatting or extra text:
{
  "whatsapp_caption": "your whatsapp message here",
  "email_subject": "your email subject here",
  "email_body": "your email body here"
}`;

    const result = await gemini.generateAIResponse(fullPrompt);

    if (!result.success || !result.data?.response) {
      return NextResponse.json(
        { error: result.error ?? 'Caption generation failed' },
        { status: 500 }
      );
    }

    let parsedResponse;
    try {
      const text = result.data.response.replace(/```json\s*|\s*```/g, '').trim();
      parsedResponse = JSON.parse(text);
    } catch (e) {
      // Fallback if the AI didn't return valid JSON
      parsedResponse = {
        whatsapp_caption: result.data.response,
        email_subject: `${festival ?? 'Campaign'} Update`,
        email_body: result.data.response
      };
    }

    return NextResponse.json({ 
      success: true, 
      content: parsedResponse.whatsapp_caption,
      email_subject: parsedResponse.email_subject,
      email_body: parsedResponse.email_body
    });
  } catch (error) {
    console.error('[generate-caption] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
