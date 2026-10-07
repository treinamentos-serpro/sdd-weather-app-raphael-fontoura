export type Unit = 'celsius' | 'fahrenheit';

export interface City {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string;
  region?: string;
  timezone?: string;
}

export interface CurrentWeather {
  observedAt?: string;
  temperatureC?: number;
  conditionCode?: number;
  humidityPercent?: number;
  windKmh?: number;
  pressureHpa?: number;
  precipitationMm?: number;
}

export interface ForecastDay {
  date: string;
  minimumC?: number;
  maximumC?: number;
  conditionCode?: number;
  precipitationMm?: number;
  windKmh?: number;
}

export interface WeatherData {
  city: City;
  timezone: string;
  current?: CurrentWeather;
  forecast: ForecastDay[];
  fetchedAt: string;
}

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty'; reason: 'no-supported-city' | 'no-weather-data' }
  | { status: 'error'; kind: 'network' | 'api' | 'timeout' | 'invalid-response'; message: string };
