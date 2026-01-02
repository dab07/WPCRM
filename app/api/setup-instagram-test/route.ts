import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. Add Instagram account
    const { data: account, error: accountError } = await supabase
      .from('social_media_accounts')
      .insert({
        platform: 'instagram',
        account_id: 'your_instagram_account_id',
        account_username: 'your_username',
        access_token: process.env.INSTAGRAM_ACCESS_TOKEN,
        is_active: true
      })
      .select()
      .single();

    if (accountError) {
      console.error('Account error:', accountError);
      return NextResponse.json({ error: accountError.message }, { status: 400 });
    }

    // 2. Add broadcast rule
    const { data: rule, error: ruleError } = await supabase
      .from('instagram_broadcast_rules')
      .insert({
        name: 'Test Reel Notifications',
        account_id: account.id,
        post_type: 'reel',
        target_contact_tags: [], // All contacts
        hashtag_filters: ['#business', '#test'],
        message_template: 'Hey {name}! 🎬 Check out our latest reel: {reel_url}',
        ai_context_prompt: 'Generate an exciting 25-word message about this business reel',
        is_active: true
      })
      .select()
      .single();

    if (ruleError) {
      console.error('Rule error:', ruleError);
      return NextResponse.json({ error: ruleError.message }, { status: 400 });
    }

    // 3. Add test contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        phone_number: '+1234567890',
        name: 'Test User',
        tags: ['test', 'vip'],
        source: 'instagram_test'
      })
      .select()
      .single();

    if (contactError) {
      console.error('Contact error:', contactError);
      // Don't fail if contact already exists
    }

    return NextResponse.json({
      success: true,
      account: account,
      rule: rule,
      contact: contact,
      message: 'Instagram test setup completed!'
    });

  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}