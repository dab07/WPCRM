import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../../lib/services/external/WhatsAppService';
import { supabaseAdmin } from '../../../../supabase/supabase';

const OWNER_PHONE = process.env.OWNER_WHATSAPP_NUMBER || '+1234567890'; // Add this to your .env

/**
 * POST - Handle meeting scheduling requests
 */
export async function POST(request: NextRequest) {
  try {
    const { customerPhone, customerName, meetingType, preferredTime, message } = await request.json();

    // Save scheduling request to database
    const { data: schedulingRequest, error } = await supabaseAdmin
      .from('scheduling_requests')
      .insert({
        customer_phone: customerPhone,
        customer_name: customerName,
        meeting_type: meetingType,
        preferred_time: preferredTime,
        message: message,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving scheduling request:', error);
      return NextResponse.json({ error: 'Failed to save request' }, { status: 500 });
    }

    // Send notification to owner
    const ownerMessage = `🗓️ *New Meeting Request*

Customer: ${customerName}
Phone: ${customerPhone}
Type: ${meetingType}
Preferred Time: ${preferredTime}

Message: ${message}

Request ID: ${schedulingRequest.id}

Reply with:
• APPROVE ${schedulingRequest.id} - to approve
• DECLINE ${schedulingRequest.id} - to decline`;

    await sendWhatsAppMessage({
      to: OWNER_PHONE,
      message: ownerMessage
    });

    // Send confirmation to customer
    const customerMessage = `✅ *Meeting Request Received*

Thank you ${customerName}! 

Your ${meetingType} request has been submitted. Our team will review it and get back to you within 24 hours.

Request Details:
• Type: ${meetingType}
• Preferred Time: ${preferredTime}

We'll contact you soon to confirm the details!

🌐 zavops.com`;

    await sendWhatsAppMessage({
      to: customerPhone,
      message: customerMessage
    });

    return NextResponse.json({ 
      success: true, 
      requestId: schedulingRequest.id,
      message: 'Meeting request submitted successfully' 
    });

  } catch (error) {
    console.error('Error handling meeting request:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}