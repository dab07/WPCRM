import { NextResponse } from 'next/server';
import { OpportunityEngine } from '@/lib/services/intelligence/OpportunityEngine';
import { Opportunity } from '@/lib/services/intelligence/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const opportunity: Opportunity = body.opportunity;

    if (!opportunity || !opportunity.id) {
      return NextResponse.json({ error: 'Missing opportunity data' }, { status: 400 });
    }

    const engine = new OpportunityEngine();
    const updatedOpportunity = await engine.generateCampaignForOpportunity(opportunity);

    return NextResponse.json({
      success: true,
      opportunity: updatedOpportunity
    });
  } catch (error: any) {
    console.error('Opportunity campaign generation failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
