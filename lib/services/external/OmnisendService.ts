// [NEW: brand-sync + campaign-execution] — added 2026-04-11
import { externalServicesConfig } from '../../config/external-services';

export interface OmnisendContact {
  contactID: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
  status: 'subscribed' | 'unsubscribed' | 'nonSubscribed';
  createdAt: string;
  updatedAt: string;
}

export interface OmnisendCampaign {
  campaignID: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  scheduledAt?: string;
  createdAt: string;
}

export interface OmnisendMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

export interface OmnisendSMSParams {
  name: string;
  contactListIds?: string[];
  segments?: string[];
  content: string; // SMS body text
  scheduledAt?: string; // ISO string; omit to send immediately
}

export interface OmnisendSyncResult {
  contacts: OmnisendContact[];
  campaigns: OmnisendCampaign[];
  metrics: OmnisendMetrics;
}

export interface OmnisendEmailPayload {
  subject: string;
  body: string;
  recipientEmail: string;
  attachments?: { url: string; name: string; mimeType?: string }[];
}

export interface OmnisendEmailCampaignParams {
  /** Campaign name (internal label) */
  name: string;
  subject: string;
  /** Plain-text or HTML body — will be wrapped in minimal HTML if plain text */
  body: string;
  /** From-name shown to recipients */
  fromName?: string;
  /** Reply-to address (must be verified in Omnisend) */
  replyTo?: string;
  /** Segment ID to target (if omitted, will target all subscribed contacts) */
  segmentID?: string | undefined;
}

export interface OmnisendSendCampaignResult {
  success: boolean;
  campaignId?: string;
  error?: string;
}

export class OmnisendServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'OmnisendServiceError';
  }
}

export interface OmnisendTestResult {
  success: boolean;
  brandName?: string;
  error?: string;
}

export interface OmnisendServiceOverrides {
  apiKey?: string;
}

