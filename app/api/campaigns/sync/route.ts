import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../supabase/supabase';
import { OpenWeatherService } from '../../../../lib/services/external/OpenWeatherService';
import { ShopifyService } from '../../../../lib/services/external/ShopifyService';
import { runWeatherScan } from '../../../../lib/scanners/micromoment';

export async function POST() {
  const brandId = 'Zavops';

  try {
    const shopify = new ShopifyService();
    const [customers, orders] = await Promise.all([
      shopify.getCustomers(),
      shopify.getOrders()
    ]);
    
    // 1. Map Orders to Customers to calculate total_orders and last_order_date
    const orderStats = new Map<string, { count: number; lastDate: Date }>();
    for (const o of orders) {
      if (!o.email) continue;
      const current = orderStats.get(o.email) || { count: 0, lastDate: new Date(0) };
      const orderDate = new Date(o.created_at);
      orderStats.set(o.email, {
        count: current.count + 1,
        lastDate: orderDate > current.lastDate ? orderDate : current.lastDate
      });
    }

    // Fetch existing customer tags from database to merge and prevent overwriting campaign segment tags
    const { data: existingCustomers } = await supabaseAdmin
      .from('customers')
      .select('email, tags');
    const existingTagsMap = new Map<string, string[]>();
    if (existingCustomers) {
      for (const ec of existingCustomers) {
        if (ec.email) existingTagsMap.set(ec.email, ec.tags || []);
      }
    }

    // 2. Sync to Unified Customers Table
    const customerRecords = customers.map(c => {
      const stats = orderStats.get(c.email) || { count: 0, lastDate: null };
      const shopifyTags = c.tags ? c.tags.split(',').map(t => t.trim()) : [];
      const localTags = existingTagsMap.get(c.email) || [];
      const mergedTags = Array.from(new Set([...localTags, ...shopifyTags]));

      return {
        brand_id: brandId,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
        email: c.email,
        phone: c.phone || null,
        location: c.default_address?.city || null,
        country_code: c.default_address?.country || null,
        tags: mergedTags,
        total_orders: stats.count,
        last_order_date: stats.lastDate ? stats.lastDate.toISOString() : null,
      };
    });

    if (customerRecords.length > 0) {
      // Upsert using email as unique key (assuming DB constraint exists)
      // Note: we might have duplicate emails if not constrained, but for MVP it's ok.
      await supabaseAdmin.from('customers').upsert(customerRecords, { onConflict: 'email' });
    }

    // 3. Count cities for legacy location table and weather configs
    const cityCounts = new Map<string, { city: string; countryCode: string; count: number }>();
    for (const c of customers) {
      const city = c.default_address?.city;
      const countryCode = c.default_address?.country;
      if (city && countryCode) {
        const key = `${city},${countryCode}`;
        const existing = cityCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          cityCounts.set(key, { city, countryCode, count: 1 });
        }
      }
    }

    // 4. Get top locations
    const topLocations = Array.from(cityCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const openWeather = new OpenWeatherService();
    const cityNames: string[] = [];

    for (const loc of topLocations) {
      cityNames.push(loc.city);
      const { data: existing } = await supabaseAdmin
        .from('customer_data')
        .select('*')
        .eq('brand_id', brandId)
        .eq('location', loc.city)
        .single();

      if (!existing) {
        const coords = await openWeather.getCoordinates(loc.city, loc.countryCode);
        if (coords) {
          await supabaseAdmin.from('customer_data').insert({
            brand_id: brandId,
            location: loc.city,
            country_code: loc.countryCode,
            lat: coords.lat,
            lon: coords.lon
          });
        }
      }
    }

    // 5. Sync to weather_configs (so daily scanner monitors them)
    if (cityNames.length > 0) {
      const { data: existingConfig } = await supabaseAdmin
        .from('weather_configs')
        .select('*')
        .eq('brand_id', brandId)
        .single();

      if (existingConfig) {
        await supabaseAdmin.from('weather_configs').update({
          cities: cityNames
        }).eq('id', existingConfig.id);
      } else {
        await supabaseAdmin.from('weather_configs').insert({
          brand_id: brandId,
          cities: cityNames,
          thresholds: [
            { type: "summer_onset", temp: 28, consecutive_days: 1 },
            { type: "winter_onset", temp: 10, consecutive_days: 1 }
          ]
        });
      }
    }

    // 6. Force a weather scan to populate weather_readings immediately
    await runWeatherScan(brandId);

    return NextResponse.json({
      success: true,
      message: 'Successfully synced customer data, weather configs, and weather readings.',
      synced_cities: cityNames
    });

  } catch (error) {
    console.error('[Sync API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
