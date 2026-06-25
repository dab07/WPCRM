import { NextResponse } from 'next/server';
import { generateIntelligentCampaign, IntelligentCampaignParams } from '@/lib/services/external/GeminiService';
import { ShopifyService } from '@/lib/services/external/ShopifyService';
import { getOmnisendService } from '@/lib/services/external/OmnisendService';
import { OpportunityEngine } from '@/lib/services/intelligence/OpportunityEngine';
import { supabaseAdmin } from '../../../../supabase/supabase';

export async function POST(request: Request) {
  try {
    const shopifyService = new ShopifyService();
    let omnisendService;
    try {
      omnisendService = await getOmnisendService();
    } catch (e) {
      console.warn("Omnisend service not available, using mock data for Omnisend.");
    }

    // Fetch Shopify data safely so missing scopes don't break the whole feature
    const [customers, orders] = await Promise.all([
      shopifyService.getCustomers().catch(e => { console.warn('Failed to fetch customers:', e.message); return []; }),
      shopifyService.getOrders().catch(e => { console.warn('Failed to fetch orders:', e.message); return []; })
    ]);

    // Fetch Omnisend data if available
    let omnisendCampaigns: any[] = [];
    let omnisendContacts: any[] = [];
    if (omnisendService) {
      omnisendContacts = await omnisendService.getContacts();
      omnisendCampaigns = await omnisendService.getCampaigns();
    }

    // Process top products based on orders
    const productSales: Record<string, { title: string, price: string, count: number }> = {};
    orders.forEach(order => {
      order.line_items.forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = { title: item.title, price: item.price, count: 0 };
        }
        productSales[item.product_id]!.count += item.quantity;
      });
    });
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(p => ({ title: p.title, price: p.price }));

    // Customer lifecycle counts (Simplified logic for demonstration)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const prePurchaseCount = 0;
    const firstPurchaseCount = orders.filter((o: any) => new Date(o.created_at) > thirtyDaysAgo).length;
    const repeatActiveCount = Math.floor(customers.length * 0.3); // Mocking based on customers
    const atRiskCount = Math.floor(customers.length * 0.1);
    const dormantCount = Math.floor(customers.length * 0.2);

    // Run Opportunity Engine to get real signals
    const engine = new OpportunityEngine();
    // Using a mock brand ID for demo purposes; in production this would be the actual user's brand_id
    const opportunities = await engine.runDailyScan("WPCRM_Demo_Brand_123");

    const upcomingEventsText = opportunities.length > 0
      ? opportunities.map(o => `- ${o.title}: ${o.description}`).join('\n')
      : "No specific weather or local events right now. Focus on lifecycle marketing (e.g., dormant recovery).";

    // Fetch the brand guidelines for "Zavops" (or the active brand's guidelines)
    let brandGuidelinesText = "";
    try {
      const { data: { session } } = await supabaseAdmin.auth.getSession();
      const token = session?.access_token;

      const { data: guidelines } = await supabaseAdmin
        .from('brand_guidelines')
        .select('content, file_url')
        .eq('label', 'Zavops')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (guidelines) {
        brandGuidelinesText += guidelines.content ? guidelines.content + "\n" : "";
        if (guidelines.file_url) {
          const fileRes = await fetch(guidelines.file_url);
          if (fileRes.ok) {
            const fileText = await fileRes.text();
            brandGuidelinesText += fileText ? `\n--- Document Content ---\n${fileText.slice(0, 10000)}` : "";
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch Zavops brand guidelines", e);
    }

    // Build the payload
    const params: IntelligentCampaignParams = {
      brand: {
        name: "WPCRM Demo Brand",
        category: "E-Commerce",
        avg_repurchase_days: 45,
        max_discount_pct: 20,
        voice: "Friendly, premium, urgent",
        suppression_days: 7,
        ...(brandGuidelinesText ? { brand_guidelines: brandGuidelinesText } : {})
      },
      products: {
        top: topProducts.length > 0 ? topProducts : [
          { title: "Premium Widget", price: "$49.99" },
          { title: "Signature Bundle", price: "$89.99" },
          { title: "Essential Kit", price: "$29.99" }
        ]
      },
      counts: {
        pre_purchase: prePurchaseCount,
        first_purchase: firstPurchaseCount,
        repeat_active: repeatActiveCount,
        at_risk: atRiskCount,
        dormant: dormantCount,
        birthday_this_week: Math.floor(customers.length * 0.02) // Approx 2%
      },
      abandoned: {
        top_product_1: topProducts[0]?.title || "Premium Widget",
        top_product_2: topProducts[1]?.title || "Signature Bundle"
      },
      at_risk: {
        top_last_product: topProducts[2]?.title || "Essential Kit"
      },
      omnisend: {
        subscriber_count: omnisendContacts.length || 1500,
        recent_campaigns: omnisendCampaigns.slice(0, 3).map((c: any) => ({
          name: c.name,
          type: c.type,
          date: c.createdAt,
          size: 500,
          open_rate: 22.5,
          click_rate: 3.2,
          revenue: "$1,250",
          offer: "No offer"
        }))
      },
      context: {
        weather_cities: [
          { name: "New York", customer_count: 350, weather: "Rain", temp: 15 },
          { name: "Los Angeles", customer_count: 280, weather: "Sunny", temp: 28 },
          { name: "Chicago", customer_count: 200, weather: "Cloudy", temp: 12 }
        ],
        upcoming_events: upcomingEventsText,
        local_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        today_date: new Date().toLocaleDateString('en-US'),
        day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' })
      }
    };

    const campaign = await generateIntelligentCampaign(params);

    if (!campaign.success) {
      return NextResponse.json({ error: campaign.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: campaign.data
    });

  } catch (error) {
    console.error('[Generate Intelligent Campaign API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate intelligent campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
