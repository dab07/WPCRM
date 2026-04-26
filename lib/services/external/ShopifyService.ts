import { config } from '../../config/environment';
import { externalServicesConfig } from '../../config/external-services';

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  tags: string;
  orders_count: number;
  total_spent: string;
  created_at: string;
  updated_at: string;
  accepts_marketing: boolean;
  default_address?: { country: string; city: string };
}

export interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  customer: { id: number };
  total_price: string;
  subtotal_price: string;
  financial_status: 'pending' | 'paid' | 'refunded' | 'partially_refunded' | 'voided';
  fulfillment_status: 'fulfilled' | 'partial' | 'unfulfilled' | null;
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    product_id: number;
    variant_id: number;
  }>;
  created_at: string;
  updated_at: string;
  source_name: string;
}

export interface ShopifyAbandonedCart {
  id: number;
  token: string;
  email: string;
  customer: { id: number } | null;
  total_price: string;
  line_items: Array<{ title: string; quantity: number; price: string; product_id: number }>;
  abandoned_checkout_url: string;
  created_at: string;
  updated_at: string;
}

export interface ShopifySyncResult {
  customers: ShopifyCustomer[];
  orders: ShopifyOrder[];
  abandonedCarts: ShopifyAbandonedCart[];
}

export class ShopifyServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ShopifyServiceError';
  }
}

// In-memory token cache (per process). Tokens expire in 24h; we refresh 5 min early.
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
const TOKEN_BUFFER_MS = 5 * 60 * 1000;

export class ShopifyService {
  private readonly shopDomain: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor() {
    this.shopDomain = config.shopify.shopDomain;
    this.clientId = config.shopify.clientId;
    this.clientSecret = config.shopify.clientSecret;
    this.baseUrl = `https://${this.shopDomain}/admin/api/2024-01`;
    this.timeout = externalServicesConfig.shopify.timeout;
    this.retries = externalServicesConfig.shopify.retries;
  }

  private async fetchAccessToken(): Promise<string> {
    const url = `https://${this.shopDomain}/admin/oauth/access_token`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ShopifyServiceError(
        `Shopify OAuth token request failed (${res.status}): ${text}`,
        res.status
      );
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };

    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000 - TOKEN_BUFFER_MS;

    return cachedToken;
  }

  private async getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiresAt) {
      return cachedToken;
    }
    return this.fetchAccessToken();
  }

  private async fetchWithRetry<T>(path: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const token = await this.getAccessToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const res = await fetch(`${this.baseUrl}${path}`, {
            headers: {
              'X-Shopify-Access-Token': token,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          // 401 = token rejected — clear cache so next attempt re-fetches
          if (res.status === 401 && attempt === 0) {
            cachedToken = null;
            tokenExpiresAt = 0;
            throw new ShopifyServiceError('Token rejected (401) — will refresh', 401);
          }

          if (!res.ok) {
            throw new ShopifyServiceError(
              `Shopify API error: ${res.status} ${res.statusText}`,
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

    throw new ShopifyServiceError(
      `Shopify request failed after ${this.retries + 1} attempts: ${lastError?.message}`,
      undefined,
      lastError ?? undefined
    );
  }

  async getCustomers(updatedSince?: string): Promise<ShopifyCustomer[]> {
    const since = updatedSince ? `&updated_at_min=${updatedSince}` : '';
    const data = await this.fetchWithRetry<{ customers: ShopifyCustomer[] }>(
      `/customers.json?limit=250${since}`
    );
    return data.customers;
  }

  async getOrders(updatedSince?: string): Promise<ShopifyOrder[]> {
    const since = updatedSince ? `&updated_at_min=${updatedSince}` : '';
    const data = await this.fetchWithRetry<{ orders: ShopifyOrder[] }>(
      `/orders.json?limit=250&status=any${since}`
    );
    return data.orders;
  }

  async getAbandonedCarts(updatedSince?: string): Promise<ShopifyAbandonedCart[]> {
    const since = updatedSince ? `&updated_at_min=${updatedSince}` : '';
    const data = await this.fetchWithRetry<{ checkouts: ShopifyAbandonedCart[] }>(
      `/checkouts.json?limit=250${since}`
    );
    return data.checkouts;
  }

  async syncAll(updatedSince?: string): Promise<ShopifySyncResult> {
    const [customers, orders, abandonedCarts] = await Promise.all([
      this.getCustomers(updatedSince),
      this.getOrders(updatedSince),
      this.getAbandonedCarts(updatedSince),
    ]);
    return { customers, orders, abandonedCarts };
  }
}
