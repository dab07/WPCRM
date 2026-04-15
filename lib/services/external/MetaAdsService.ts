// [NEW: brand-sync + campaign-execution] — added 2026-04-11
import { config } from '../../config/environment';
import { externalServicesConfig } from '../../config/external-services';
import * as crypto from 'crypto';

export interface MetaCustomAudience {
  id: string;
  name: string;
  description?: string;
  subtype: 'CUSTOM' | 'WEBSITE' | 'APP' | 'OFFLINE_CONVERSION' | 'LOOKALIKE';
  approximate_count?: number;
  data_source?: { type: string };
  time_created: number;
  time_updated: number;
}

export interface MetaAudienceCreateParams {
  name: string;
  description?: string;
  customerFileSource?: 'USER_PROVIDED_ONLY' | 'PARTNER_PROVIDED_ONLY' | 'BOTH_USER_AND_PARTNER_PROVIDED';
}

export interface MetaAudienceSyncParams {
  audienceId: string;
  emails: string[]; // will be SHA-256 hashed before sending
  phones?: string[]; // will be SHA-256 hashed before sending
}

export interface MetaAdSet {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  targeting?: Record<string, any>;
  daily_budget?: string;
  campaign_id: string;
}

export class MetaAdsServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'MetaAdsServiceError';
  }
}

export class MetaAdsService {
  private readonly accessToken: string;
  private readonly adAccountId: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor() {
    this.accessToken = config.metaAds.accessToken;
    this.adAccountId = config.metaAds.adAccountId;
    this.apiVersion = config.metaAds.apiVersion ?? 'v19.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.timeout = externalServicesConfig.metaAds.timeout;
    this.retries = externalServicesConfig.metaAds.retries;
  }

  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
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

        // Append access_token to URL
        const separator = path.includes('?') ? '&' : '?';
        const url = `${this.baseUrl}${path}${separator}access_token=${this.accessToken}`;

        try {
          const res = await fetch(url, {
            ...options,
            headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            const body = await res.text();
            throw new MetaAdsServiceError(
              `Meta Ads API error ${res.status}: ${body}`,
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

    throw new MetaAdsServiceError(
      `Meta Ads request failed after ${this.retries + 1} attempts: ${lastError?.message}`,
      undefined,
      lastError ?? undefined
    );
  }

  async getCustomAudiences(): Promise<MetaCustomAudience[]> {
    const data = await this.fetchWithRetry<{ data: MetaCustomAudience[] }>(
      `/act_${this.adAccountId}/customaudiences?fields=id,name,description,subtype,approximate_count,time_created,time_updated`
    );
    return data.data ?? [];
  }

  /** Creates a new customer list custom audience */
  async createCustomAudience(params: MetaAudienceCreateParams): Promise<MetaCustomAudience> {
    const body = {
      name: params.name,
      description: params.description ?? '',
      subtype: 'CUSTOM',
      customer_file_source: params.customerFileSource ?? 'USER_PROVIDED_ONLY',
    };

    const data = await this.fetchWithRetry<MetaCustomAudience>(
      `/act_${this.adAccountId}/customaudiences`,
      { method: 'POST', body: JSON.stringify(body) }
    );

    return data;
  }

  /**
   * Syncs hashed customer data (emails + phones) into a custom audience.
   * Emails and phones are SHA-256 hashed before transmission per Meta requirements.
   */
  async syncAudienceMembers(params: MetaAudienceSyncParams): Promise<{ num_received: number; num_invalid_entries: number }> {
    const schema: string[] = ['EMAIL'];
    const data: string[][] = params.emails.map(e => [this.hashValue(e)]);

    if (params.phones?.length) {
      schema.push('PHONE');
      params.phones.forEach((phone, i) => {
        if (data[i]) {
          data[i].push(this.hashValue(phone));
        }
      });
    }

    const payload = {
      payload: {
        schema,
        data,
      },
    };

    const result = await this.fetchWithRetry<{ num_received: number; num_invalid_entries: number }>(
      `/${params.audienceId}/users`,
      { method: 'POST', body: JSON.stringify(payload) }
    );

    return result;
  }

  async getAdSets(campaignId?: string): Promise<MetaAdSet[]> {
    const filter = campaignId ? `&campaign_id=${campaignId}` : '';
    const data = await this.fetchWithRetry<{ data: MetaAdSet[] }>(
      `/act_${this.adAccountId}/adsets?fields=id,name,status,targeting,daily_budget,campaign_id${filter}`
    );
    return data.data ?? [];
  }
}
