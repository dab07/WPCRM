import { config } from '@/lib/config/environment';

export class OpenWeatherService {
  private getApiKey(): string {
    const apiKey = config.openweathermap.apiKey;
    if (!apiKey) {
      throw new Error(`OPENWEATHER_API_KEY is missing in environment`);
    }
    return apiKey;
  }

  async getCurrentWeather(brandId: string, city: string) {
    const apiKey = this.getApiKey();
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeather API error: ${res.statusText}`);
    return res.json();
  }

  async getForecast(brandId: string, city: string) {
    const apiKey = this.getApiKey();
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeather API error: ${res.statusText}`);
    return res.json();
  }
}
