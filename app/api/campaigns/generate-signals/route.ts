import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../supabase/supabase';
import { OpenWeatherService } from '../../../../lib/services/external/OpenWeatherService';
import { ShopifyService } from '../../../../lib/services/external/ShopifyService';
import { rewriteSignalMessages } from '../../../../lib/services/external/GeminiService';
import type { CampaignSuggestion } from '../../../../lib/types/campaign-suggestions';



async function scanWeather(brandId: string = 'Zavops'): Promise<CampaignSuggestion[]> {
  const openWeather = new OpenWeatherService();
  const suggestions: CampaignSuggestion[] = [];
  try {
    const { data: locations } = await supabaseAdmin
      .from('customer_data')
      .select('*')
      .eq('brand_id', brandId);

    if (!locations) return [];

    for (const loc of locations) {
      const w = await openWeather.getCurrentWeather(brandId, loc.lat, loc.lon);
      if (!w) continue;

      const temp = w.main.temp;
      const isRainy = w.weather[0]?.main.toLowerCase().includes('rain');

      let triggered = false;
      let reason = '';
      let name = '';
      let message = '';
      let urgency: 'low' | 'medium' | 'high' = 'low';

      if (temp >= 26) { // Summer threshold lowered for MY/SG
        triggered = true;
        reason = `High temperature detected in ${loc.location} (${temp}°C)`;
        name = `Summer Drop - ${loc.location}`;
        message = `Beat the heat in ${loc.location}! ☀️ Our new summer collection is perfectly breathable for this ${temp}°C weather. Shop now:`;
        urgency = 'high';
      } else if (w.main.humidity > 80 && temp >= 25) { // Tropical threshold
        triggered = true;
        reason = `High humidity/tropical weather in ${loc.location} (${w.main.humidity}%)`;
        name = `Tropical Essentials - ${loc.location}`;
        message = `It's incredibly humid in ${loc.location} today! 🌴 Stay fresh with our tropical-friendly fabrics. Use code FRESH10:`;
        urgency = 'high';
      } else if (temp <= 10) { // Winter threshold
        triggered = true;
        reason = `Low temperature detected in ${loc.location} (${temp}°C)`;
        name = `Winter Warmth - ${loc.location}`;
        message = `It's getting chilly in ${loc.location}! ❄️ Stay warm with our latest winter drop. Shop now:`;
        urgency = 'high';
      } else if (isRainy) {
        triggered = true;
        reason = `Rain detected in ${loc.location}`;
        name = `Rainy Day Special - ${loc.location}`;
        message = `Rainy day in ${loc.location}? 🌧️ Perfect time to cozy up and shop. Use code RAIN10 for 10% off today:`;
        urgency = 'medium';
      }

      if (triggered) {
        // Fetch matching customer emails for this location
        const { data: targetCustomers } = await supabaseAdmin
          .from('customers')
          .select('email')
          .ilike('location', `%${loc.location}%`);
        
        const targetEmails = targetCustomers ? targetCustomers.map(c => c.email) : [];

        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 2);
        const locationSlug = loc.location.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        suggestions.push({
          signal_type: 'weather',
          title: name,
          description: reason,
          urgency,
          suggested_name: name,
          suggested_festival: 'Seasonal Weather',
          suggested_message: message,
          suggested_scheduled_at: scheduledAt.toISOString(),
          suggested_tag: `weather_${locationSlug}`,
          metadata: { target_emails: targetEmails },
        });
      }
    }
  } catch (error) {
    console.error('[scanWeather] Error:', error);
  }
  return suggestions;
}

async function scanRepurchase(): Promise<CampaignSuggestion[]> {
  const suggestions: CampaignSuggestion[] = [];
  try {
    const { data: customers } = await supabaseAdmin
      .from('customers')
      .select('*')
      .not('last_order_date', 'is', null);

    if (!customers || customers.length === 0) return [];

    let overdueCount = 0;
    const avgWindow = 45; // Default average repurchase window
    const targetCustomers: string[] = [];

    for (const c of customers) {
      const lastOrder = new Date(c.last_order_date);
      const daysSinceLast = (Date.now() - lastOrder.getTime()) / (1000 * 60 * 60 * 24);
      
      // If they haven't ordered in avgWindow days, they are overdue
      if (daysSinceLast >= avgWindow) {
        overdueCount++;
        targetCustomers.push(c.email);
      }
    }

    if (overdueCount > 0) {
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 1);
      
      const segmentTag = `winback_${new Date().getFullYear()}_${new Date().getMonth() + 1}`;

      suggestions.push({
        signal_type: 'repurchase',
        title: 'Winback Campaign',
        description: `${overdueCount} customers haven't repurchased in over ${avgWindow} days. A segment tag '${segmentTag}' will be created.`,
        urgency: overdueCount >= 20 ? 'high' : 'medium',
        suggested_name: 'Restock Reminder',
        suggested_festival: 'Lifecycle',
        suggested_message: "Running low? 🔄 It's been a while since your last order. Reorder your favorites in 2 clicks and get 10% off with code WINBACK: [Link]",
        suggested_scheduled_at: scheduledAt.toISOString(),
        suggested_tag: segmentTag,
        metadata: { 
          segment_tag: segmentTag,
          target_emails: targetCustomers
        },
      });
    }
  } catch (error) {
    console.error('[scanRepurchase] Error:', error);
  }
  return suggestions;
}

