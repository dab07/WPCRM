import { Opportunity } from './types';
import { WeatherScanner } from '../signals/WeatherScanner';
import { LocalEventScanner } from '../signals/LocalEventScanner';
import { SignalScanner } from '../signals/types';
import { IntelligenceOrchestrator } from './IntelligenceOrchestrator';

export class OpportunityEngine {
  private scanners: SignalScanner[];
  private orchestrator: IntelligenceOrchestrator;

  constructor() {
    this.scanners = [
      new WeatherScanner(),
      new LocalEventScanner()
      // Add other family scanners here
    ];
    this.orchestrator = new IntelligenceOrchestrator();
  }

  /**
   * Run the daily scan across all active signal scanners.
   * Emits Opportunity rows and queues them for brief generation.
   */
  async runDailyScan(clientId: string): Promise<Opportunity[]> {
    console.log(`Starting daily opportunity scan for client: ${clientId}`);
    
    const allOpportunities: Opportunity[] = [];

    // Run all scanners
    for (const scanner of this.scanners) {
      try {
        const opportunities = await scanner.scan(clientId);
        allOpportunities.push(...opportunities);
      } catch (error) {
        console.error(`Error running scanner:`, error);
      }
    }

    // Rank opportunities cross-family by projected_impact_usd
    allOpportunities.sort((a, b) => {
      const impactA = a.projected_impact_usd || 0;
      const impactB = b.projected_impact_usd || 0;
      return impactB - impactA;
    });

    console.log(`Scan completed. Found ${allOpportunities.length} opportunities.`);

    // Note: In a full system, we would insert these into the database here
    // e.g. await supabase.from('opportunities').insert(allOpportunities)

    return allOpportunities;
  }

  /**
   * Handles user clicking 'Generate Intelligent Campaign' on an Opportunity
   */
  async generateCampaignForOpportunity(opportunity: Opportunity): Promise<Opportunity> {
    console.log(`Generating campaign for opportunity: ${opportunity.title}`);
    
    try {
      // Create campaign assets using the Intelligence Orchestrator (which uses Gemini)
      // This is the equivalent of the PRD's Brief & Copy engines
      await this.orchestrator.createCampaignBrief(opportunity);
      
      console.log(`Successfully generated campaign brief and assets for opportunity ${opportunity.id}`);
      
      // Mark as content generated
      opportunity.status = 'content_generated';
      
      return opportunity;
    } catch (error) {
      console.error(`Failed to generate campaign for opportunity ${opportunity.id}:`, error);
      throw error;
    }
  }
}
