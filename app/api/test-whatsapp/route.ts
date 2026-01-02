import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    // Test WhatsApp Business API call
    const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { 
          body: message 
        }
      })
    });

    const whatsappData = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(whatsappData)}`);
    }

    return NextResponse.json({
      success: true,
      whatsappResponse: whatsappData,
      messageId: whatsappData.messages?.[0]?.id
    });

  } catch (error: any) {
    console.error('[Test WhatsApp] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}