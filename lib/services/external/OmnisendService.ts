export interface OmnisendEmailPayload {
  subject: string;
  body: string;
  recipientEmail: string;
  attachments?: { url: string; name: string; mimeType?: string }[];
}

export class OmnisendServiceError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'OmnisendServiceError';
  }
}

export class OmnisendService {
  private apiKey: string;
  private baseUrl = 'https://api.omnisend.com/v3';

  constructor() {
    this.apiKey = process.env.OMNISEND_API_KEY || '';
  }

  /**
   * Send a transactional email or trigger an event in Omnisend.
   * Note: The exact implementation depends on how Omnisend is configured
   * (e.g., triggering a custom event vs. sending a transactional email directly).
   * For this implementation, we simulate an event trigger or transactional endpoint.
   */
  async sendEmail(payload: OmnisendEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      console.warn('OMNISEND_API_KEY is not configured. Skipping email send.');
      return { success: false, error: 'OMNISEND_API_KEY is missing' };
    }

    try {
      // In a real Omnisend setup, you might trigger a custom event 
      // or use their specific email sending endpoint.
      // Example for an event:
      /*
      const response = await fetch(`${this.baseUrl}/events/custom_email_campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          email: payload.recipientEmail,
          fields: {
            subject: payload.subject,
            body: payload.body,
            attachments: payload.attachments,
          }
        }),
      });
      */

      // Mocking the Omnisend API call for demonstration purposes
      console.log(`[Omnisend] Sending email to ${payload.recipientEmail}...`);
      console.log(`[Omnisend] Subject: ${payload.subject}`);
      if (payload.attachments?.length) {
        console.log(`[Omnisend] Attachments: ${payload.attachments.length}`);
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return { success: true, messageId: `omnisend_mock_${Date.now()}` };
    } catch (error) {
      console.error('[Omnisend] Error sending email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