async function scanInventory(): Promise<CampaignSuggestion[]> {
  const shopify = new ShopifyService();
  const suggestions: CampaignSuggestion[] = [];
  try {
    const products = await shopify.getProducts();
    const clearanceItems: { productTitle: string; stock: number }[] = [];

    for (const product of products) {
      for (const variant of product.variants) {
        // High stock items are considered "unsold" / overstocked and prime for clearance.
        if (variant.inventory_quantity >= 50) {
          clearanceItems.push({
            productTitle: `${product.title} - ${variant.title}`,
            stock: variant.inventory_quantity,
          });
        }
      }
    }

    if (clearanceItems.length > 0) {
      clearanceItems.sort((a, b) => b.stock - a.stock); // Sort by highest stock first
      const topItems = clearanceItems.slice(0, 5);
      const highestStock = topItems[0]?.stock ?? 0;
      const urgency: 'low' | 'medium' | 'high' = highestStock >= 100 ? 'high' : highestStock >= 75 ? 'medium' : 'low';
      
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 1);

      const productNames = topItems.map(i => i.productTitle).join(', ');

      // Fetch all customer emails for clearance
      const { data: targetCustomers } = await supabaseAdmin.from('customers').select('email');
      const targetEmails = targetCustomers ? targetCustomers.map(c => c.email) : [];

      suggestions.push({
        signal_type: 'inventory',
        title: 'Overstock Clearance',
        description: `${clearanceItems.length} items are highly overstocked. Clearing: ${productNames}`,
        urgency,
        suggested_name: 'Clearance Sale',
        suggested_festival: 'Clearance',
        suggested_message: `🎉 MASSIVE CLEARANCE! We have too much stock of our favorite items including ${topItems[0]!.productTitle}. Grab them now with a special 20% discount before they're gone: [Link]`,
        suggested_scheduled_at: scheduledAt.toISOString(),
        suggested_tag: `inventory_clearance_${new Date().getFullYear()}_${new Date().getMonth() + 1}`,
        metadata: { is_clearance: true, target_emails: targetEmails }, // Used to trigger Shopify discount creation later
      });
    }
  } catch (error) {
    console.error('[scanInventory] Error:', error);
  }
  return suggestions;
}

