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

export interface IntelligentCampaignParams {
  brand: {
    name: string;
    category: string;
    avg_repurchase_days: number;
    max_discount_pct: number;
    voice: string;
    suppression_days: number;
  };
  products: {
    top: Array<{ title: string; price: string }>;
  };
  counts: {
    pre_purchase: number;
    first_purchase: number;
    repeat_active: number;
    at_risk: number;
    dormant: number;
    birthday_this_week: number;
  };
  abandoned: {
    top_product_1: string;
    top_product_2: string;
  };
  at_risk: {
    top_last_product: string;
  };
  omnisend: {
    subscriber_count: number;
    recent_campaigns: Array<{
      name: string;
      type: string;
      date: string;
      size: number;
      open_rate: number;
      click_rate: number;
      revenue: string;
      offer: string;
    }>;
  };
  context: {
    weather_cities: Array<{
      name: string;
      customer_count: number;
      weather: string;
      temp: number;
    }>;
    upcoming_events: string;
    local_time: string;
    today_date: string;
    day_of_week: string;
  };
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

export interface GeminiServiceOverrides {
  apiKey?: string;
}

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private readonly timeout: number;
  private readonly apiKey: string;

  constructor(overrides?: GeminiServiceOverrides) {
    this.timeout = externalServicesConfig.gemini.timeout;
    this.apiKey = overrides?.apiKey || config.gemini.apiKey || '';
  }

