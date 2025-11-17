const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export interface SendMessageParams {
  to: string; // Phone number in E.164 format (without +)
  message: string;
  type?: 'text' | 'template';
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send WhatsApp message using Meta Cloud API
 */
export async function sendWhatsAppMessage({
  to,
  message,
  type = 'text',
}: SendMessageParams): Promise<SendMessageResult> {
  try {
    // Remove + from phone number for Meta API
    const cleanPhone = to.replace(/^\+/, '');

    console.log('[WhatsApp Cloud] 📤 Sending message:', {
      to: cleanPhone,
      messageLength: message.length,
      type,
    });

    const response = await fetch(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: type,
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp Cloud] ❌ Error:', data);
      throw new Error(data.error?.message || 'Failed to send message');
    }

    console.log('[WhatsApp Cloud] ✅ Message sent:', {
      messageId: data.messages?.[0]?.id,
      status: 'sent',
    });

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error: any) {
    console.error('[WhatsApp Cloud] ❌ Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message',
    };
  }
}

/**
 * Send welcome message to new contact
 */
export async function sendWelcomeMessage(
  phoneNumber: string,
  contactName: string
): Promise<SendMessageResult> {
  console.log('[WhatsApp Cloud] 👋 Sending welcome message to:', contactName);

  const message = `Hi ${contactName}! 👋

Welcome to our service! We're so excited to connect with you! 🎉

Feel free to message us anytime - we're here to help!

How can we assist you today? 😊`;

  return sendWhatsAppMessage({
    to: phoneNumber,
    message,
  });
}

/**
 * Send template message with variables
 */
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

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('[WhatsApp Cloud] Error marking as read:', error);
    return false;
  }
}
