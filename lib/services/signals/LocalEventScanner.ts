import { SignalScanner, LocalEvent } from './types';
import { Opportunity } from '../intelligence/types';
import crypto from 'crypto';

export class LocalEventScanner implements SignalScanner {
  private eventsCalendar: LocalEvent[];

  constructor() {
    // Stub: In reality this would query the local_event_calendar database table
    // or an external API like PredictHQ
    this.eventsCalendar = [
      {
        id: 'evt_1',
        name: 'Manchester Indie Music Festival',
        city: 'Manchester',
        date: new Date(Date.now() + 12 * 86400000).toISOString(), // 12 days from now
        type: 'music_festival'
      },
      {
        id: 'evt_2',
        name: 'Mumbai Tech Week',
        city: 'Mumbai',
        date: new Date(Date.now() + 8 * 86400000).toISOString(), // 8 days from now
        type: 'conference'
      }
    ];
  }

  async scan(clientId: string): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];
    const now = new Date();

    for (const event of this.eventsCalendar) {
      const eventDate = new Date(event.date);
      const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

      // Trigger window: 10-14 days lead time as per PRD
      if (daysUntil >= 10 && daysUntil <= 14) {
        // Score event affinity (stub)
        const affinityScore = this.getAffinityScore(clientId, event.type);

        if (affinityScore >= 0.5) {
          const projectedImpact = this.calculateImpact(clientId, event.type);

          opportunities.push({
            id: crypto.randomUUID(),
            brand_id: clientId,
            stage: 'pre_purchase',
            title: `Local Event: ${event.name} in ${event.city}`,
            description: `Event "${event.name}" is happening in ${daysUntil} days. Affinity score is high (${affinityScore}).`,
            target_segment: `Customers in ${event.city}`,
            estimated_reach: 1800,
            suggested_channels: ['email', 'whatsapp'],
            priority: 'medium',
            reasoning: `Local event alignment: ${event.type} matches brand category. Drives average 8% conversion uplift locally.`,
            projected_impact_usd: projectedImpact,
            signal_source: 'local_event_calendar',
            status: 'pending_approval',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    return opportunities;
  }

  private getAffinityScore(_clientId: string, _eventType: string): number {
    // Stub: look up event_type x product_category affinity matrix
    // For now, return a random score between 0.4 and 0.9
    return 0.4 + (Math.random() * 0.5);
  }

  private calculateImpact(_clientId: string, _eventType: string): number {
    // Stub
    return Math.floor(Math.random() * 3000) + 500;
  }
}
