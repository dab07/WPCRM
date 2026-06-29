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

export interface ShopifyProduct {
  id: number;
  title: string;
  product_type: string;
  tags: string;
  status: string;
  vendor: string;
  variants: Array<{ id: number; title: string; price: string; sku: string; inventory_quantity: number }>;
  images: Array<{ id: number; src: string; alt: string | null }>;
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
  private readonly shopDomain: string;
  private accessToken: string | null;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(shopDomain?: string, accessToken?: string, clientId?: string, clientSecret?: string) {
    this.shopDomain  = shopDomain  ?? config.shopify.shopDomain;
    this.clientId    = clientId ?? config.shopify.clientId;
    this.clientSecret = clientSecret ?? config.shopify.clientSecret;
    // For legacy custom apps, clientSecret was used as the static Admin API token.
    // If no OAuth clientId is provided but a secret is, fallback to using it as the token.
    this.accessToken = accessToken ?? (!this.clientId && this.clientSecret ? this.clientSecret : null);
    this.baseUrl     = `https://${this.shopDomain}/admin/api/2025-01`;
    this.timeout     = externalServicesConfig.shopify.timeout;
    this.retries     = externalServicesConfig.shopify.retries;
  }

  async requestAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new ShopifyServiceError('Client ID and Client Secret are required for OAuth token exchange');
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`https://${this.shopDomain}/admin/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new ShopifyServiceError(`OAuth failed: ${res.status} ${res.statusText}`, res.status);
      }

      const data = await res.json() as { access_token: string; expires_in: number };
      this.accessToken = data.access_token;
      return this.accessToken;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.requestAccessToken();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  private async fetchWithRetry<T>(path: string, method: string = 'GET', body?: any): Promise<T> {
    if (!this.accessToken) {
      await this.requestAccessToken();
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), this.timeout);

      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          method: method,
          headers: {
            'X-Shopify-Access-Token': this.accessToken!,
            'Content-Type': 'application/json',
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
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
    const since = updatedSince ? `&updated_at_min=${encodeURIComponent(updatedSince)}` : '';
    const data  = await this.fetchWithRetry<{ customers: ShopifyCustomer[] }>(
      `/customers.json?limit=250${since}`
    );
    return data.customers;
  }

  async getOrders(updatedSince?: string): Promise<ShopifyOrder[]> {
    const since = updatedSince ? `&updated_at_min=${encodeURIComponent(updatedSince)}` : '';
    const data  = await this.fetchWithRetry<{ orders: ShopifyOrder[] }>(
      `/orders.json?limit=250&status=any${since}`
    );
    return data.orders;
  }

  async getAbandonedCarts(updatedSince?: string): Promise<ShopifyAbandonedCart[]> {
    const since = updatedSince ? `&updated_at_min=${encodeURIComponent(updatedSince)}` : '';
    const data  = await this.fetchWithRetry<{ checkouts: ShopifyAbandonedCart[] }>(
      `/checkouts.json?limit=250${since}`
    );
    return data.checkouts;
  }

  async getProducts(updatedSince?: string): Promise<ShopifyProduct[]> {
    const since = updatedSince ? `&updated_at_min=${encodeURIComponent(updatedSince)}` : '';
    const data  = await this.fetchWithRetry<{ products: ShopifyProduct[] }>(
      `/products.json?limit=250&status=active&fields=id,title,product_type,tags,status,vendor,variants,images,created_at,updated_at${since}`
    );
    return data.products;
  }

  async syncAll(updatedSince?: string): Promise<ShopifySyncResult> {
    const [customers, orders, abandonedCarts] = await Promise.all([
      this.getCustomers(updatedSince),
      this.getOrders(updatedSince),
      this.getAbandonedCarts(updatedSince),
    ]);
    return { customers, orders, abandonedCarts };
  }

  async createDiscountCode(code: string, percentage: number): Promise<{ id: number }> {
    // 1. Create a Price Rule
    const priceRulePayload = {
      price_rule: {
        title: code,
        target_type: "line_item",
        target_selection: "all",
        allocation_method: "across",
        value_type: "percentage",
        value: `-${percentage}`,
        customer_selection: "all",
        starts_at: new Date().toISOString()
      }
    };

    const priceRuleData = await this.fetchWithRetry<{ price_rule: { id: number } }>(
      '/price_rules.json',
      'POST',
      priceRulePayload
    );

    // 2. Create the Discount Code attached to the Price Rule
    const discountCodePayload = {
      discount_code: { code }
    };

    await this.fetchWithRetry(
      `/price_rules/${priceRuleData.price_rule.id}/discount_codes.json`,
      'POST',
      discountCodePayload
    );

    return { id: priceRuleData.price_rule.id };
  }
}
