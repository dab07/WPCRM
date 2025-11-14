// WhatsApp Business API Client
// Supports Meta Cloud API, Twilio, 360Dialog, Wati, Vonage, MessageBird

interface WhatsAppConfig {
  provider: 'meta' | 'twilio' | '360dialog' | 'wati' | 'vonage' | 'messagebird';
  // Meta Cloud API
  phoneNumberId?: string;
  accessToken?: string;
  apiVersion?: string;
  // Twilio
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioWhatsAppNumber?: string;
  // 360Dialog
  dialog360ApiKey?: string;
  dialog360PartnerId?: string;
  // Wati
  watiApiKey?: string;
  watiApiUrl?: string;
  // Vonage
  vonageApiKey?: string;
  vonageApiSecret?: string;
  vonageWhatsAppNumber?: string;
  // MessageBird
  messagebirdApiKey?: string;
  messagebirdChannelId?: string;
}

interface SendMessageParams {
  to: string;
  message: string;
  type?: 'text' | 'template';
  templateName?: string;
  templateParams?: string[];
}

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
}

class WhatsAppService {
  private config: WhatsAppConfig;
  private baseUrl: string;

  constructor(config: WhatsAppConfig) {
    this.config = config;
    
    switch (config.provider) {
      case 'meta':
        const version = config.apiVersion || 'v21.0';
        this.baseUrl = `https://graph.facebook.com/${version}/${config.phoneNumberId}`;
        break;
      case 'twilio':
        this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}`;
        break;
      case '360dialog':
        this.baseUrl = `https://waba.360dialog.io/v1`;
        break;
      case 'wati':
        this.baseUrl = config.watiApiUrl || '';
        break;
      case 'vonage':
        this.baseUrl = `https://messages-sandbox.nexmo.com/v1/messages`;
        break;
      case 'messagebird':
        this.baseUrl = `https://conversations.messagebird.com/v1`;
        break;
    }
  }

  async sendMessage(params: SendMessageParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      switch (this.config.provider) {
        case 'meta':
          return await this.sendMetaMessage(params);
        case 'twilio':
          return await this.sendTwilioMessage(params);
        case '360dialog':
          return await this.send360DialogMessage(params);
        case 'wati':
          return await this.sendWatiMessage(params);
        case 'vonage':
          return await this.sendVonageMessage(params);
        case 'messagebird':
          return await this.sendMessageBirdMessage(params);
        default:
          throw new Error('Invalid provider');
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendMetaMessage(params: SendMessageParams) {
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

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to send message');
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  }

  private async sendTwilioMessage(params: SendMessageParams) {
    const { to, message } = params;
    
    const formData = new URLSearchParams();
    formData.append('From', this.config.twilioWhatsAppNumber || '');
    formData.append('To', `whatsapp:${to}`);
    formData.append('Body', message);

    const auth = Buffer.from(
      `${this.config.twilioAccountSid}:${this.config.twilioAuthToken}`
    ).toString('base64');

    const response = await fetch(`${this.baseUrl}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send message');
    }

    return {
      success: true,
      messageId: data.sid,
    };
  }

  private async send360DialogMessage(params: SendMessageParams) {
    const { to, message } = params;
    
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'D360-API-KEY': this.config.dialog360ApiKey || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: message },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to send');

    return { success: true, messageId: data.messages?.[0]?.id };
  }

  private async sendWatiMessage(params: SendMessageParams) {
    const { to, message } = params;
    
    const response = await fetch(`${this.baseUrl}/api/v1/sendSessionMessage/${to}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.watiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageText: message,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to send');

    return { success: true, messageId: data.result?.messageId };
  }

  private async sendVonageMessage(params: SendMessageParams) {
    const { to, message } = params;
    
    const auth = Buffer.from(
      `${this.config.vonageApiKey}:${this.config.vonageApiSecret}`
    ).toString('base64');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.vonageWhatsAppNumber,
        to: to,
        message_type: 'text',
        text: message,
        channel: 'whatsapp',
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.title || 'Failed to send');

    return { success: true, messageId: data.message_uuid };
  }

  private async sendMessageBirdMessage(params: SendMessageParams) {
    const { to, message } = params;
    
    const response = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `AccessKey ${this.config.messagebirdApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: to,
        from: this.config.messagebirdChannelId,
        type: 'text',
        content: { text: message },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to send');

    return { success: true, messageId: data.id };
  }

  parseWebhookMessage(body: any): WhatsAppMessage | null {
    try {
      switch (this.config.provider) {
        case 'meta':
        case '360dialog': {
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
        }
        
        case 'twilio': {
          return {
            id: body.MessageSid,
            from: body.From?.replace('whatsapp:', ''),
            timestamp: new Date().toISOString(),
            type: body.MediaContentType0 ? 'image' : 'text',
            text: body.Body ? { body: body.Body } : undefined,
          };
        }
        
        case 'wati': {
          return {
            id: body.id,
            from: body.waId,
            timestamp: body.created,
            type: 'text',
            text: body.text ? { body: body.text } : undefined,
          };
        }
        
        case 'vonage': {
          return {
            id: body.message_uuid,
            from: body.from,
            timestamp: body.timestamp,
            type: body.message_type,
            text: body.text ? { body: body.text } : undefined,
          };
        }
        
        case 'messagebird': {
          return {
            id: body.id,
            from: body.from,
            timestamp: body.createdDatetime,
            type: body.type,
            text: body.content?.text ? { body: body.content.text } : undefined,
          };
        }
      }
    } catch (error) {
      console.error('Error parsing webhook:', error);
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

// Initialize WhatsApp service based on environment
export function createWhatsAppService(): WhatsAppService {
  const provider = process.env.WHATSAPP_PROVIDER as WhatsAppConfig['provider'] || 'twilio';

  switch (provider) {
    case 'meta':
      return new WhatsAppService({
        provider: 'meta',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
      });
    
    case 'twilio':
      return new WhatsAppService({
        provider: 'twilio',
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
        twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER,
      });
    
    case '360dialog':
      return new WhatsAppService({
        provider: '360dialog',
        dialog360ApiKey: process.env.DIALOG_360_API_KEY,
        dialog360PartnerId: process.env.DIALOG_360_PARTNER_ID,
      });
    
    case 'wati':
      return new WhatsAppService({
        provider: 'wati',
        watiApiKey: process.env.WATI_API_KEY,
        watiApiUrl: process.env.WATI_API_URL,
      });
    
    case 'vonage':
      return new WhatsAppService({
        provider: 'vonage',
        vonageApiKey: process.env.VONAGE_API_KEY,
        vonageApiSecret: process.env.VONAGE_API_SECRET,
        vonageWhatsAppNumber: process.env.VONAGE_WHATSAPP_NUMBER,
      });
    
    case 'messagebird':
      return new WhatsAppService({
        provider: 'messagebird',
        messagebirdApiKey: process.env.MESSAGEBIRD_API_KEY,
        messagebirdChannelId: process.env.MESSAGEBIRD_CHANNEL_ID,
      });
    
    default:
      throw new Error(`Unsupported WhatsApp provider: ${provider}`);
  }
}

export { WhatsAppService };
export type { SendMessageParams, WhatsAppMessage };
