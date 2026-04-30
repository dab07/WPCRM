// [NEW: brand-sync] — added 2026-04-11
// Equivalent to Inngest: syncBrandData — runs daily 2 AM per brand
// Pulls all sources (Shopify, Klaviyo, Omnisend, Meta Ads), normalizes to Supabase tables,
// sets data_synced_at timestamp.

import { supabaseAdmin } from '../../../supabase/supabase';
import { ShopifyService } from '../external/ShopifyService';
import { KlaviyoService } from '../external/KlaviyoService';
import { OmnisendService } from '../external/OmnisendService';
import { MetaAdsService } from '../external/MetaAdsService';

export interface BrandSyncResult {
  brandId: string;
  customersUpserted: number;
  ordersUpserted: number;
  abandonedCartsUpserted: number;
  klaviyoListsSynced: number;
  omnisendContactsSynced: number;
  metaAudiencesSynced: number;
  dataSyncedAt: string;
  errors: string[];
}

export class BrandSyncError extends Error {
  constructor(
    message: string,
    public readonly brandId?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'BrandSyncError';
  }
}

export class BrandSyncOrchestrator {
  private supabase = supabaseAdmin;
  private shopify: ShopifyService;
  private klaviyo: KlaviyoService;
  private omnisend: OmnisendService;
  private metaAds: MetaAdsService;

  constructor() {
    this.shopify = new ShopifyService();
    this.klaviyo = new KlaviyoService();
    this.omnisend = new OmnisendService();
    this.metaAds = new MetaAdsService();
  }

  /**
   * Main entry point — syncs all brand data from all sources.
   * Called by the /api/sync/brand endpoint (triggered by cron at 2 AM).
   */
  async syncBrandData(brandId: string, updatedSince?: string): Promise<BrandSyncResult> {
    console.log(`[BrandSync] Starting sync for brand ${brandId}`);
    const errors: string[] = [];
    const result: BrandSyncResult = {
      brandId,
      customersUpserted: 0,
      ordersUpserted: 0,
      abandonedCartsUpserted: 0,
      klaviyoListsSynced: 0,
      omnisendContactsSynced: 0,
      metaAudiencesSynced: 0,
      dataSyncedAt: new Date().toISOString(),
      errors,
    };

    // --- Shopify sync ---
    try {
      const shopifyData = await this.shopify.syncAll(updatedSince);

      if (shopifyData.customers.length > 0) {
        const rows = shopifyData.customers.map(c => ({
          brand_id: brandId,
          external_id: String(c.id),
          source: 'shopify',
          email: c.email,
          first_name: c.first_name,
          last_name: c.last_name,
          // contacts.name = full name, fallback to email, fallback to external_id
          name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || String(c.id),
          phone_number: c.phone ?? `unknown-shopify-${c.id}`,
          tags: c.tags ? c.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
          orders_count: c.orders_count,
          total_spent: parseFloat(c.total_spent),
          accepts_marketing: c.accepts_marketing,
          metadata: { default_address: c.default_address },
          external_created_at: c.created_at,
          external_updated_at: c.updated_at,
        }));

        const { error } = await this.supabase
          .from('contacts')
          .upsert(rows, { onConflict: 'brand_id,external_id,source' });

        if (error) {
          errors.push(`Shopify customers upsert failed: ${error.message}`);
        } else {
          result.customersUpserted = rows.length;
        }
      }

      if (shopifyData.orders.length > 0) {
        const rows = shopifyData.orders.map(o => ({
          brand_id: brandId,
          external_id: String(o.id),
          source: 'shopify',
          customer_external_id: String(o.customer?.id),
          order_number: o.order_number,
          email: o.email,
          total_price: parseFloat(o.total_price),
          subtotal_price: parseFloat(o.subtotal_price),
          financial_status: o.financial_status,
          fulfillment_status: o.fulfillment_status,
          line_items: o.line_items,
          external_created_at: o.created_at,
          external_updated_at: o.updated_at,
        }));

        const { error } = await this.supabase
          .from('orders')
          .upsert(rows, { onConflict: 'brand_id,external_id,source' });

        if (error) {
          errors.push(`Shopify orders upsert failed: ${error.message}`);
        } else {
          result.ordersUpserted = rows.length;
        }
      }

      if (shopifyData.abandonedCarts.length > 0) {
        const rows = shopifyData.abandonedCarts.map(c => ({
          brand_id: brandId,
          external_id: String(c.id),
          token: c.token,
          email: c.email,
          customer_external_id: c.customer ? String(c.customer.id) : null,
          total_price: parseFloat(c.total_price),
          line_items: c.line_items,
          checkout_url: c.abandoned_checkout_url,
          external_created_at: c.created_at,
          external_updated_at: c.updated_at,
        }));

        const { error } = await this.supabase
          .from('abandoned_carts')
          .upsert(rows, { onConflict: 'brand_id,external_id' });

        if (error) {
          errors.push(`Shopify abandoned carts upsert failed: ${error.message}`);
        } else {
          result.abandonedCartsUpserted = rows.length;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown Shopify error';
      errors.push(`Shopify sync failed: ${msg}`);
      console.error('[BrandSync] Shopify error:', err);
    }

    // --- Klaviyo sync ---
    try {
      const klaviyoData = await this.klaviyo.syncAll();

      const { error } = await this.supabase
        .from('brand_sync_metadata')
        .upsert({
          brand_id: brandId,
          source: 'klaviyo',
          lists: klaviyoData.lists,
          flows: klaviyoData.flows,
          metrics: klaviyoData.metrics,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'brand_id,source' });

      if (error) {
        errors.push(`Klaviyo metadata upsert failed: ${error.message}`);
      } else {
        result.klaviyoListsSynced = klaviyoData.lists.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown Klaviyo error';
      errors.push(`Klaviyo sync failed: ${msg}`);
      console.error('[BrandSync] Klaviyo error:', err);
    }

    // --- Omnisend sync ---
    try {
      const omnisendData = await this.omnisend.syncAll();

      const { error } = await this.supabase
        .from('brand_sync_metadata')
        .upsert({
          brand_id: brandId,
          source: 'omnisend',
          contacts_count: omnisendData.contacts.length,
          campaigns_count: omnisendData.campaigns.length,
          metrics: omnisendData.metrics,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'brand_id,source' });

      if (error) {
        errors.push(`Omnisend metadata upsert failed: ${error.message}`);
      } else {
        result.omnisendContactsSynced = omnisendData.contacts.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown Omnisend error';
      errors.push(`Omnisend sync failed: ${msg}`);
      console.error('[BrandSync] Omnisend error:', err);
    }

    // --- Meta Ads sync ---
    try {
      const audiences = await this.metaAds.getCustomAudiences();

      const { error } = await this.supabase
        .from('brand_sync_metadata')
        .upsert({
          brand_id: brandId,
          source: 'meta_ads',
          audiences,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'brand_id,source' });

      if (error) {
        errors.push(`Meta Ads metadata upsert failed: ${error.message}`);
      } else {
        result.metaAudiencesSynced = audiences.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown Meta Ads error';
      errors.push(`Meta Ads sync failed: ${msg}`);
      console.error('[BrandSync] Meta Ads error:', err);
    }

    // --- Update data_synced_at on brand record ---
    try {
      await this.supabase
        .from('brands')
        .update({ data_synced_at: result.dataSyncedAt })
        .eq('id', brandId);
    } catch (err) {
      errors.push(`Failed to update brand data_synced_at: ${err instanceof Error ? err.message : 'Unknown'}`);
    }

    console.log(`[BrandSync] Completed for brand ${brandId}. Errors: ${errors.length}`);
    return result;
  }
}
