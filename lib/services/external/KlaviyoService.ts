// [NEW: brand-sync + campaign-execution] — added 2026-04-11
import { config } from '../../config/environment';
import { externalServicesConfig } from '../../config/external-services';

export interface KlaviyoProfile {
  id: string;
  email: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  properties?: Record<string, any>;
}

export interface KlaviyoList {
  id: string;
  name: string;
  created: string;
  updated: string;
  opt_in_process: string;
}

export interface KlaviyoFlow {
  id: string;
  name: string;
  status: 'draft' | 'manual' | 'live' | 'archived';
  created: string;
  updated: string;
}

export interface KlaviyoMetric {
  id: string;
  name: string;
  created: string;
  updated: string;
  integration: { name: string; category: string };
}

export interface KlaviyoCampaignCreateParams {
  name: string;
  listId: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  htmlContent: string;
  scheduledAt?: string; // ISO string; omit to send immediately
}

export interface KlaviyoCampaignResult {
  id: string;
  name: string;
  status: string;
  scheduledAt?: string;
}

export interface KlaviyoSyncResult {
  lists: KlaviyoList[];
  flows: KlaviyoFlow[];
  metrics: KlaviyoMetric[];
}

export class KlaviyoServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'KlaviyoServiceError';
  }
}

export class KlaviyoService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://a.klaviyo.com/api';
  private readonly timeout: number;
  private readonly retries: number;

  constructor() {
    this.apiKey = config.klaviyo.apiKey;
    this.timeout = externalServicesConfig.klaviyo.timeout;
    this.retries = externalServicesConfig.klaviyo.retries;
  }

  private get headers() {
    return {
      Authorization: `Klaviyo-API-Key ${this.apiKey}`,
      'Content-Type': 'application/json',
      revision: '2024-02-15',
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
            throw new KlaviyoServiceError(
              `Klaviyo API error ${res.status}: ${body}`,
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

    throw new KlaviyoServiceError(
      `Klaviyo request failed after ${this.retries + 1} attempts: ${lastError?.message}`,
      undefined,
      lastError ?? undefined
    );
  }

  async getLists(): Promise<KlaviyoList[]> {
    const data = await this.fetchWithRetry<{ data: any[] }>('/lists/');
    return data.data.map(l => ({
      id: l.id,
      name: l.attributes.name,
      created: l.attributes.created,
      updated: l.attributes.updated,
      opt_in_process: l.attributes.opt_in_process,
    }));
  }

  async getFlows(): Promise<KlaviyoFlow[]> {
    const data = await this.fetchWithRetry<{ data: any[] }>('/flows/');
    return data.data.map(f => ({
      id: f.id,
      name: f.attributes.name,
      status: f.attributes.status,
      created: f.attributes.created,
      updated: f.attributes.updated,
    }));
  }

  async getMetrics(): Promise<KlaviyoMetric[]> {
    const data = await this.fetchWithRetry<{ data: any[] }>('/metrics/');
    return data.data.map(m => ({
      id: m.id,
      name: m.attributes.name,
      created: m.attributes.created,
      updated: m.attributes.updated,
      integration: m.attributes.integration,
    }));
  }

  async syncAll(): Promise<KlaviyoSyncResult> {
    const [lists, flows, metrics] = await Promise.all([
      this.getLists(),
      this.getFlows(),
      this.getMetrics(),
    ]);
    return { lists, flows, metrics };
  }

  /** Creates and optionally schedules a Klaviyo email campaign */
  async createEmailCampaign(params: KlaviyoCampaignCreateParams): Promise<KlaviyoCampaignResult> {
    // Step 1: create campaign
    const campaignPayload = {
      data: {
        type: 'campaign',
        attributes: {
          name: params.name,
          audiences: { included: [params.listId] },
          send_options: { use_smart_sending: true },
          tracking_options: { is_tracking_clicks: true, is_tracking_opens: true },
          send_strategy: params.scheduledAt
            ? { method: 'static', options_static: { datetime: params.scheduledAt } }
            : { method: 'immediate' },
          campaign_messages: {
            data: [{
              type: 'campaign-message',
              attributes: {
                channel: 'email',
                label: params.name,
                content: {
                  subject: params.subject,
                  preview_text: '',
                  from_email: params.fromEmail,
                  from_label: params.fromName,
                  reply_to_email: params.fromEmail,
                },
              },
            }],
          },
        },
      },
    };

    const created = await this.fetchWithRetry<{ data: any }>('/campaigns/', {
      method: 'POST',
      body: JSON.stringify(campaignPayload),
    });

    return {
      id: created.data.id,
      name: created.data.attributes.name,
      status: created.data.attributes.status,
      scheduledAt: params.scheduledAt,
    };
  }

  async upsertProfile(profile: Omit<KlaviyoProfile, 'id'>): Promise<KlaviyoProfile> {
    const payload = {
      data: {
        type: 'profile',
        attributes: {
          email: profile.email,
          phone_number: profile.phone_number,
          first_name: profile.first_name,
          last_name: profile.last_name,
          properties: profile.properties,
        },
      },
    };

    const data = await this.fetchWithRetry<{ data: any }>('/profile-import/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: data.data.id,
      email: data.data.attributes.email,
      phone_number: data.data.attributes.phone_number,
      first_name: data.data.attributes.first_name,
      last_name: data.data.attributes.last_name,
    };
  }
}
