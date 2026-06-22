import { NextResponse } from 'next/server';
import { ShopifyService } from '../../../../lib/services/external/ShopifyService';

export async function GET() {
  try {
    const shopify  = new ShopifyService();
    const orders = await shopify.getOrders();

    return NextResponse.json({ success: true, orders, count: orders.length });
  } catch (error) {
    console.error('[Orders API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
