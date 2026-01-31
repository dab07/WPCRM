

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
  type?: 'text' | 'template' | 'interactive' | 'image';
  templateName?: string;
  templateParams?: string[];
  interactive?: InteractiveMessage;
  imageBase64?: string;
  imageCaption?: string;
  imageMimeType?: string;
}

export interface InteractiveMessage {
  type: 'button' | 'list';
  header?: {
    type: 'text';
    text: string;
  };
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: ButtonAction | ListAction;
}

export interface ButtonAction {
  buttons: Array<{
    type: 'reply';
    reply: {
      id: string;
      title: string;
    };
  }>;
}

export interface ListAction {
  button: string;
  sections: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
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
    this.retryCount = 3; // Default retry count
    this.timeout = 30000; // Default timeout
    
    console.log('[WhatsApp Service] Initializing with provider:', config.provider);
    
    if (config.provider !== 'meta') {
      throw new WhatsAppServiceError('Only Meta provider is supported', config.provider);
    }
    
    const version = config.apiVersion || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${version}/${config.phoneNumberId}`;
  }
 
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    // Validate message length (use hardcoded limit instead of config)
    const maxMessageLength = 4096;
    if (params.message.length > maxMessageLength) {
      throw new WhatsAppServiceError(
        `Message exceeds maximum length of ${maxMessageLength} characters`,
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
    const { to, message, type = 'text', templateName, templateParams, interactive, imageBase64, imageCaption, imageMimeType } = params;
    
    // Handle development mode with mock service
    if (this.config.phoneNumberId === 'dev-phone-id') {
      console.log('[WhatsApp Service] Development mode - simulating message send:', {
        to,
        message: message.substring(0, 50) + '...',
        type,
        hasImage: !!imageBase64
      });
      
      return {
        success: true,
        messageId: `dev-msg-${Date.now()}`,
      };
    }
    
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, ''), // Remove non-digits
    };

    if (type === 'text') {
      payload.type = 'text';
      payload.text = { body: message };
    } else if (type === 'image' && imageBase64) {
      // For WhatsApp Business API, we need to upload media first, then send
      // For now, let's convert base64 to a data URL and send as link
      // TODO: Implement proper media upload to WhatsApp
      
      payload.type = 'image';
      
      // Try to upload the image and get media ID (simplified approach)
      try {
        const mediaId = await this.uploadImageMedia(imageBase64, imageMimeType || 'image/jpeg');
        if (mediaId) {
          payload.image = { id: mediaId };
        } else {
          // Fallback: send as text message with image description
          payload.type = 'text';
          payload.text = { 
            body: `${imageCaption || message}\n\n📸 [Campaign Image - ${imageMimeType}]` 
          };
        }
      } catch (error) {
        console.error('[WhatsApp Service] Failed to upload image, sending text only:', error);
        payload.type = 'text';
        payload.text = { 
          body: `${imageCaption || message}\n\n📸 [Campaign Image]` 
        };
      }
      
      // Add caption if provided and we successfully uploaded image
      if (payload.type === 'image' && imageCaption) {
        payload.image.caption = imageCaption;
      }
    } else if (type === 'interactive' && interactive) {
      payload.type = 'interactive';
      payload.interactive = interactive;
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

  /**
   * Upload image media to WhatsApp and get Media ID
   */
  private async uploadImageMedia(imageBase64: string, mimeType: string): Promise<string | null> {
    try {
      // Handle development mode
      if (this.config.phoneNumberId === 'dev-phone-id') {
        console.log('[WhatsApp Service] Development mode - simulating media upload');
        return `dev-media-${Date.now()}`;
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Create form data for media upload
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: mimeType });
      
      // Use appropriate file extension based on MIME type
      let fileName = 'campaign-image.jpg';
      if (mimeType === 'image/png') {
        fileName = 'campaign-image.png';
      } else if (mimeType === 'image/webp') {
        fileName = 'campaign-image.webp';
      }
      
      formData.append('file', blob, fileName);
      formData.append('type', mimeType);
      formData.append('messaging_product', 'whatsapp');

      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[WhatsApp Service] Media upload failed:', data);
        return null;
      }

      console.log('[WhatsApp Service] Media uploaded successfully:', data.id);
      return data.id;

    } catch (error) {
      console.error('[WhatsApp Service] Error uploading media:', error);
      return null;
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
  try {
    // Access environment variables directly - no config imports
    const provider = 'meta'; // Only support meta for now
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const isDevelopment = process.env.NODE_ENV === 'development';

    console.log('[WhatsApp Service] Creating service with:', {
      provider,
      hasPhoneNumberId: !!phoneNumberId,
      hasAccessToken: !!accessToken,
      isDevelopment
    });

    // Always return a working service in development, even with missing config
    if (isDevelopment) {
      if (!phoneNumberId || !accessToken) {
        console.warn('[WhatsApp Service] Development mode - using mock configuration due to missing environment variables');
      }
      return new WhatsAppService({
        provider: 'meta',
        phoneNumberId: phoneNumberId || 'dev-phone-id',
        accessToken: accessToken || 'dev-access-token',
        apiVersion: 'v18.0',
      });
    }

    // Production mode - require real config
    if (!phoneNumberId || !accessToken) {
      throw new WhatsAppServiceError('Meta WhatsApp configuration is incomplete. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN environment variables.', 'meta');
    }
    
    return new WhatsAppService({
      provider: 'meta',
      phoneNumberId,
      accessToken,
      apiVersion: 'v18.0',
    });
  } catch (error) {
    console.error('[WhatsApp Service] Error creating service:', error);
    
    // Always return a mock service in development to prevent crashes
    if (process.env.NODE_ENV === 'development') {
      console.warn('[WhatsApp Service] Returning mock service due to error');
      return new WhatsAppService({
        provider: 'meta',
        phoneNumberId: 'dev-phone-id',
        accessToken: 'dev-access-token',
        apiVersion: 'v18.0',
      });
    }
    
    throw error;
  }
}

// Create a singleton instance to prevent multiple client creation
let whatsappServiceInstance: WhatsAppService | null = null;

export function getWhatsAppService(): WhatsAppService {
  if (!whatsappServiceInstance) {
    try {
      whatsappServiceInstance = createWhatsAppService();
    } catch (error) {
      console.error('[WhatsApp Service] Failed to create service:', error);
      // Return a mock service in development to prevent app crashes
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WhatsApp Service] Using mock service due to initialization error');
        whatsappServiceInstance = new WhatsAppService({
          provider: 'meta',
          phoneNumberId: 'dev-phone-id',
          accessToken: 'dev-access-token',
          apiVersion: 'v18.0',
        });
      } else {
        throw error;
      }
    }
  }
  return whatsappServiceInstance;
}

// Legacy exports for backward compatibility
export async function sendWhatsAppMessage(params: SendMessageParams): Promise<SendMessageResult> {
  try {
    const service = getWhatsAppService();
    return service.sendMessage(params);
  } catch (error) {
    console.error('[WhatsApp Service] Error in sendWhatsAppMessage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message'
    };
  }
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

// Helper function for interactive messages with fallback
export async function sendInteractiveMessage(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>,
  header?: string,
  footer?: string
): Promise<SendMessageResult> {
  // First try interactive message
  const interactive: InteractiveMessage = {
    type: 'button',
    body: { text: body },
    action: {
      buttons: buttons.map(btn => ({
        type: 'reply' as const,
        reply: {
          id: btn.id,
          title: btn.title
        }
      }))
    }
  };

  if (header) {
    interactive.header = { type: 'text', text: header };
  }

  if (footer) {
    interactive.footer = { text: footer };
  }

  const interactiveResult = await sendWhatsAppMessage({
    to,
    message: '', // Not used for interactive messages
    type: 'interactive',
    interactive
  });

  // If interactive message fails, fall back to text with buttons as options
  if (!interactiveResult.success) {
    console.log('[WhatsApp Service] Interactive message failed, falling back to text');
    
    let fallbackMessage = '';
    if (header) fallbackMessage += `*${header}*\n\n`;
    fallbackMessage += body + '\n\n';
    
    buttons.forEach((btn, index) => {
      fallbackMessage += `${index + 1}. ${btn.title}\n`;
    });
    
    fallbackMessage += '\nReply with the number of your choice.';
    if (footer) fallbackMessage += `\n\n${footer}`;

    return sendWhatsAppMessage({
      to,
      message: fallbackMessage,
      type: 'text'
    });
  }

  return interactiveResult;
}