async function scanEvents(brandId: string = 'Zavops'): Promise<CampaignSuggestion[]> {
  const suggestions: CampaignSuggestion[] = [];
  try {
    // 1. Get our customer locations
    const { data: locations } = await supabaseAdmin
      .from('customer_data')
      .select('location')
      .eq('brand_id', brandId);
      
    if (!locations || locations.length === 0) return [];
    
    const locationNames = locations.map(l => l.location);

    const today = new Date();
    const next14Days = new Date();
    next14Days.setDate(today.getDate() + 14);

    // 2. Find events matching these locations
    const { data: events } = await supabaseAdmin
      .from('local_event_calendar')
      .select('*')
      .gte('event_date', today.toISOString().split('T')[0])
      .lte('event_date', next14Days.toISOString().split('T')[0])
      .in('target_region', locationNames);

    if (!events || events.length === 0) {
      // Fallback mock events for demonstration if DB is empty
      const in3Days = new Date();
      in3Days.setDate(today.getDate() + 3);
      
      const mockEvents = [
        { event_name: 'Singapore Food Festival', target_region: 'Singapore', event_date: in3Days.toISOString().split('T')[0] },
        { event_name: 'Malaysia Mega Sale', target_region: 'Kuala Lumpur', event_date: in3Days.toISOString().split('T')[0] }
      ];
      
      for (const event of mockEvents) {
        if (!locationNames.some(l => l.includes(event.target_region))) continue; // Only trigger if we have customers there
        const { data: targetCustomers } = await supabaseAdmin
          .from('customers')
          .select('email')
          .ilike('location', `%${event.target_region}%`);
        const targetEmails = targetCustomers ? targetCustomers.map(c => c.email) : [];

        const eventSlug = event.event_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const regionSlug = event.target_region.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        suggestions.push({
          signal_type: 'local_event',
          title: `${event.event_name} Special`,
          description: `Upcoming event: ${event.event_name} on ${event.event_date} in ${event.target_region}`,
          urgency: 'medium',
          suggested_name: `${event.event_name} Special`,
          suggested_festival: event.event_name,
          suggested_message: `Getting ready for ${event.event_name}? 🎉 Celebrate with our exclusive collection. Order now to get it in time!`,
          suggested_scheduled_at: today.toISOString(),
          suggested_tag: `event_${regionSlug}_${eventSlug}`,
          metadata: { target_emails: targetEmails },
        });
      }
      return suggestions;
    }

    for (const event of events) {
      const scheduledAt = new Date(event.event_date);
      scheduledAt.setDate(scheduledAt.getDate() - 3); // Pre-empt by 3 days
      
      const { data: targetCustomers } = await supabaseAdmin
        .from('customers')
        .select('email')
        .ilike('location', `%${event.target_region}%`);
      const targetEmails = targetCustomers ? targetCustomers.map(c => c.email) : [];

      const eventSlug = event.event_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      const regionSlug = event.target_region.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      suggestions.push({
        signal_type: 'local_event',
        title: `${event.event_name} Special`,
        description: `Upcoming event: ${event.event_name} on ${event.event_date} in ${event.target_region}`,
        urgency: 'low',
        suggested_name: `${event.event_name} Special`,
        suggested_festival: event.event_name,
        suggested_message: `Getting ready for ${event.event_name}? 🎉 Celebrate with our exclusive collection. Order now to get it in time!`,
        suggested_scheduled_at: scheduledAt.toISOString(),
        suggested_tag: `event_${regionSlug}_${eventSlug}`,
        metadata: { target_emails: targetEmails },
      });
    }
  } catch (error) {
    console.error('[scanEvents] Error:', error);
  }
  return suggestions;
}

async function scanHistory(brandId: string = 'Zavops'): Promise<CampaignSuggestion[]> {
  const suggestions: CampaignSuggestion[] = [];
  try {
    // Fetch last 5 generated campaigns from our DB
    const { data: pastCampaigns } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (pastCampaigns && pastCampaigns.length > 0) {
      for (const campaign of pastCampaigns) {
        suggestions.push({
          signal_type: 'history' as any,
          title: campaign.name,
          description: `Previously created campaign sent on ${new Date(campaign.scheduled_at).toLocaleDateString()}`,
          urgency: 'low',
          suggested_name: `Rerun: ${campaign.name}`,
          suggested_festival: campaign.festival || 'General',
          suggested_message: campaign.message_template || '',
          suggested_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          suggested_tag: `history_rerun_${campaign.id.substring(0, 8)}`,
          metadata: { past_campaign_id: campaign.id },
        });
      }
    } else {
      // Fallback mock history if DB is empty
      suggestions.push({
        signal_type: 'history' as any,
        title: 'Flash Sale (Q1)',
        description: `Previously created campaign sent on ${new Date(Date.now() - 30 * 86400000).toLocaleDateString()}`,
        urgency: 'low',
        suggested_name: `Rerun: Flash Sale (Q1)`,
        suggested_festival: 'General',
        suggested_message: 'Our Flash Sale was a hit! We are bringing it back for 24 hours only. 🚀',
        suggested_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        suggested_tag: 'history_rerun_flash_sale_q1',
        metadata: { past_campaign_id: 'mock-123' },
      });
    }
  } catch (error) {
    console.error('[scanHistory] Error:', error);
  }
  return suggestions;
}

export async function POST() {
  try {
    // 2. Scan all signals
    const [weatherSuggestions, repurchaseSuggestions, inventorySuggestions, eventSuggestions, historySuggestions] = await Promise.all([
      scanWeather(),
      scanRepurchase(),
      scanInventory(),
      scanEvents(),
      scanHistory()
    ]);

    const allSuggestions = [
      ...weatherSuggestions,
      ...repurchaseSuggestions,
      ...inventorySuggestions,
      ...eventSuggestions,
      ...historySuggestions
    ];

    // 3. Rewrite messages dynamically with Gemini
    const finalSuggestions = await rewriteSignalMessages(allSuggestions);

    return NextResponse.json({
      success: true,
      suggestions: finalSuggestions,
      scanned_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Generate Signals API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate campaign signals',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
