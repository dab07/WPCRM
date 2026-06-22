import { NextRequest, NextResponse } from 'next/server';
import { generateIntelligentCampaign, IntelligentCampaignParams } from '@/lib/services/external/GeminiService';
import { ShopifyService } from '@/lib/services/external/ShopifyService';
import { getOmnisendService } from '@/lib/services/external/OmnisendService';

export async function POST(request: NextRequest) {
  try {
    const shopifyService = new ShopifyService();
    let omnisendService;
    try {
      omnisendService = await getOmnisendService();
    } catch (e) {
      console.warn("Omnisend service not available, using mock data for Omnisend.");
    }

    // Fetch Shopify data safely so missing scopes don't break the whole feature
    const [products, customers, orders, abandonedCarts] = await Promise.all([
      shopifyService.getProducts().catch(e => { console.warn('Failed to fetch products:', e.message); return []; }),
      shopifyService.getCustomers().catch(e => { console.warn('Failed to fetch customers:', e.message); return []; }),
      shopifyService.getOrders().catch(e => { console.warn('Failed to fetch orders:', e.message); return []; }),
      shopifyService.getAbandonedCarts().catch(e => { console.warn('Failed to fetch abandoned carts:', e.message); return []; })
    ]);

    // Fetch Omnisend data if available
    let omnisendCampaigns = [];
    let omnisendContacts = [];
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
        productSales[item.product_id].count += item.quantity;
      });
    });
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(p => ({ title: p.title, price: p.price }));

    // Customer lifecycle counts (Simplified logic for demonstration)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const prePurchaseCount = abandonedCarts.length;
    const firstPurchaseCount = orders.filter(o => new Date(o.created_at) > thirtyDaysAgo).length;
    const repeatActiveCount = Math.floor(customers.length * 0.3); // Mocking based on customers
    const atRiskCount = Math.floor(customers.length * 0.1);
    const dormantCount = Math.floor(customers.length * 0.2);

    // Build the payload
    const params: IntelligentCampaignParams = {
      brand: {
        name: "WPCRM Demo Brand",
        category: "E-Commerce",
        avg_repurchase_days: 45,
        max_discount_pct: 20,
        voice: "Friendly, premium, urgent",
        suppression_days: 7
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
        recent_campaigns: omnisendCampaigns.slice(0, 3).map(c => ({
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
        upcoming_events: "Summer Sale starts in 10 days",
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
