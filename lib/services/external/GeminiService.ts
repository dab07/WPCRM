import { GoogleGenAI } from "@google/genai";
import { config } from '../../config/environment';
import { externalServicesConfig } from '../../config/external-services';

export interface BusinessCardData {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  designation?: string;
}

export interface GeminiResponse<T = any> {
  success: boolean;
  data?: T;
  confidence?: number
  error?: string;
}

export class GeminiServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GeminiServiceError';
  }
}

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private readonly timeout: number;
  private readonly retries: number;

  constructor() {
    this.timeout = externalServicesConfig.gemini.timeout;
    this.retries = externalServicesConfig.gemini.retries;
  }

  private getClient(): GoogleGenAI {
    // Only initialize on server-side
    if (typeof window !== 'undefined') {
      throw new GeminiServiceError('Gemini client can only be used on server-side');
    }

    if (!this.client) {
      if (!config.gemini.apiKey) {
        throw new GeminiServiceError('GEMINI_API_KEY is required');
      }
      
      this.client = new GoogleGenAI({
        apiKey: config.gemini.apiKey
      });
    }
    
    return this.client;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
          const result = await operation();
          clearTimeout(timeoutId);
          return result;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.retries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    console.error(`[Gemini Service] ${operationName} failed after retries:`, lastError);
    throw new GeminiServiceError(
      `${operationName} failed after ${this.retries} retries: ${lastError?.message}`,
      undefined,
      lastError || undefined
    );
  }

  /**
   * Extract business card information from text using Gemini
   */
  async extractBusinessCardFromText(text: string): Promise<GeminiResponse<BusinessCardData>> {
    try {
      const result = await this.executeWithRetry(async () => {
        const client = this.getClient();
        const response = await client.models.generateContent({
          model: externalServicesConfig.gemini.model,
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
          throw new GeminiServiceError('No response from Gemini');
        }

        // Clean and parse JSON
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new GeminiServiceError('No JSON found in response');
        }

        const data = JSON.parse(jsonMatch[0]);
        return data;
      }, 'extractBusinessCardFromText');
      
      return {
        success: true,
        data: result,
        confidence: 0.85
      };
    } catch (error) {
      console.error('[Gemini Service] Error extracting business card:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract business card information from image using Gemini Vision
   */
  async extractBusinessCardFromImage(imageBase64: string): Promise<GeminiResponse<BusinessCardData>> {
    try {
      const result = await this.executeWithRetry(async () => {
        const client = this.getClient();
        const response = await client.models.generateContent({
          model: externalServicesConfig.gemini.model,
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
          throw new GeminiServiceError('No response from Gemini');
        }

        // Clean and parse JSON
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new GeminiServiceError('No JSON found in response');
        }

        const data = JSON.parse(jsonMatch[0]);
        return data;
      }, 'extractBusinessCardFromImage');
      
      return {
        success: true,
        data: result,
        confidence: 0.9
      };
    } catch (error) {
      console.error('[Gemini Service] Error extracting business card from image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate AI response for customer message
   */
  async generateAIResponse(
    customerMessage: string,
    conversationHistory: string[] = []
  ): Promise<GeminiResponse<{
    response: string;
    intent: string;
  }>> {
    try {
      const result = await this.executeWithRetry(async () => {
        const context = conversationHistory.length > 0
          ? `Previous conversation:\n${conversationHistory.join('\n')}\n\n`
          : '';

        const prompt = `${context}Customer message: ${customerMessage}

You are a helpful customer service AI. Generate a professional, friendly response to the customer's message. Keep it concise and helpful.\n
Points to remeber befopre generating response
1. Respond only with the exact campaign message I provide. Do not add any introduction, explanation, enhancement, thank you, or follow-up. Output nothing else.
2. Do NOT say things like 'Thanks for reaching out', 'I've enhanced your message', 'Let me know if you need adjustments', or reference WhatsApp marketing/AI
`;

        const client = this.getClient();
        const response = await client.models.generateContent({
          model: externalServicesConfig.gemini.model,
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
          throw new GeminiServiceError('No response from Gemini');
        }

        return {
          response: generatedText.trim(),
          intent: 'general_inquiry'
        };
      }, 'generateAIResponse');

      return {
        success: true,
        data: result,
        confidence: 0.8
      };
    } catch (error) {
      console.error('[Gemini Service] Error generating AI response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate contextual message for Instagram reel/post
   */
  async generateInstagramMessage(
    reelUrl: string,
    caption: string,
    hashtags: string[] = [],
    customPrompt?: string
  ): Promise<GeminiResponse<string>> {
    try {
      const result = await this.executeWithRetry(async () => {
        const defaultPrompt = 'Generate a brief, engaging 20-30 word message about this Instagram reel to share with customers via WhatsApp. Include the reel link and make it sound natural and exciting.';
        
        const prompt = customPrompt || defaultPrompt;
        
        const contextInfo = `
Instagram Reel URL: ${reelUrl}
Caption: ${caption}
Hashtags: ${hashtags.join(', ')}

${prompt}`;

        const client = this.getClient();
        const response = await client.models.generateContent({
          model: externalServicesConfig.gemini.model,
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
          throw new GeminiServiceError('No response from Gemini');
        }

        return generatedText.trim();
      }, 'generateInstagramMessage');

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('[Gemini Service] Error generating Instagram message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analyze Instagram content for targeting
   */
  async analyzeInstagramContent(
    caption: string,
    hashtags: string[] = []
  ): Promise<GeminiResponse<{
    categories: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    targetAudience: string[];
  }>> {
    try {
      const result = await this.executeWithRetry(async () => {
        const prompt = `Analyze this Instagram content and return ONLY a JSON object with these fields:
- categories: array of content categories (e.g., ["lifestyle", "business", "entertainment"])
- sentiment: "positive", "neutral", or "negative"
- targetAudience: array of audience types (e.g., ["young_adults", "professionals", "entrepreneurs"])

Caption: ${caption}
Hashtags: ${hashtags.join(', ')}`;

        const client = this.getClient();
        const response = await client.models.generateContent({
          model: externalServicesConfig.gemini.model,
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
          throw new GeminiServiceError('No response from Gemini');
        }

        // Clean and parse JSON
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new GeminiServiceError('No JSON found in response');
        }

        const analysis = JSON.parse(jsonMatch[0]);
        return analysis;
      }, 'analyzeInstagramContent');
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('[Gemini Service] Error analyzing Instagram content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate campaign image using Gemini 2.5 Flash Image (free tier: 500/day)
   * Returns PNG image as base64
   */
  async generateCampaignImage(config: {
    campaignName: string;
    theme?: string | null;
  }): Promise<GeminiResponse<{
    imageBase64: string;
    mimeType: string;
  }>> {
    try {
      const result = await this.executeWithRetry(async () => {
        const client = this.getClient();
        
        // Create a detailed prompt for image generation
        const prompt = `Professional WhatsApp campaign greeting image for "${config.campaignName}".

Style: Modern, celebratory, professional business aesthetic
Layout: Square format (1:1 aspect ratio)
Elements:
- Large bold text displaying "${config.campaignName}" as the main focal point
- Vibrant gradient background (purple to blue tones)
- Decorative celebratory elements (confetti, sparkles, or geometric shapes)
- Small "Zavops" branding in top-right corner
- Professional quality suitable for business messaging
- Warm, inviting, and festive atmosphere

Theme: ${config.theme || 'Professional celebration and engagement'}

Make it eye-catching but professional, suitable for WhatsApp business communication.`;

        // Use Gemini 2.5 Flash Image (500 free requests/day vs Imagen's 10-100/day)
        const response = await client.models.generateImages({
          model: 'models/gemini-2.5-flash-image',
          prompt: prompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '1:1', // Square format for WhatsApp
          }
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
          throw new GeminiServiceError('No images generated');
        }

        const generatedImage = response.generatedImages[0];
        
        if (!generatedImage || !generatedImage.image) {
          throw new GeminiServiceError('Invalid image data structure');
        }
        
        const imageBytes = generatedImage.image.imageBytes;

        if (!imageBytes) {
          throw new GeminiServiceError('No image data received');
        }

        return {
          imageBase64: imageBytes,
          mimeType: 'image/png'
        };
      }, 'generateCampaignImage');

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('[Gemini Service] Error generating campaign image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect intent from customer message
   */
  detectIntent(message: string): {
    intent: string;
    confidence: number;
  } {
    const lowerMessage = message.toLowerCase();
    
    // Simple keyword-based intent detection
    if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey') || 
        lowerMessage.includes('good morning') || lowerMessage.includes('good afternoon') || 
        lowerMessage.includes('good evening') || lowerMessage.includes('greetings')) {
      return { intent: 'greeting', confidence: 0.95 };
    }
    
    if (lowerMessage.includes('call') && (lowerMessage.includes('schedule') || lowerMessage === 'call')) {
      return { intent: 'schedule_call', confidence: 0.9 };
    }
    
    if (lowerMessage.includes('meeting') && (lowerMessage.includes('schedule') || lowerMessage === 'meeting')) {
      return { intent: 'schedule_meeting', confidence: 0.9 };
    }
    
    if (lowerMessage.includes('expert') || lowerMessage.includes('specialist')) {
      return { intent: 'talk_to_expert', confidence: 0.9 };
    }
    
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
}

// Legacy exports for backward compatibility
export async function extractBusinessCardFromText(text: string): Promise<GeminiResponse<BusinessCardData>> {
  const service = new GeminiService();
  return service.extractBusinessCardFromText(text);
}

export async function extractBusinessCardFromImage(imageBase64: string): Promise<GeminiResponse<BusinessCardData>> {
  const service = new GeminiService();
  return service.extractBusinessCardFromImage(imageBase64);
}

export async function generateAIResponse(
  customerMessage: string,
  conversationHistory: string[] = []
): Promise<GeminiResponse<{
  response: string;
  intent: string;
}>> {
  const service = new GeminiService();
  return service.generateAIResponse(customerMessage, conversationHistory);
}

export async function generateInstagramMessage(
  reelUrl: string,
  caption: string,
  hashtags: string[] = [],
  customPrompt?: string
): Promise<GeminiResponse<string>> {
  const service = new GeminiService();
  return service.generateInstagramMessage(reelUrl, caption, hashtags, customPrompt);
}

export async function detectIntent(message: string): Promise<{
  intent: string;
  confidence: number;
}> {
  const service = new GeminiService();
  return service.detectIntent(message);
}

export async function generateCampaignImage(config: {
  campaignName: string;
  theme?: string | null;
}): Promise<GeminiResponse<{
  imageBase64: string;
  mimeType: string;
}>> {
  const service = new GeminiService();
  return service.generateCampaignImage(config);
}