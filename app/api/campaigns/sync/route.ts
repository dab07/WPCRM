import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../supabase/supabase';
import { OpenWeatherService } from '../../../../lib/services/external/OpenWeatherService';
import { ShopifyService } from '../../../../lib/services/external/ShopifyService';
import { runWeatherScan } from '../../../../lib/scanners/micromoment';

export async function POST() {
  const brandId = 'Zavops';

  try {
    const shopify = new ShopifyService();
    const customers = await shopify.getCustomers();

    // 1. Count cities
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

    // 2. Get top 5 cities
    const topLocations = Array.from(cityCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const openWeather = new OpenWeatherService();
    const cityNames: string[] = [];

    // 3. Sync to customer_data
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

    // 4. Sync to weather_configs (so daily scanner monitors them)
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

    // 5. Force a weather scan to populate weather_readings immediately
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
