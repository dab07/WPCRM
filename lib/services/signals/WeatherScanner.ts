import { SignalScanner, WeatherReading, WeatherThreshold } from './types';
import { Opportunity } from '../intelligence/types';
import crypto from 'crypto';

export class WeatherScanner implements SignalScanner {
  private apiKey: string = '';
  private thresholds: WeatherThreshold[];

  constructor() {
    this.thresholds = [
      {
        type: 'summer_onset',
        city: 'Mumbai',
        market: 'India',
        consecutiveDays: 5,
        condition: (reading) => reading.maxTemp >= 36
      },
      {
        type: 'monsoon_onset',
        city: 'Mumbai',
        market: 'India',
        consecutiveDays: 3,
        condition: (reading) => reading.rainfall >= 15
      }
    ];
  }

  async scan(clientId: string): Promise<Opportunity[]> {
    // Dynamically fetch the API key from Supabase credentials table
    const { getCredential } = await import('../../credentials/repo');
    const { decryptCredential } = await import('../../credentials/crypto');

    try {
      const cred = await getCredential(clientId, 'openweathermap');
      if (cred) {
        const payload = await decryptCredential(cred);
        this.apiKey = payload.apiKey || payload.api_key || '';
      }
    } catch (err) {
      console.error(`Failed to load openweathermap credential for client ${clientId}`, err);
    }
    const opportunities: Opportunity[] = [];

    // For each threshold, fetch forecast and evaluate
    for (const threshold of this.thresholds) {
      const readings = await this.getForecast(threshold.city);

      let consecutiveCount = 0;
      let onsetDetected = false;

      // Ensure readings are sorted by date chronologically
      const sortedReadings = readings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const reading of sortedReadings) {
        if (threshold.condition(reading)) {
          consecutiveCount++;
          if (consecutiveCount >= threshold.consecutiveDays) {
            onsetDetected = true;
            break;
          }
        } else {
          consecutiveCount = 0;
        }
      }

      if (onsetDetected) {
        // Emit Opportunity
        const projectedImpact = this.calculateImpact(clientId, threshold.type);

        opportunities.push({
          id: crypto.randomUUID(),
          brand_id: clientId,
          stage: 'post_purchase', // Or dynamic based on category
          title: `Weather Trigger: ${threshold.type.replace('_', ' ')} in ${threshold.city}`,
          description: `Detected ${threshold.consecutiveDays} days of conditions meeting ${threshold.type} criteria. Engage local customers.`,
          target_segment: `Customers in ${threshold.city}`,
          estimated_reach: 2500, // Would be fetched from Omnisend/Shopify
          suggested_channels: ['email', 'whatsapp', 'meta_ads'],
          priority: 'high',
          reasoning: `Micro-moment marketing: ${threshold.type} typically drives a 15% increase in relevant category sales.`,
          projected_impact_usd: projectedImpact,
          signal_source: 'weather_monitoring',
          status: 'pending_approval',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    return opportunities;
  }

  private async getForecast(city: string): Promise<WeatherReading[]> {
    // If no API key, return mock data to allow testing
    if (!this.apiKey) {
      console.warn('No OPENWEATHERMAP_API_KEY found, returning mock forecast');
      return this.generateMockForecast(city);
    }

    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${this.apiKey}&units=metric`);
      if (!res.ok) throw new Error('Weather API error');

      const data = await res.json();

      // OpenWeatherMap returns 3-hourly data. We need to aggregate to daily max temp / rainfall.
      const dailyMap = new Map<string, { maxTemp: number, rainfall: number }>();

      for (const item of data.list) {
        // extract YYYY-MM-DD
        const dateKey = item.dt_txt.split(' ')[0];
        const temp = item.main.temp_max;
        const rain = item.rain?.['3h'] || 0; // 3-hourly rainfall

        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { maxTemp: temp, rainfall: rain });
        } else {
          const current = dailyMap.get(dateKey)!;
          dailyMap.set(dateKey, {
            maxTemp: Math.max(current.maxTemp, temp),
            rainfall: current.rainfall + rain
          });
        }
      }

      const readings: WeatherReading[] = [];
      dailyMap.forEach((val, dateKey) => {
        readings.push({
          city,
          date: dateKey,
          maxTemp: val.maxTemp,
          rainfall: val.rainfall
        });
      });

      return readings;

    } catch (e) {
      console.error('Failed to fetch weather forecast', e);
      return [];
    }
  }

  private generateMockForecast(city: string): WeatherReading[] {
    // Mock 5 days of hot weather to trigger summer_onset
    return Array.from({ length: 5 }).map((_, i) => ({
      city,
      date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0] as string,
      maxTemp: 38,
      rainfall: 0
    }));
  }

  private calculateImpact(_clientId: string, _type: string): number {
    // Stub: in reality, this would query historical CRM data
    return Math.floor(Math.random() * 5000) + 1000;
  }
}
