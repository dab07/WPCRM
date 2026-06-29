import { supabaseAdmin } from '../../supabase/supabase';
import { OpenWeatherService } from '../services/external/OpenWeatherService';

export async function runWeatherScan(brandId?: string) {
  const openWeather = new OpenWeatherService();
  
  // 1. Fetch configurations for the brand(s)
  let query = supabaseAdmin.from('weather_configs').select('*');
  if (brandId) {
    query = query.eq('brand_id', brandId);
  }
  const { data: configs, error } = await query;
  if (error || !configs) {
    console.error('Failed to fetch weather configs', error);
    return { success: false, error };
  }

  const opportunitiesCreated = [];

  for (const config of configs) {
    const bId = config.brand_id;
    const cities = config.cities as string[] || [];
    const thresholds = config.thresholds as any[] || [];

    for (const city of cities) {
      try {
        // 2. Fetch current weather
        const coords = await openWeather.getCoordinates(city);
        if (!coords) throw new Error('Could not get coordinates for city');
        const weatherData = await openWeather.getCurrentWeather(bId, coords.lat, coords.lon);
        
        // Save to weather_readings
        const todayDate = new Date().toISOString().split('T')[0];
        
        await supabaseAdmin.from('weather_readings').upsert({
          brand_id: bId,
          city: city,
          date: todayDate,
          temp_max: weatherData.main.temp_max,
          temp_min: weatherData.main.temp_min,
          condition: weatherData.weather[0]?.main
        }, { onConflict: 'brand_id,city,date' });

        // 3. Evaluate thresholds
        for (const threshold of thresholds) {
          // Deduplication check: look for an existing opportunity created within the last 14 days
          // for the same brand, city, and threshold type (replaces the former Redis lock).
          const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
          const { data: existingOpps } = await supabaseAdmin
            .from('opportunities')
            .select('id')
            .eq('brand_id', bId)
            .eq('signal_source', 'weather_monitoring')
            .ilike('title', `%${threshold.type}%${city}%`)
            .gte('created_at', fourteenDaysAgo)
            .limit(1);

          if (existingOpps && existingOpps.length > 0) {
            // Already triggered within the last 14 days — skip
            continue;
          }

          // Check condition (e.g. max temp >= target for N consecutive days)
          // Fetch last N days readings
          const daysRequired = threshold.consecutive_days || 1;
          const { data: readings } = await supabaseAdmin.from('weather_readings')
            .select('*')
            .eq('brand_id', bId)
            .eq('city', city)
            .order('date', { ascending: false })
            .limit(daysRequired);

          if (!readings || readings.length < daysRequired) continue;

          // Check if all N days meet the threshold condition
          let conditionMet = true;
          for (const reading of readings) {
            if (threshold.type === 'summer_onset' && reading.temp_max < threshold.temp) {
              conditionMet = false;
              break;
            }
            if (threshold.type === 'winter_onset' && reading.temp_min > threshold.temp) {
              conditionMet = false;
              break;
            }
          }

          if (conditionMet) {
            // Create Opportunity
            const { data: opp, error: oppErr } = await supabaseAdmin.from('opportunities').insert({
              brand_id: bId,
              stage: 'awareness',
              title: `Seasonal Onset: ${threshold.type} in ${city}`,
              description: `Weather threshold for ${threshold.type} met in ${city}.`,
              target_segment: `${city} Residents`,
              estimated_reach: 5000, // mock
              priority: 'high',
              reasoning: `${daysRequired} consecutive days meeting ${threshold.temp}°C.`,
              signal_source: 'weather_monitoring',
              status: 'pending_approval'
            }).select().single();

            if (!oppErr && opp) {
              opportunitiesCreated.push(opp);
            }
          }
        }

      } catch (err) {
        console.error(`Error processing weather for city ${city} (brand ${bId}):`, err);
      }
    }
  }

  return { success: true, opportunitiesCreated };
}
