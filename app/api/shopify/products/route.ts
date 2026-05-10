// GET /api/shopify/products
// Fetches live product data from the Shopify Admin REST API.
// The access token never leaves the server — the client only calls this Next.js route.
//
// Query params:
//   ?limit=50        — max products to return (default 50, max 250)
//   ?status=active   — active | draft | archived (default active)

import { NextRequest, NextResponse } from 'next/server';
import { ShopifyService } from '../../../../lib/services/external/ShopifyService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'active';

    const shopify  = new ShopifyService();
    const products = await shopify.getProducts();

    // Filter by status if needed (getProducts already filters active by default)
    const filtered = status === 'all'
      ? products
      : products.filter(p => p.status === status);

    return NextResponse.json({ success: true, products: filtered, count: filtered.length });
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
