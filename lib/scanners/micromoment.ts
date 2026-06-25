import { supabaseAdmin } from '../../supabase/supabase';
import { OpenWeatherService } from '../services/external/OpenWeatherService';
import { enqueueScan } from '../workers/queue';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

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
        const weatherData = await openWeather.getCurrentWeather(bId, city);
        
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
          // Deduplication check (wrapped in try-catch to bypass if Redis is offline)
          const dedupKey = `${bId}:${city}:${threshold.type}`;
          let isTriggered = false;
          try {
            isTriggered = (await redis.get(dedupKey)) ? true : false;
          } catch (redisErr) {
            console.warn(`Redis deduplication bypassed for ${dedupKey} (Redis may be offline).`);
          }
          if (isTriggered) continue; // Skip if already triggered in the last 14 days

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
              // Set deduplication lock (14 days = 14 * 24 * 60 * 60 seconds)
              try {
                await redis.set(dedupKey, '1', 'EX', 14 * 24 * 60 * 60);
              } catch (redisErr) {
                console.warn(`Failed to set Redis lock for ${dedupKey}.`);
              }

              // 4. Enqueue Job for Generation Layer
              try {
                await enqueueScan('generate-brief', { opportunityId: opp.id });
              } catch (qErr) {
                console.warn('Failed to enqueue generation job. BullMQ may be offline.');
              }
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
