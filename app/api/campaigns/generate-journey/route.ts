import { NextResponse } from 'next/server';
import { generateCustomerJourneyStrategy, IntelligentCampaignParams } from '@/lib/services/external/GeminiService';
import { ShopifyService } from '@/lib/services/external/ShopifyService';
import { getOmnisendService } from '@/lib/services/external/OmnisendService';
import { OpportunityEngine } from '@/lib/services/intelligence/OpportunityEngine';

export async function POST() {
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
        birthday_this_week: Math.floor(customers.length * 0.02)
      },
      abandoned: {
        top_product_1: topProducts[0]?.title || "Premium Widget",
        top_product_2: topProducts[1]?.title || "Signature Bundle"
      },
      at_risk: {
        top_last_product: topProducts[2]?.title || "Essential Kit"
      },
      omnisend: {
        subscriber_count: 0,
        recent_campaigns: []
      },
      context: {
        weather_cities: [],
        upcoming_events: "",
        local_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        today_date: new Date().toLocaleDateString('en-US'),
        day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' })
      }
    };

    const strategy = await generateCustomerJourneyStrategy(params);

    if (!strategy.success) {
      return NextResponse.json({ error: strategy.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: strategy.data
    });

  } catch (error) {
    console.error('[Generate Journey Strategy API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate journey strategy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
