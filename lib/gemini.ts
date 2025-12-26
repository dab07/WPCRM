import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  // Only initialize on server-side
  if (typeof window !== 'undefined') {
    throw new Error('Gemini client can only be used on server-side');
  }

  if (!ai) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required');
    }
    
    ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY
    });
  }
  
  return ai;
}

export interface BusinessCardData {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  designation?: string;
}

/**
 * Extract business card information from text using Gemini
 */
export async function extractBusinessCardFromText(text: string): Promise<{
  success: boolean;
  data?: BusinessCardData;
  confidence?: number;
  error?: string;
}> {
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Extract business card information from the following text. Return ONLY a valid JSON object with these fields: name, company, phone, email, address, website, designation. If a field is not found, omit it. Do not include any markdown formatting or explanation.\n\nText: ${text}`
            }
          ]
        }
      ]
    });
  
    const generatedText = response.text;

    if (!generatedText) {
      throw new Error('No response from Gemini');
    }

    // Clean and parse JSON
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const data = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      data,
      confidence: 0.85
    };
  } catch (error: any) {
    console.error('[Gemini] Error extracting business card:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract business card information from image using Gemini Vision
 */
export async function extractBusinessCardFromImage(imageBase64: string): Promise<{
  success: boolean;
  data?: BusinessCardData;
  confidence?: number;
  error?: string;
}> {
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Extract all business card information from this image. Return ONLY a valid JSON object with these fields: name, company, phone, email, address, website, designation. If a field is not found, omit it. Do not include any markdown formatting or explanation.`
            },
            {
              inlineData: {
                data: imageBase64,
                mimeType: 'image/jpeg'
              }
            }
          ]
        }
      ]
    });

    const generatedText = response.text;

    if (!generatedText) {
      throw new Error('No response from Gemini');
    }

    // Clean and parse JSON
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const data = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      data,
      confidence: 0.9
    };
  } catch (error: any) {
    console.error('[Gemini] Error extracting business card from image:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate AI response for customer message
 */
export async function generateAIResponse(
  customerMessage: string,
  conversationHistory: string[] = []
): Promise<{
  success: boolean;
  response?: string;
  confidence?: number;
  intent?: string;
  error?: string;
}> {
  try {
    const context = conversationHistory.length > 0
      ? `Previous conversation:\n${conversationHistory.join('\n')}\n\n`
      : '';

    const prompt = `${context}Customer message: ${customerMessage}

You are a helpful customer service AI. Generate a professional, friendly response to the customer's message. Keep it concise and helpful.`;

    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    });

    const generatedText = response.text;

    if (!generatedText) {
      throw new Error('No response from Gemini');
    }

    return {
      success: true,
      response: generatedText.trim(),
      confidence: 0.8,
      intent: 'general_inquiry'
    };
  } catch (error: any) {
    console.error('[Gemini] Error generating AI response:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate contextual message for Instagram reel/post
 */
export async function generateInstagramMessage(
  reelUrl: string,
  caption: string,
  hashtags: string[] = [],
  customPrompt?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const defaultPrompt = 'Generate a brief, engaging 20-30 word message about this Instagram reel to share with customers via WhatsApp. Include the reel link and make it sound natural and exciting.';
    
    const prompt = customPrompt || defaultPrompt;
    
    const contextInfo = `
Instagram Reel URL: ${reelUrl}
Caption: ${caption}
Hashtags: ${hashtags.join(', ')}

${prompt}`;

    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: contextInfo
            }
          ]
        }
      ]
    });

    const generatedText = response.text;

    if (!generatedText) {
      throw new Error('No response from Gemini');
    }

    return {
      success: true,
      message: generatedText.trim()
    };
  } catch (error: any) {
    console.error('[Gemini] Error generating Instagram message:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Analyze Instagram content for targeting
 */
export async function analyzeInstagramContent(
  caption: string,
  hashtags: string[] = []
): Promise<{
  success: boolean;
  categories?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  targetAudience?: string[];
  error?: string;
}> {
  try {
    const prompt = `Analyze this Instagram content and return ONLY a JSON object with these fields:
- categories: array of content categories (e.g., ["lifestyle", "business", "entertainment"])
- sentiment: "positive", "neutral", or "negative"
- targetAudience: array of audience types (e.g., ["young_adults", "professionals", "entrepreneurs"])

Caption: ${caption}
Hashtags: ${hashtags.join(', ')}`;

    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    });

    const generatedText = response.text;

    if (!generatedText) {
      throw new Error('No response from Gemini');
    }

    // Clean and parse JSON
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      ...analysis
    };
  } catch (error: any) {
    console.error('[Gemini] Error analyzing Instagram content:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Detect intent from customer message
 */
export async function detectIntent(message: string): Promise<{
  intent: string;
  confidence: number;
}> {
  const lowerMessage = message.toLowerCase();
  
  // Simple keyword-based intent detection
  if (lowerMessage.includes('lead') || lowerMessage.includes('business card') || lowerMessage.includes('visiting card')) {
    return { intent: 'business_card', confidence: 0.95 };
  }
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('quote')) {
    return { intent: 'pricing_inquiry', confidence: 0.9 };
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
    return { intent: 'support_request', confidence: 0.85 };
  }
  
  return { intent: 'general_inquiry', confidence: 0.6 };
}