  private getClient(): GoogleGenAI {
    // Only initialize on server-side
    if (typeof window !== 'undefined') {
      throw new GeminiServiceError('Gemini client can only be used on server-side');
    }

    if (!this.client) {
      if (!this.apiKey) {
        throw new GeminiServiceError('GEMINI_API_KEY is required');
      }

      this.client = new GoogleGenAI({
        apiKey: this.apiKey
      });
    }

    return this.client;
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
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
      const lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Gemini Service] ${operationName} failed:`, lastError);
      throw new GeminiServiceError(
        `${operationName} failed: ${lastError.message}`,
        undefined,
        lastError
      );
    }
  }

  /**
   * Extract business card information from text using Gemini
   */
  async extractBusinessCardFromText(text: string): Promise<GeminiResponse<BusinessCardData>> {
    try {
      const result = await this.executeWithTimeout(async () => {
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
      const result = await this.executeWithTimeout(async () => {
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


  async generateAIResponse(
    customerMessage: string,
    conversationHistory: string[] = []
  ): Promise<GeminiResponse<{
    response: string;
    intent: string;
  }>> {
    try {
      const result = await this.executeWithTimeout(async () => {
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
      const result = await this.executeWithTimeout(async () => {
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
      const result = await this.executeWithTimeout(async () => {
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

  async generateCampaignImage(config: {
    campaignName: string;
    theme?: string | null;
    logoBase64?: string | null;
    brandGuidelines?: string;
  }): Promise<GeminiResponse<{
    imageBase64: string;
    mimeType: string;
  }>> {
    try {
      const client = this.getClient();

      const prompt = `Create a professional festive WhatsApp campaign image for Zavops — ${config.campaignName}.

${config.brandGuidelines ?? `WHite Background, Title of campaign in bold and centered with a subtitle \`[Add Brand Guideline or provide more information for inovative campaign  generation]\``}

Festival context: ${config.theme ?? config.campaignName}`;

      const model = 'gemini-2.5-flash-image';

      // Build parts — include logo image if provided
      const userParts: any[] = [];

      if (config.logoBase64) {
        userParts.push({
          inlineData: {
            data: config.logoBase64,
            mimeType: 'image/png',
          },
        });
        userParts.push({
          text: `Above is the official Zavops logo. Use it exactly as provided — place it at the top center of the image without modification.\n\n${prompt}`,
        });
      } else {
        userParts.push({ text: prompt });
      }

      const contents = [{ role: 'user', parts: userParts }];
      const generationConfig = {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: { aspectRatio: '1:1' }
      };

      const response = await client.models.generateContentStream({
        model,
        contents,
        config: generationConfig,
      });

      let imageBase64: string | null = null;
      let mimeType = 'image/png';

      for await (const chunk of response) {
        if (!chunk.candidates?.[0]?.content?.parts) continue;
        for (const part of chunk.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            imageBase64 = part.inlineData.data;
            mimeType = part.inlineData.mimeType || 'image/png';
            break;
          }
        }
        if (imageBase64) break;
      }

      if (!imageBase64) {
        throw new GeminiServiceError('No image data received from Gemini');
      }

      return { success: true, data: { imageBase64, mimeType } };
    } catch (error) {
      console.error('[Gemini Service] Error generating campaign image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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

  /**
   * Generate an Intelligent Campaign using ZavopsAI
   */
  async generateIntelligentCampaign(params: IntelligentCampaignParams): Promise<GeminiResponse<any>> {
    try {
      const result = await this.executeWithTimeout(async () => {
        const client = this.getClient();

        const systemPrompt = `You are ZavopsAI — an intelligent campaign strategist embedded inside a
multi-tenant marketing automation platform for e-commerce brands.

You receive real brand and customer data collected automatically from
Shopify and Omnisend, along with live contextual signals.

Your job:
1. Decide the single best campaign to run RIGHT NOW for this brand.
2. Define the target audience segment.
3. Write all campaign content ready for execution.
4. Return a structured JSON object that will be shown to the brand owner
   for approval, then passed to the Campaign Component which sends via
   Gallabox (WhatsApp), Omnisend (email/SMS), and Meta Ads.

Rules:
- Reason only from the data provided. Never invent numbers or customer details.
- Never exceed the brand's configured max discount percentage.
- Never target customers within the suppression window.
- Prefer no-discount offers when historical data shows they perform equally well.
- Always apply weather, location, birthday, season, and time signals when
  they are relevant to the product category.
- Output valid JSON only. No prose, no markdown, no explanation outside the JSON.`;

        const userPrompt = `=== BRAND PROFILE ===
Brand name: ${params.brand.name}
Product category: ${params.brand.category}
Average repurchase cycle: ${params.brand.avg_repurchase_days} days
Max discount allowed: ${params.brand.max_discount_pct}%
Brand voice: ${params.brand.voice}
Top 3 products by order volume:
${params.products.top.map((p, i) => `  ${i + 1}. ${p.title} — ${p.price}`).join('\\n')}

=== CUSTOMER LIFECYCLE COUNTS ===
Pre-purchase (abandoned cart, never ordered): ${params.counts.pre_purchase}
  └─ Top abandoned products: ${params.abandoned.top_product_1}, ${params.abandoned.top_product_2}
First purchase (1 order placed ≤30 days ago): ${params.counts.first_purchase}
Repeat active (2+ orders, within repurchase window): ${params.counts.repeat_active}
At-risk (past repurchase window, no reorder): ${params.counts.at_risk}
  └─ Top product they last bought: ${params.at_risk.top_last_product}
Dormant (no order in 120+ days): ${params.counts.dormant}
Total Omnisend email subscribers: ${params.omnisend.subscriber_count}
Birthday customers this week: ${params.counts.birthday_this_week}

=== RECENT CAMPAIGN PERFORMANCE (last 3 from Omnisend) ===
${params.omnisend.recent_campaigns.map((c, i) => `Campaign ${i + 1}: ${c.name} | Type: ${c.type} | Sent: ${c.date} | Audience: ${c.size}
  Open: ${c.open_rate}% | Click: ${c.click_rate}% | Revenue: ${c.revenue} | Offer: ${c.offer}`).join('\\n\\n')}

=== CONTEXTUAL SIGNALS ===
WEATHER (current conditions per top city):
${params.context.weather_cities.map(c => `  ${c.name} — ${c.customer_count} customers — ${c.weather}, ${c.temp}°C`).join('\\n')}

SEASON / EVENTS (next 30 days):
  ${params.context.upcoming_events}

BIRTHDAY:
  ${params.counts.birthday_this_week} customers have a birthday within the next 7 days.

LOCAL TIME:
  Current time in primary market: ${params.context.local_time}

DATE:
  Today: ${params.context.today_date} (${params.context.day_of_week})

=== SUPPRESSION ===
Exclude any customer who received a campaign in the last ${params.brand.suppression_days} days.
Unsubscribes and hard bounces are excluded by Omnisend automatically.

=== YOUR TASK ===
Analyze all signals above. Choose the single best campaign to run right now.

The campaign MUST be one of the following contextual types:
  1. WEATHER URGENCY
  2. SEASON PRE-EMPTION
  3. FESTIVAL / EVENT CAMPAIGN
  4. BIRTHDAY OFFER
  5. LOCATION-SPECIFIC CAMPAIGN
  6. TIME-OPTIMIZED SEND

Choose the one contextual type whose trigger is most strongly supported by the
data provided. If two signals are equally strong, combine them.

Then return ONLY this JSON matching the structure:
{
  "decision": {
    "campaign_type": "", "contextual_trigger": "", "why_now": "", "customer_stage_targeted": "", "estimated_audience_size": 0, "confidence": "high | medium | low", "confidence_reason": ""
  },
  "segment": {
    "description": "", "filters": [{ "field": "", "operator": "", "value": "" }], "exclusions": ""
  },
  "strategy": {
    "objective": "", "offer_type": "discount | free_shipping | bundle | value_message | birthday | urgency", "offer_detail": "", "discount_percent": 0, "discount_code": "", "primary_channel": "email | whatsapp | sms | meta_ad", "send_sequence": [{ "step": 1, "channel": "", "timing": "", "purpose": "" }]
  },
  "content": {
    "email": { "subject_line_options": ["", "", ""], "preview_text": "", "headline": "", "body_paragraph_1": "", "body_paragraph_2": "", "cta_text": "", "urgency_footer": "" },
    "whatsapp": { "wa_campaign_type": "standard | discount | url_button", "message_body": "", "cta_button_text": "", "cta_button_url": "", "media_suggestion": "" },
    "sms": { "message": "", "character_count": 0 },
    "meta_ad": { "headline": "", "primary_text": "", "description": "", "cta_button": "SHOP_NOW | LEARN_MORE | GET_OFFER" }
  },
  "projected_results": { "estimated_open_rate_pct": 0, "estimated_click_rate_pct": 0, "estimated_conversion_rate_pct": 0, "estimated_revenue": 0, "projection_basis": "" },
  "guardrails": { "discount_within_limit": true, "suppression_respected": true, "risk_flag": "" }
}`;

        const response = await client.models.generateContent({
          model: externalServicesConfig.gemini.model,
          config: {
            systemInstruction: systemPrompt
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ]
        });

        const generatedText = response.text;
        if (!generatedText) {
          throw new GeminiServiceError('No response from Gemini');
        }

        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('[Gemini Raw Output]:', generatedText);
          throw new GeminiServiceError('No JSON found in response');
        }

        return JSON.parse(jsonMatch[0]);
      }, 'generateIntelligentCampaign');

      return {
        success: true,
        data: result,
        confidence: 0.9
      };
    } catch (error) {
      console.error('[Gemini Service] Error generating intelligent campaign:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

let _instance: GeminiService | null = null;

export async function getGeminiService(): Promise<GeminiService> {
  if (_instance) return _instance;

  const { supabaseAdmin } = await import('../../../supabase/supabase');
  const { decryptCredential } = await import('../../credentials/crypto');

  const { data, error } = await supabaseAdmin
    .from('platform_credentials')
    .select('encrypted_payload, encrypted_dek, iv')
    .eq('platform_name', 'gemini')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // Fallback to env config if not found in db
    _instance = new GeminiService();
    return _instance;
  }

  const plaintext = await decryptCredential({
    encryptedPayload: data.encrypted_payload as string,
    encryptedDek: data.encrypted_dek as string,
    iv: data.iv as string,
  });

  _instance = new GeminiService({ apiKey: plaintext['apiKey'] || '' });
  return _instance;
}

// Legacy exports for backward compatibility
export async function extractBusinessCardFromText(text: string): Promise<GeminiResponse<BusinessCardData>> {
  const service = await getGeminiService();
  return service.extractBusinessCardFromText(text);
}

export async function extractBusinessCardFromImage(imageBase64: string): Promise<GeminiResponse<BusinessCardData>> {
  const service = await getGeminiService();
  return service.extractBusinessCardFromImage(imageBase64);
}

export async function generateAIResponse(
  customerMessage: string,
  conversationHistory: string[] = []
): Promise<GeminiResponse<{
  response: string;
  intent: string;
}>> {
  const service = await getGeminiService();
  return service.generateAIResponse(customerMessage, conversationHistory);
}

export async function generateInstagramMessage(
  reelUrl: string,
  caption: string,
  hashtags: string[] = [],
  customPrompt?: string
): Promise<GeminiResponse<string>> {
  const service = await getGeminiService();
  return service.generateInstagramMessage(reelUrl, caption, hashtags, customPrompt);
}

export async function detectIntent(message: string): Promise<{
  intent: string;
  confidence: number;
}> {
  const service = await getGeminiService();
  return service.detectIntent(message);
}

export async function generateCampaignImage(config: {
  campaignName: string;
  theme?: string | null;
  logoBase64?: string | null;
}): Promise<GeminiResponse<{
  imageBase64: string;
  mimeType: string;
}>> {
  const service = await getGeminiService();
  return service.generateCampaignImage(config);
}

export async function generateIntelligentCampaign(params: IntelligentCampaignParams): Promise<GeminiResponse<any>> {
  const service = await getGeminiService();
  return service.generateIntelligentCampaign(params);
}