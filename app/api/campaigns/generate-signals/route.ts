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

      if (temp >= 28) { // Summer threshold
        triggered = true;
        reason = `High temperature detected in ${loc.location} (${temp}°C)`;
        name = `Summer Drop - ${loc.location}`;
        message = `Beat the heat in ${loc.location}! ☀️ Our new summer collection is perfectly breathable for this ${temp}°C weather. Shop now:`;
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
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 2);
        suggestions.push({
          signal_type: 'weather',
          title: name,
          description: reason,
          urgency,
          suggested_name: name,
          suggested_festival: 'Seasonal Weather',
          suggested_message: message,
          suggested_scheduled_at: scheduledAt.toISOString(),
          metadata: {},
        });
      }
    }
  } catch (error) {
    console.error('[scanWeather] Error:', error);
  }
  return suggestions;
}

async function scanRepurchase(): Promise<CampaignSuggestion[]> {
  const shopify = new ShopifyService();
  const suggestions: CampaignSuggestion[] = [];
  try {
    const orders = await shopify.getOrders();
    const byCustomer = new Map<string, { dates: Date[] }>();
    for (const o of orders) {
      if (!o.email) continue;
      if (!byCustomer.has(o.email)) byCustomer.set(o.email, { dates: [] });
      byCustomer.get(o.email)!.dates.push(new Date(o.created_at));
    }

    let overdueCount = 0;
    let avgWindow = 45;

    for (const { dates } of byCustomer.values()) {
      if (dates.length < 2) continue;
      dates.sort((a, b) => a.getTime() - b.getTime());
      const gaps: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((dates[i]!.getTime() - dates[i - 1]!.getTime()) / (1000 * 60 * 60 * 24));
      }
      const customerAvg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      const lastOrder = dates[dates.length - 1];
      if (!lastOrder) continue;
      const daysSinceLast = (Date.now() - lastOrder.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLast >= customerAvg * 0.85) {
        overdueCount++;
        avgWindow = Math.round(customerAvg);
      }
    }

    if (overdueCount >= 10) {
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 1);
      suggestions.push({
        signal_type: 'repurchase',
        title: 'Restock Reminder',
        description: `${overdueCount} customers are nearing their ${avgWindow}-day repurchase window.`,
        urgency: 'medium',
        suggested_name: 'Restock Reminder',
        suggested_festival: 'Lifecycle',
        suggested_message: "Running low? 🔄 It's been a while since your last order. Reorder your favorites in 2 clicks and get 5% off: [Link]",
        suggested_scheduled_at: scheduledAt.toISOString(),
        metadata: {},
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

      suggestions.push({
        signal_type: 'inventory',
        title: 'Overstock Clearance',
        description: `${clearanceItems.length} items are highly overstocked (e.g. ${topItems[0]!.productTitle})`,
        urgency,
        suggested_name: 'Clearance Sale',
        suggested_festival: 'Clearance',
        suggested_message: `🎉 MASSIVE CLEARANCE! We have too much stock of our favorite items. Grab them now with a special 20% discount before it's gone: [Link]`,
        suggested_scheduled_at: scheduledAt.toISOString(),
        metadata: { is_clearance: true }, // Used to trigger Shopify discount creation later
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

    if (!events) return [];

    for (const event of events) {
      const scheduledAt = new Date(event.event_date);
      scheduledAt.setDate(scheduledAt.getDate() - 3); // Pre-empt by 3 days

      suggestions.push({
        signal_type: 'local_event',
        title: `${event.event_name} Special`,
        description: `Upcoming event: ${event.event_name} on ${event.event_date} in ${event.target_region}`,
        urgency: 'low',
        suggested_name: `${event.event_name} Special`,
        suggested_festival: event.event_name,
        suggested_message: `Getting ready for ${event.event_name}? 🎉 Celebrate with our exclusive collection. Order now to get it in time!`,
        suggested_scheduled_at: scheduledAt.toISOString(),
        metadata: {},
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

    if (pastCampaigns) {
      for (const campaign of pastCampaigns) {
        suggestions.push({
          signal_type: 'history' as any, // casting to bypass strict type for now, will update type later
          title: campaign.name,
          description: `Previously created campaign sent on ${new Date(campaign.scheduled_at).toLocaleDateString()}`,
          urgency: 'low',
          suggested_name: `Rerun: ${campaign.name}`,
          suggested_festival: campaign.festival || 'General',
          suggested_message: campaign.message_template || '',
          suggested_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          metadata: { past_campaign_id: campaign.id },
        });
      }
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
