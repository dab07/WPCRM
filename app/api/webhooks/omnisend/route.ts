import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Verify Omnisend HMAC signature
    // TODO: Verify signature here

    const body = await request.json();
    const eventType = body.event; // Typically omnisend webhooks include event type in body

    console.log(`Received Omnisend webhook: ${eventType}`);

    switch (eventType) {
      case 'contact.unsubscribed':
        // Triggers WhatsApp opt-out in Zavops opt-in registry
        console.log('Handling contact.unsubscribed webhook');
        // await handleContactUnsubscribed(body);
        break;

      case 'campaign.sent':
        // Triggers performance tracking job
        console.log('Handling campaign.sent webhook');
        // await handleCampaignSent(body);
        break;

      default:
        console.log(`Unhandled Omnisend event: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Omnisend webhook failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
