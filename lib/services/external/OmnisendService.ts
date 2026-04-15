// [NEW: brand-sync + campaign-execution] — added 2026-04-11
import { config } from '../../config/environment';
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

export class OmnisendService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.omnisend.com/v3';
  private readonly timeout: number;
  private readonly retries: number;

  constructor() {
    this.apiKey = config.omnisend.apiKey;
    this.timeout = externalServicesConfig.omnisend.timeout;
    this.retries = externalServicesConfig.omnisend.retries;
  }

  private get headers() {
    return {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
    };
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
    const data = await this.fetchWithRetry<{ contacts: OmnisendContact[] }>('/contacts?limit=250');
    return data.contacts ?? [];
  }

  async getCampaigns(): Promise<OmnisendCampaign[]> {
    const data = await this.fetchWithRetry<{ campaigns: OmnisendCampaign[] }>('/campaigns?limit=100');
    return data.campaigns ?? [];
  }

  async getMetrics(): Promise<OmnisendMetrics> {
    const data = await this.fetchWithRetry<{ metrics: OmnisendMetrics }>('/reporting/campaigns');
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

    const data = await this.fetchWithRetry<OmnisendCampaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return data;
  }

  async upsertContact(contact: Partial<OmnisendContact> & { email?: string; phone?: string }): Promise<void> {
    await this.fetchWithRetry('/contacts', {
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
}