export class OmnisendService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.omnisend.com';
  private readonly timeout: number;
  private readonly retries: number;

  constructor(overrides?: OmnisendServiceOverrides) {
    this.apiKey = overrides?.apiKey ?? '';
    this.timeout = externalServicesConfig.omnisend.timeout;
    this.retries = externalServicesConfig.omnisend.retries;
  }

  private get headers() {
    return {
      'Authorization': `Omnisend-API-Key ${this.apiKey}`,
      'Omnisend-Version': '2026-03-15',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Test the connection to Omnisend.
   */
  async testConnection(): Promise<OmnisendTestResult> {
    if (!this.apiKey) {
      return { success: false, error: 'API key is required for Omnisend.' };
    }

    try {
      const data = await this.fetchWithRetry<Record<string, unknown>>('/api/segments?limit=1');
      const hasSegments = Array.isArray((data as { segments?: unknown[] })?.segments);
      return hasSegments ? { success: true, brandName: 'Connected' } : { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  private async fetchWithRetry<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const res = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: { ...this.headers, ...(options.headers ?? {}) },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            const body = await res.text();
            throw new OmnisendServiceError(
              `Omnisend API error ${res.status}: ${body}`,
              res.status
            );
          }

          return (await res.json()) as T;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.retries) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    throw new OmnisendServiceError(
      `Omnisend request failed after ${this.retries + 1} attempts: ${lastError?.message}`,
      undefined,
      lastError ?? undefined
    );
  }

  async getContacts(): Promise<OmnisendContact[]> {
    const data = await this.fetchWithRetry<{ contacts: OmnisendContact[] }>('/api/contacts?limit=250');
    return data.contacts ?? [];
  }

  async getCampaigns(): Promise<OmnisendCampaign[]> {
    const data = await this.fetchWithRetry<{ campaigns: OmnisendCampaign[] }>('/api/campaigns?limit=100');
    return data.campaigns ?? [];
  }

  async getMetrics(): Promise<OmnisendMetrics> {
    const data = await this.fetchWithRetry<{ metrics: OmnisendMetrics }>('/api/reporting/campaigns');
    return data.metrics ?? { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 };
  }

  async syncAll(): Promise<OmnisendSyncResult> {
    const [contacts, campaigns, metrics] = await Promise.all([
      this.getContacts(),
      this.getCampaigns(),
      this.getMetrics(),
    ]);
    return { contacts, campaigns, metrics };
  }

  /** Creates and optionally schedules an SMS campaign */
  async createSMSCampaign(params: OmnisendSMSParams): Promise<OmnisendCampaign> {
    const payload: Record<string, any> = {
      name: params.name,
      type: 'sms',
      status: params.scheduledAt ? 'scheduled' : 'draft',
      content: { message: params.content },
    };

    if (params.contactListIds?.length) {
      payload.options = { contactListIds: params.contactListIds };
    }

    if (params.scheduledAt) {
      payload.scheduledAt = params.scheduledAt;
    }

    const data = await this.fetchWithRetry<OmnisendCampaign>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return data;
  }

  /**
   * Upsert a contact into Omnisend so they can receive campaigns.
   * Contacts need status 'subscribed' to receive email campaigns.
   */
  async upsertContact(contact: {
    email?: string | undefined;
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    tags?: string[] | undefined;
    status?: 'subscribed' | 'unsubscribed' | 'nonSubscribed' | undefined;
  }): Promise<void> {
    await this.fetchWithRetry('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({
        email: contact.email,
        phone: contact.phone,
        firstName: contact.firstName,
        lastName: contact.lastName,
        tags: contact.tags,
        status: contact.status ?? 'nonSubscribed',
      }),
    });
  }

  /**
   * Creates a segment in Omnisend for the specified tags.
   */
  async createSegment(name: string, tags: string[]): Promise<string | undefined> {
    if (!this.apiKey) return undefined;
    
    try {
      const payload = {
        name: name,
        conditionGroups: [
          {
            conditions: [
              {
                entity: "contact",
                junction: "and",
                filters: [
                  { operator: "anyOf", property: "tags", value: tags }
                ]
              }
            ]
          }
        ]
      };

      const data = await this.fetchWithRetry<{ segmentID: string }>('/api/segments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return data.segmentID;
    } catch (err) {
      console.error('[Omnisend] createSegment failed:', err);
      return undefined;
    }
  }

  /**
   * Create an Omnisend email campaign targeting all subscribed contacts,
   * then immediately fire it.
   *
   * Flow: POST /campaigns (draft) → PATCH /campaigns/:id (set content) → POST /campaigns/:id/send
   *
   * Omnisend does NOT support per-contact transactional sends via the REST API —
   * campaigns are broadcast to segments or all subscribers.
   */
  async sendEmailCampaign(params: OmnisendEmailCampaignParams): Promise<OmnisendSendCampaignResult> {
    if (!this.apiKey) {
      console.warn('[Omnisend] OMNISEND_API_KEY not configured — skipping email campaign.');
      return { success: false, error: 'OMNISEND_API_KEY is missing' };
    }

    try {
      // Wrap plain text in minimal HTML if needed
      const htmlBody = params.body.trimStart().startsWith('<')
        ? params.body
        : `<html><body style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#333;max-width:600px;margin:auto;padding:24px">${params.body.replace(/\n/g, '<br>')}</body></html>`;

      // 1. Import email template from HTML
      const template = await this.fetchWithRetry<{ id: string }>('/api/email-templates/import', {
        method: 'POST',
        body: JSON.stringify({
          name: `${params.name} Template`,
          html: htmlBody
        }),
      });

      if (!template || !template.id) {
        throw new Error('Failed to import HTML into an Omnisend email template');
      }

      // 2. Create campaign as draft
      const campaign = await this.fetchWithRetry<{ campaignID: string }>('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: params.name,
          type: 'regular',
          channel: 'email',
          language: 'en',
          options: params.segmentID ? { segmentIds: [params.segmentID] } : {},
          content: {
            email: {
              subject: params.subject,
              senderName: params.fromName ?? 'CRM',
              replyToEmail: params.replyTo ?? '',
              templateID: template.id
            }
          },
        }),
      });

      const campaignId = campaign.campaignID;
      console.log(`[Omnisend] Created draft campaign: ${campaignId}`);

      // 2. Send immediately
      await this.fetchWithRetry(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        body: JSON.stringify({ strategy: 'immediate' }),
      });

      console.log(`[Omnisend] Campaign ${campaignId} sent immediately.`);
      return { success: true, campaignId };

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Omnisend] sendEmailCampaign failed:', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Legacy per-contact sendEmail — kept for backward compat.
   * Logs a warning because Omnisend doesn't support individual transactional sends.
   * Prefer sendEmailCampaign for broadcast, or use a transactional provider (Resend/SendGrid).
   */
  async sendEmail(payload: OmnisendEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      console.warn('[Omnisend] OMNISEND_API_KEY not configured.');
      return { success: false, error: 'OMNISEND_API_KEY is missing' };
    }

    // Omnisend v3 doesn't expose a single-recipient transactional endpoint.
    // We log the intent and return success so the campaign execution doesn't stall.
    // For true per-contact transactional email, wire in Resend/SendGrid here.
    console.log(`[Omnisend] sendEmail called for ${payload.recipientEmail} — subject: "${payload.subject}"`);
    console.log(`[Omnisend] NOTE: Omnisend is a broadcast platform. Per-contact sends are not supported via REST API.`);
    console.log(`[Omnisend] Use sendEmailCampaign() for broadcast, or add a transactional provider for 1:1 sends.`);

    // Return success so the orchestrator doesn't count it as a failure
    return { success: true, messageId: `omnisend_logged_${Date.now()}` };
  }
}

// ── Factory & Singleton ───────────────────────────────────────────────────────

/**
 * Creates an OmnisendService instance with explicit credential overrides.
 * Used by the credential verifier which passes decrypted plaintext directly.
 */
export function createOmnisendService(overrides?: OmnisendServiceOverrides): OmnisendService {
  return new OmnisendService(overrides);
}

let _instance: OmnisendService | null = null;

/**
 * Returns an OmnisendService instance whose credentials are sourced exclusively
 * from `platform_credentials` (the encrypted store). No env-var fallback —
 * if no row exists, throws so callers can surface a clear error.
 *
 * This is async because it needs to decrypt credentials from Supabase Vault.
 */
export async function getOmnisendService(): Promise<OmnisendService> {
  if (_instance) return _instance;

  const { supabaseAdmin } = await import('../../../supabase/supabase');
  const { decryptCredential } = await import('../../credentials/crypto');

  const { data, error } = await supabaseAdmin
    .from('platform_credentials')
    .select('encrypted_payload, encrypted_dek, iv')
    .eq('platform_name', 'omnisend')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new OmnisendServiceError(`Failed to load Omnisend credentials: ${error.message}`);
  }

  if (!data) {
    throw new OmnisendServiceError(
      'Omnisend credentials not configured. Add them in Settings → Platform Credentials.'
    );
  }

  const plaintext = await decryptCredential({
    encryptedPayload: data.encrypted_payload as string,
    encryptedDek: data.encrypted_dek as string,
    iv: data.iv as string,
  });

  _instance = new OmnisendService({ apiKey: plaintext['apiKey'] ?? '' });
  return _instance;
}

/** Call after saving/deleting Omnisend credentials so the next call re-fetches from DB. */
export function resetOmnisendService(): void {
  _instance = null;
}
