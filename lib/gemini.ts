// Gemini AI Service for business card extraction and AI responses

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

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
    const prompt = `Extract business card information from the following text. Return ONLY a valid JSON object with these fields: name, company, phone, email, address, website, designation. If a field is not found, omit it. Do not include any markdown formatting or explanation.

Text: ${text}`;

    const response = await fetch(
      `${GEMINI_API_URL}/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          }
        })
      }
    );

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

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
    const prompt = `Extract all business card information from this image. Return ONLY a valid JSON object with these fields: name, company, phone, email, address, website, designation. If a field is not found, omit it. Do not include any markdown formatting or explanation.`;

    const response = await fetch(
      `${GEMINI_API_URL}/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          }
        })
      }
    );

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

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

    const response = await fetch(
      `${GEMINI_API_URL}/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          }
        })
      }
    );

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

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
