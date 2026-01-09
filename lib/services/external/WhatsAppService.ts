import { config } from '../../config/environment';
import { externalServicesConfig } from '../../config/external-services';

export interface WhatsAppConfig {
  provider: 'meta';
  // Meta Cloud API
  phoneNumberId?: string;
  accessToken?: string;
  apiVersion?: string;
}

export interface SendMessageParams {
  to: string;
  message: string;
  type?: 'text' | 'template';
  templateName?: string;
  templateParams?: string[];
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
}

export class WhatsAppServiceError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'WhatsAppServiceError';
  }
}

export class WhatsAppService {
  private config: WhatsAppConfig;
  private baseUrl: string;
  private retryCount: number;
  private timeout: number;

  constructor(config: WhatsAppConfig) {
    this.config = config;
    this.retryCount = externalServicesConfig.whatsapp.retries;
    this.timeout = externalServicesConfig.whatsapp.timeout;
    
    if (config.provider !== 'meta') {
      throw new WhatsAppServiceError('Only Meta provider is supported', config.provider);
    }
    
    const version = config.apiVersion || externalServicesConfig.whatsapp.apiVersion;
    this.baseUrl = `https://graph.facebook.com/${version}/${config.phoneNumberId}`;
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    // Validate message length
    if (params.message.length > externalServicesConfig.whatsapp.maxMessageLength) {
      throw new WhatsAppServiceError(
        `Message exceeds maximum length of ${externalServicesConfig.whatsapp.maxMessageLength} characters`,
        this.config.provider
      );
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        return await this.sendMetaMessage(params);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.retryCount) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    console.error('[WhatsApp Service] Send error after retries:', lastError);
    return { 
      success: false, 
      error: lastError?.message || 'Failed to send message after retries' 
    };
  }

  private async sendMetaMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const { to, message, type = 'text', templateName, templateParams } = params;
    
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, ''), // Remove non-digits
    };

    if (type === 'text') {
      payload.type = 'text';
      payload.text = { body: message };
    } else if (type === 'template' && templateName) {
      payload.type = 'template';
      payload.template = {
        name: templateName,
        language: { code: 'en' },
        components: templateParams ? [
          {
            type: 'body',
            parameters: templateParams.map(p => ({ type: 'text', text: p }))
          }
        ] : []
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new WhatsAppServiceError(
          data.error?.message || 'Failed to send message',
          'meta',
          response.status
        );
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof WhatsAppServiceError) {
        throw error;
      }
      throw new WhatsAppServiceError(
        error instanceof Error ? error.message : 'Network error',
        'meta',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  parseWebhookMessage(body: any): WhatsAppMessage | null {
    try {
      // Only Meta provider is supported
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (!message) return null;

      return {
        id: message.id,
        from: message.from,
        timestamp: message.timestamp,
        type: message.type,
        text: message.text,
        image: message.image,
      };
    } catch (error) {
      console.error('[WhatsApp Service] Error parsing webhook:', error);
    }
    return null;
  }

  verifyWebhook(mode: string, token: string, challenge: string, verifyToken: string): string | null {
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }
}

// Factory function to create WhatsApp service based on environment
export function createWhatsAppService(): WhatsAppService {
  const provider = process.env.WHATSAPP_PROVIDER as WhatsAppConfig['provider'] || 'meta';

  if (provider !== 'meta') {
    throw new WhatsAppServiceError(`Only Meta provider is supported, got: ${provider}`, provider);
  }

  if (!config.whatsapp.phoneNumberId || !config.whatsapp.accessToken) {
    throw new WhatsAppServiceError('Meta WhatsApp configuration is incomplete', 'meta');
  }
  
  return new WhatsAppService({
    provider: 'meta',
    phoneNumberId: config.whatsapp.phoneNumberId,
    accessToken: config.whatsapp.accessToken,
    apiVersion: externalServicesConfig.whatsapp.apiVersion,
  });
}

// Legacy exports for backward compatibility
export async function sendWhatsAppMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const service = createWhatsAppService();
  return service.sendMessage(params);
}

export async function sendWelcomeMessage(
  phoneNumber: string,
  contactName: string
): Promise<SendMessageResult> {
  console.log('[WhatsApp Service] 👋 Sending welcome message to:', contactName);

  const message = `Hi ${contactName}! 👋

Welcome to our service! We're so excited to connect with you! 🎉

Feel free to message us anytime - we're here to help!

How can we assist you today? 😊`;

  return sendWhatsAppMessage({
    to: phoneNumber,
    message,
  });
}

export async function sendTemplateMessage(
  phoneNumber: string,
  template: string,
  variables: Record<string, string>
): Promise<SendMessageResult> {
  let message = template;
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return sendWhatsAppMessage({
    to: phoneNumber,
    message,
  });
}

export async function markMessageAsRead(_messageId: string): Promise<boolean> {
  try {
    // This would need to be implemented per provider
    // For now, return true as a placeholder
    return true;
  } catch (error) {
    console.error('[WhatsApp Service] Error marking as read:', error);
    return false;
  }
}