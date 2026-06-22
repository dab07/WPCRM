import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Verify Shopify HMAC signature (Security Requirement)
    // const hmac = request.headers.get('x-shopify-hmac-sha256');
    // TODO: Verify signature here

    const topic = request.headers.get('x-shopify-topic');
    const shop = request.headers.get('x-shopify-shop-domain');
    const body = await request.json();

    console.log(`Received Shopify webhook: ${topic} for shop: ${shop}`);

    switch (topic) {
      case 'orders/create':
        // Trigger repurchase window model refresh for the customer
        console.log('Handling orders/create webhook');
        // await handleOrderCreate(shop, body);
        break;

      case 'customers/update':
        // Trigger contact sync to segmentation layer
        console.log('Handling customers/update webhook');
        // await handleCustomerUpdate(shop, body);
        break;

      case 'inventory_levels/update':
        // Trigger inventory check for V1.1 gate
        console.log('Handling inventory_levels/update webhook');
        // await handleInventoryUpdate(shop, body);
        break;

      default:
        console.log(`Unhandled Shopify topic: ${topic}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Shopify webhook failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
