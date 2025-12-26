import { NextRequest, NextResponse } from 'next/server';
import { triggerInstagramBroadcast } from '../../../../lib/instagram-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook signature (recommended for production)
    // const signature = request.headers.get('x-hub-signature-256');
    // if (!verifyWebhookSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    // Process Instagram webhook data
    if (body.object === 'instagram' && body.entry) {
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'media' && change.value) {
              const mediaData = change.value;
              
              // Only process new posts/reels
              if (mediaData.media_type === 'VIDEO' || mediaData.media_type === 'IMAGE') {
                const result = await triggerInstagramBroadcast({
                  instagram_post_id: mediaData.id,
                  media_type: mediaData.media_type,
                  media_url: mediaData.media_url,
                  permalink: mediaData.permalink,
                  caption: mediaData.caption,
                  account_id: entry.id // Instagram account ID
                });

                console.log('[Instagram Webhook] Broadcast result:', result);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Instagram Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle Instagram webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify the webhook (use your own verify token)
  const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Instagram Webhook] Webhook verified');
    return new Response(challenge);
  } else {
    console.error('[Instagram Webhook] Verification failed');
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  }
}