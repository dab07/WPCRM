// [NEW: brand-sync] — added 2026-04-11
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
  default_address?: {
    country: string;
    city: string;
  };
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
  line_items: Array<{
    title: string;
    quantity: number;
    price: string;
    product_id: number;
  }>;
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

export class ShopifyService {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor() {
    const shopDomain = config.shopify.shopDomain;
    this.accessToken = config.shopify.accessToken;
    this.baseUrl = `https://${shopDomain}/admin/api/2024-01`;
    this.timeout = externalServicesConfig.shopify.timeout;
    this.retries = externalServicesConfig.shopify.retries;
  }

  private async fetchWithRetry<T>(path: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const res = await fetch(`${this.baseUrl}${path}`, {
            headers: {
              'X-Shopify-Access-Token': this.accessToken,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

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
