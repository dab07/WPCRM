import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../supabase/supabase';
import { sendWhatsAppMessage } from '../../../../lib/services/external/WhatsAppService';

/**
 * POST /api/shopify/cart-reminder
 * Human-approved WhatsApp cart reminder.
 * Body: { cartId: string, email: string, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { cartId, email, message } = await request.json();

    if (!cartId || !email || !message) {
      return NextResponse.json(
        { error: 'cartId, email, and message are required' },
        { status: 400 }
      );
    }

    // Fetch the cart to validate it still exists and is not recovered
    const { data: cart, error: fetchError } = await supabaseAdmin
      .from('abandoned_carts')
      .select('id, email, recovered, reminded_at, checkout_url')
      .eq('id', cartId)
      .single();

    if (fetchError || !cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    if (cart.recovered) {
      return NextResponse.json({ error: 'Cart already recovered' }, { status: 409 });
    }

    // Look up the contact's WhatsApp phone number
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('phone_number, accepts_marketing')
      .eq('email', email)
      .maybeSingle();

    if (!contact?.phone_number) {
      return NextResponse.json(
        { error: 'No WhatsApp number found for this contact' },
        { status: 422 }
      );
    }

    if (contact.accepts_marketing === false) {
      return NextResponse.json(
        { error: 'Contact has opted out of marketing' },
        { status: 422 }
      );
    }

    // Send the WhatsApp message
    await sendWhatsAppMessage({ to: contact.phone_number, message });

    // Stamp reminded_at so the n8n scheduler won't double-send
    await supabaseAdmin
      .from('abandoned_carts')
      .update({ reminded_at: new Date().toISOString() })
      .eq('id', cartId);

    return NextResponse.json({ success: true, sent_to: contact.phone_number });
  } catch (error) {
    console.error('[Cart Reminder API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
