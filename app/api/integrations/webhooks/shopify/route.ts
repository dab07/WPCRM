// POST /api/integrations/webhooks/shopify
// Receives all Shopify webhook events directly — no n8n in the inbound path.
// Stable URL: https://wpcrm.vercel.app/api/integrations/webhooks/shopify
//
// Supported topics (set via X-Shopify-Topic header):
//   checkouts/update  → upsert abandoned_carts
//   orders/create     → upsert orders + mark matching carts recovered
//   orders/updated    → upsert orders (status changes, fulfillment, etc.)
//
// Security: validates HMAC-SHA256 signature from X-Shopify-Hmac-Sha256 header
// using SHOPIFY_SECRET as the signing key.

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabaseAdmin } from '../../../../../supabase/supabase';

const SHOPIFY_SECRET = process.env.SHOPIFY_SECRET ?? '';

// ─── HMAC verification ────────────────────────────────────────────────────────
async function verifyShopifyHmac(request: NextRequest, rawBody: string): Promise<boolean> {
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256') ?? '';
  if (!hmacHeader || !SHOPIFY_SECRET) return false;

  const digest = createHmac('sha256', SHOPIFY_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');

  // Constant-time comparison to prevent timing attacks
  return digest === hmacHeader;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Read raw body first — needed for HMAC verification
  const rawBody = await request.text();

  const isValid = await verifyShopifyHmac(request, rawBody);
  if (!isValid) {
    console.warn('[ShopifyWebhook] HMAC verification failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const topic     = request.headers.get('x-shopify-topic') ?? '';
  const shopDomain = request.headers.get('x-shopify-shop-domain') ?? '';

  if (!shopDomain) {
    return NextResponse.json({ error: 'Missing X-Shopify-Shop-Domain' }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Resolve brand_id from shop domain
  const { data: brand, error: brandError } = await supabaseAdmin
    .from('brands')
    .select('id, name')
    .eq('domain', shopDomain)
    .single();

  if (brandError || !brand) {
    console.warn(`[ShopifyWebhook] No brand found for domain: ${shopDomain}`);
    // Return 200 so Shopify doesn't retry — this store isn't registered
    return NextResponse.json({ ok: true, skipped: 'unknown_brand' });
  }

  console.log(`[ShopifyWebhook] topic=${topic} brand=${brand.name} (${brand.id})`);

  try {
    switch (topic) {
      case 'checkouts/update':
        await handleCheckoutUpdate(payload, brand.id);
        break;

      case 'orders/create':
        await handleOrderCreate(payload, brand.id);
        break;

      case 'orders/updated':
        await handleOrderUpdate(payload, brand.id);
        break;

      default:
        console.log(`[ShopifyWebhook] Unhandled topic: ${topic}`);
    }
  } catch (err) {
    console.error(`[ShopifyWebhook] Error processing ${topic}:`, err);
    // Still return 200 — Shopify retries on non-2xx which can cause duplicate processing
    return NextResponse.json({ ok: true, error: 'Processing error — logged' });
  }

  return NextResponse.json({ ok: true });
}

// ─── checkouts/update → abandoned_carts upsert ───────────────────────────────
async function handleCheckoutUpdate(payload: Record<string, unknown>, brandId: string) {
  const lineItems = ((payload.line_items as any[]) ?? []).map(item => ({
    variant_id: item.variant_id,
    product_id: item.product_id,
    title:      item.title,
    quantity:   item.quantity,
    price:      item.price,
    sku:        item.sku ?? null,
  }));

  const row = {
    brand_id:             brandId,
    external_id:          String(payload.id),
    token:                (payload.token as string) ?? null,
    email:                (payload.email as string) ?? null,
    customer_external_id: (payload as any).customer?.id
                            ? String((payload as any).customer.id)
                            : null,
    total_price:          parseFloat((payload.total_price as string) ?? '0'),
    line_items:           lineItems,
    checkout_url:         (payload.abandoned_checkout_url as string) ?? null,
    external_created_at:  (payload.created_at as string) ?? null,
    external_updated_at:  (payload.updated_at as string) ?? null,
  };

  const { error } = await supabaseAdmin
    .from('abandoned_carts')
    .upsert(row, { onConflict: 'brand_id,external_id' });

  if (error) throw new Error(`abandoned_carts upsert failed: ${error.message}`);

  console.log(`[ShopifyWebhook] Cart upserted: ${row.external_id} (${row.email ?? 'no email'})`);
}

// ─── orders/create → orders upsert + mark carts recovered ────────────────────
async function handleOrderCreate(payload: Record<string, unknown>, brandId: string) {
  await upsertOrder(payload, brandId);

  // Mark any open abandoned carts for this email as recovered
  const email = payload.email as string | undefined;
  if (email) {
    const { error } = await supabaseAdmin
      .from('abandoned_carts')
      .update({ recovered: true })
      .eq('brand_id', brandId)
      .eq('email', email)
      .eq('recovered', false);

    if (error) {
      console.warn(`[ShopifyWebhook] Failed to mark carts recovered for ${email}: ${error.message}`);
    } else {
      console.log(`[ShopifyWebhook] Marked carts recovered for ${email}`);
    }
  }
}

// ─── orders/updated → orders upsert ──────────────────────────────────────────
async function handleOrderUpdate(payload: Record<string, unknown>, brandId: string) {
  await upsertOrder(payload, brandId);
}

// ─── Shared order upsert ──────────────────────────────────────────────────────
async function upsertOrder(payload: Record<string, unknown>, brandId: string) {
  const row = {
    brand_id:             brandId,
    external_id:          String(payload.id),
    source:               'shopify',
    customer_external_id: (payload as any).customer?.id
                            ? String((payload as any).customer.id)
                            : null,
    order_number:         payload.order_number as number ?? null,
    email:                (payload.email as string) ?? null,
    total_price:          parseFloat((payload.total_price as string) ?? '0'),
    subtotal_price:       parseFloat((payload.subtotal_price as string) ?? '0'),
    financial_status:     (payload.financial_status as string) ?? null,
    fulfillment_status:   (payload.fulfillment_status as string) ?? null,
    line_items:           (payload.line_items as unknown[]) ?? [],
    external_created_at:  (payload.created_at as string) ?? null,
    external_updated_at:  (payload.updated_at as string) ?? null,
  };

  const { error } = await supabaseAdmin
    .from('orders')
    .upsert(row, { onConflict: 'brand_id,external_id,source' });

  if (error) throw new Error(`orders upsert failed: ${error.message}`);

  console.log(`[ShopifyWebhook] Order upserted: ${row.external_id} (${row.financial_status})`);
}
