import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../supabase/supabase';

// ── Auth helper: extract user from Bearer token ──────────────────────────────
async function getUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice(7) ?? '';
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get brand IDs the user belongs to
    const { data: userBrands, error: ubError } = await supabaseAdmin
      .from('user_brands')
      .select('brand_id')
      .eq('user_id', user.id);

    if (ubError) throw ubError;
    if (!userBrands || userBrands.length === 0) {
      return NextResponse.json({ success: true, guidelines: [] });
    }

    const brandIds = userBrands.map((ub) => ub.brand_id);

    const { data, error } = await supabaseAdmin
      .from('brand_guidelines')
      .select('id, label, content, file_url')
      .in('brand_id', brandIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, guidelines: data });
  } catch (error) {
    console.error('[API] GET /api/campaigns/guidelines error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { label, content, file_url } = await request.json();

    if (!label) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    // Get the current user's brand_id
    const { data: userBrands, error: userBrandsError } = await supabaseAdmin
      .from('user_brands')
      .select('brand_id')
      .eq('user_id', user.id)
      .limit(1);

    if (userBrandsError || !userBrands || userBrands.length === 0) {
      return NextResponse.json({ error: 'No active brand found for user' }, { status: 403 });
    }

    const brand_id = userBrands[0]?.brand_id;
    if (!brand_id) {
      return NextResponse.json({ error: 'No active brand found for user' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('brand_guidelines')
      .insert({
        brand_id,
        label,
        content: content || null,
        file_url: file_url || null,
      })
      .select('id, label, content, file_url')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, guideline: data });
  } catch (error) {
    console.error('[API] POST /api/campaigns/guidelines error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
