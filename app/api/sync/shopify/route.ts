// POST /api/sync/shopify
// Called by n8n every 4 hours to pull incremental Shopify updates for all active brands.
// Secured with CRON_SECRET_TOKEN — no user session required.
//
// Body (optional): { brand_id?: string }
//   - If brand_id is provided, syncs only that brand.
//   - If omitted, syncs all active brands sequentially.
//
// What it syncs per brand:
//   - contacts  (customers updated since last sync)
//   - orders    (orders updated since last sync)
//   - abandoned_carts (checkouts updated since last sync)
//   - top_selling_products → written back to brands.top_selling_products
//
// The last sync timestamp is read from brands.data_synced_at and written back after success.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../supabase/supabase';
import { ShopifyService } from '../../../../lib/services/external/ShopifyService';

const CRON_SECRET = process.env.CRON_SECRET_TOKEN ?? '';

// ─── Auth guard ──────────────────────────────────────────────────────────────
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  return CRON_SECRET.length > 0 && token === CRON_SECRET;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let targetBrandId: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    targetBrandId = body?.brand_id;
  } catch {
    // body is optional
  }

  // Fetch brands to sync
  let brandsQuery = supabaseAdmin
    .from('brands')
    .select('id, name, domain, data_synced_at')
    .eq('active', true);

  if (targetBrandId) {
    brandsQuery = brandsQuery.eq('id', targetBrandId);
  }

  const { data: brands, error: brandsError } = await brandsQuery;

  if (brandsError) {
    console.error('[ShopifySync] Failed to fetch brands:', brandsError);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }

  if (!brands || brands.length === 0) {
    return NextResponse.json({ success: true, message: 'No active brands to sync', synced: [] });
  }

  const results = [];

  for (const brand of brands) {
    const syncResult = await syncBrand(brand);
    results.push(syncResult);
  }

  const totalErrors = results.flatMap(r => r.errors);
  console.log(`[ShopifySync] Completed. Brands: ${results.length}, Errors: ${totalErrors.length}`);

  return NextResponse.json({
    success: true,
    synced_at: new Date().toISOString(),
    brands_synced: results.length,
    results,
  });
}

// ─── Per-brand sync ───────────────────────────────────────────────────────────
async function syncBrand(brand: {
  id: string;
  name: string;
  domain: string | null;
  data_synced_at: string | null;
}) {
  const errors: string[] = [];
  const syncedAt = new Date().toISOString();

  // Use data_synced_at as the incremental cursor — only fetch records updated since last run.
  // On first run (null) we fetch everything.
  const updatedSince = brand.data_synced_at ?? undefined;

  console.log(`[ShopifySync] Syncing brand "${brand.name}" (${brand.id}), since: ${updatedSince ?? 'beginning'}`);

  // ShopifyService uses env-level credentials (single-tenant for now).
  // For multi-tenant, pass per-brand domain + access token here.
  const shopify = new ShopifyService();

  let customersUpserted = 0;
  let ordersUpserted = 0;
  let abandonedCartsUpserted = 0;
  let productsUpdated = 0;

  // ── Customers → contacts ──────────────────────────────────────────────────
  try {
    const customers = await shopify.getCustomers(updatedSince);

    if (customers.length > 0) {
      const rows = customers.map(c => ({
        brand_id:            brand.id,
        external_id:         String(c.id),
        source:              'shopify',
        email:               c.email,
        first_name:          c.first_name,
        last_name:           c.last_name,
        name:                [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || String(c.id),
        phone_number:        c.phone ?? `unknown-shopify-${c.id}`,
        tags:                c.tags ? c.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        orders_count:        c.orders_count,
        total_spent:         parseFloat(c.total_spent),
        accepts_marketing:   c.accepts_marketing,
        metadata:            { default_address: c.default_address },
        external_created_at: c.created_at,
        external_updated_at: c.updated_at,
      }));

      const { error } = await supabaseAdmin
        .from('contacts')
        .upsert(rows, { onConflict: 'brand_id,external_id,source' });

      if (error) errors.push(`Customers upsert: ${error.message}`);
      else customersUpserted = rows.length;
    }
  } catch (err) {
    errors.push(`Customers fetch: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  try {
    const orders = await shopify.getOrders(updatedSince);

    if (orders.length > 0) {
      const rows = orders.map(o => ({
        brand_id:             brand.id,
        external_id:          String(o.id),
        source:               'shopify',
        customer_external_id: o.customer?.id ? String(o.customer.id) : null,
        order_number:         o.order_number,
        email:                o.email,
        total_price:          parseFloat(o.total_price),
        subtotal_price:       parseFloat(o.subtotal_price),
        financial_status:     o.financial_status,
        fulfillment_status:   o.fulfillment_status,
        line_items:           o.line_items,
        external_created_at:  o.created_at,
        external_updated_at:  o.updated_at,
      }));

      const { error } = await supabaseAdmin
        .from('orders')
        .upsert(rows, { onConflict: 'brand_id,external_id,source' });

      if (error) errors.push(`Orders upsert: ${error.message}`);
      else ordersUpserted = rows.length;
    }
  } catch (err) {
    errors.push(`Orders fetch: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Abandoned carts ───────────────────────────────────────────────────────
  try {
    const carts = await shopify.getAbandonedCarts(updatedSince);

    if (carts.length > 0) {
      const rows = carts.map(c => ({
        brand_id:             brand.id,
        external_id:          String(c.id),
        token:                c.token,
        email:                c.email,
        customer_external_id: c.customer ? String(c.customer.id) : null,
        total_price:          parseFloat(c.total_price),
        line_items:           c.line_items,
        checkout_url:         c.abandoned_checkout_url,
        external_created_at:  c.created_at,
        external_updated_at:  c.updated_at,
      }));

      const { error } = await supabaseAdmin
        .from('abandoned_carts')
        .upsert(rows, { onConflict: 'brand_id,external_id' });

      if (error) errors.push(`Abandoned carts upsert: ${error.message}`);
      else abandonedCartsUpserted = rows.length;
    }
  } catch (err) {
    errors.push(`Abandoned carts fetch: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Products → brands.top_selling_products ────────────────────────────────
  // Always fetch full product list (no incremental filter) to keep top_selling_products fresh.
  try {
    const products = await shopify.getProducts();

    if (products.length > 0) {
      // Store top 10 as {title, product_type} for use in AI prompts
      const topProducts = products.slice(0, 10).map(p => ({
        title:        p.title,
        product_type: p.product_type,
      }));

      const { error } = await supabaseAdmin
        .from('brands')
        .update({ top_selling_products: topProducts })
        .eq('id', brand.id);

      if (error) errors.push(`Products update: ${error.message}`);
      else productsUpdated = products.length;
    }
  } catch (err) {
    errors.push(`Products fetch: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Stamp data_synced_at ──────────────────────────────────────────────────
  if (errors.length === 0) {
    await supabaseAdmin
      .from('brands')
      .update({ data_synced_at: syncedAt })
      .eq('id', brand.id);
  }

  return {
    brand_id:              brand.id,
    brand_name:            brand.name,
    customers_upserted:    customersUpserted,
    orders_upserted:       ordersUpserted,
    abandoned_carts_upserted: abandonedCartsUpserted,
    products_updated:      productsUpdated,
    synced_at:             syncedAt,
    errors,
  };
}
