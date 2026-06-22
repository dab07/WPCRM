export interface SignalEvent {
  id: string;
  type: 'festival' | 'weather' | 'local_event' | 'repurchase' | 'inventory_clearance';
  market: string;
  client_id: string;
  triggered_at: string;
  relevance_score: number;
  metadata?: Record<string, any>;
}

export interface WeatherThreshold {
  type: 'summer_onset' | 'monsoon_onset' | 'haze_onset';
  city: string;
  market: string;
  consecutiveDays: number;
  condition: (reading: WeatherReading) => boolean;
}

export interface WeatherReading {
  city: string;
  date: string;
  maxTemp: number;
  rainfall: number;
  aqi?: number;
}

export interface LocalEvent {
  id: string;
  name: string;
  city: string;
  date: string;
  type: string;
}

export interface SignalScanner {
  scan(clientId: string): Promise<import('../intelligence/types').Opportunity[]>;
}
