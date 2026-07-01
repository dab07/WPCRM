import { NextRequest, NextResponse } from 'next/server';
import { getGallaboxService } from '../../../../lib/services/external/GallaboxService';

export async function POST(request: NextRequest) {
  try {
    const { targetTags } = await request.json();

    let gallabox;
    try {
      gallabox = await getGallaboxService();
    } catch (err) {
      console.warn('[estimate-contacts] Gallabox not configured:', err);
      return NextResponse.json({ count: 0, warning: 'Gallabox not configured' });
    }

    const result = await gallabox.getContacts(10000, 0);

    if (!result.success) {
      return NextResponse.json({ count: 0, error: result.error });
    }

    let contacts = result.contacts || [];

    if (targetTags && targetTags.length > 0) {
      contacts = contacts.filter(c => 
        c.tags && c.tags.some(tag => targetTags.includes(tag))
      );
    }

    return NextResponse.json({ count: contacts.length });
  } catch (error) {
    console.error('[estimate-contacts] error:', error);
    return NextResponse.json(
      { count: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}
