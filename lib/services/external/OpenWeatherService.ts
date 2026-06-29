import { config } from '@/lib/config/environment';

export class OpenWeatherService {
  private getApiKey(): string {
    const apiKey = config.openweathermap.apiKey;
    if (!apiKey) {
      throw new Error(`OPENWEATHER_API_KEY is missing in environment`);
    }
    return apiKey;
  }

  async getCoordinates(city: string, countryCode?: string) {
    const apiKey = this.getApiKey();
    let query = encodeURIComponent(city);
    if (countryCode) query += `,${countryCode}`;
    
    const url = `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=1&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeather Geo API error: ${res.statusText}`);
    
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return { lat: data[0].lat, lon: data[0].lon };
  }

  async getCurrentWeather(_brandId: string, lat: number, lon: number) {
    const apiKey = this.getApiKey();
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeather API error: ${res.statusText}`);
    return res.json();
  }

  async getForecast(_brandId: string, city: string) {
    const apiKey = this.getApiKey();
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeather API error: ${res.statusText}`);
    return res.json();
  }
}
