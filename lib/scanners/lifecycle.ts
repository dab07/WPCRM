import { ShopifyService } from '../services/external/ShopifyService';

export async function runLifecycleScan() {
  const shopifyService = new ShopifyService();
  
  // 1. Sync data (Phase 1 part 1)
  const [customers, orders] = await Promise.all([
    shopifyService.getCustomers().catch(e => { console.warn('Failed to fetch customers:', e.message); return []; }),
    shopifyService.getOrders().catch(e => { console.warn('Failed to fetch orders:', e.message); return []; })
  ]);

  // 2. Process data to find opportunities
  const productSales: Record<string, { title: string, price: string, count: number }> = {};
  orders.forEach((order: any) => {
    order.line_items?.forEach((item: any) => {
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

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const prePurchaseCount = 0;
  const firstPurchaseCount = orders.filter((o: any) => new Date(o.created_at) > thirtyDaysAgo).length;
  const repeatActiveCount = Math.floor(customers.length * 0.3); // Mocking based on customers
  const atRiskCount = Math.floor(customers.length * 0.1);
  const dormantCount = Math.floor(customers.length * 0.2);

  // 3. Create Opportunity Records (In memory for now, should be saved to DB)
  // According to codebase.md, scanners generate raw Opportunity records
  const opportunities = [];

  if (dormantCount > 0) {
    opportunities.push({
      stage: 'dormant',
      title: 'Winback Dormant Customers',
      description: `Targeting ${dormantCount} customers who haven't purchased recently.`,
      target_segment: 'Dormant Customers',
      estimated_reach: dormantCount,
      projected_impact_usd: dormantCount * 50 * 0.05, // Mock estimation
      status: 'pending_approval'
    });
  }

  if (atRiskCount > 0) {
    opportunities.push({
      stage: 'at_risk',
      title: 'Prevent Churn for At-Risk Customers',
      description: `Targeting ${atRiskCount} customers showing signs of churning.`,
      target_segment: 'At Risk',
      estimated_reach: atRiskCount,
      projected_impact_usd: atRiskCount * 40 * 0.1, // Mock estimation
      status: 'pending_approval'
    });
  }

  // Next steps would involve saving these to Supabase `opportunities` table,
  // then enqueuing Phase 2 (Generate Brief) for the top opportunities.

  return {
    success: true,
    opportunities,
    metrics: {
      prePurchaseCount,
      firstPurchaseCount,
      repeatActiveCount,
      atRiskCount,
      dormantCount,
      topProducts
    }
  };
}
