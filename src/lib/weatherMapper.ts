import type { City, CurrentWeather, ForecastDay, WeatherData } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(0);
  date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

function numericField(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function numericAt(
  source: Record<string, unknown>,
  key: string,
  index: number,
): number | undefined {
  const values = source[key];
  if (!Array.isArray(values)) return undefined;
  const value: unknown = values[index];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function mapWeatherResponse(payload: unknown, city: City, fetchedAt: string): WeatherData {
  if (!isRecord(payload)) throw new TypeError('A resposta do clima deve ser um objeto.');
  if (typeof payload.timezone !== 'string') {
    throw new TypeError('A resposta do clima deve informar o timezone.');
  }

  let current: CurrentWeather | undefined;
  if (Object.hasOwn(payload, 'current')) {
    if (!isRecord(payload.current)) {
      throw new TypeError('O bloco current deve ser um objeto.');
    }
    const source = payload.current;
    current = {};
    if (typeof source.time === 'string') current.observedAt = source.time;
    const temperatureC = numericField(source, 'temperature_2m');
    if (temperatureC !== undefined) current.temperatureC = temperatureC;
    const conditionCode = numericField(source, 'weather_code');
    if (conditionCode !== undefined) current.conditionCode = conditionCode;
    const humidityPercent = numericField(source, 'relative_humidity_2m');
    if (humidityPercent !== undefined) current.humidityPercent = humidityPercent;
    const windKmh = numericField(source, 'wind_speed_10m');
    if (windKmh !== undefined) current.windKmh = windKmh;
    const pressureHpa = numericField(source, 'surface_pressure');
    if (pressureHpa !== undefined) current.pressureHpa = pressureHpa;
    const precipitationMm = numericField(source, 'precipitation');
    if (precipitationMm !== undefined) current.precipitationMm = precipitationMm;
  }

  const forecast: ForecastDay[] = [];
  if (Object.hasOwn(payload, 'daily')) {
    if (!isRecord(payload.daily)) {
      throw new TypeError('O bloco daily deve ser um objeto.');
    }
    const daily = payload.daily;
    if (Object.hasOwn(daily, 'time')) {
      if (!Array.isArray(daily.time) || !daily.time.every(isCalendarDate)) {
        throw new TypeError('daily.time deve conter datas validas no formato YYYY-MM-DD.');
      }
      for (const [index, date] of daily.time.entries()) {
        const day: ForecastDay = { date };
        const minimumC = numericAt(daily, 'temperature_2m_min', index);
        if (minimumC !== undefined) day.minimumC = minimumC;
        const maximumC = numericAt(daily, 'temperature_2m_max', index);
        if (maximumC !== undefined) day.maximumC = maximumC;
        const conditionCode = numericAt(daily, 'weather_code', index);
        if (conditionCode !== undefined) day.conditionCode = conditionCode;
        const precipitationMm = numericAt(daily, 'precipitation_sum', index);
        if (precipitationMm !== undefined) day.precipitationMm = precipitationMm;
        const windKmh = numericAt(daily, 'wind_speed_10m_max', index);
        if (windKmh !== undefined) day.windKmh = windKmh;
        forecast.push(day);
      }
    }
  }

  return {
    city,
    timezone: payload.timezone,
    ...(current === undefined ? {} : { current }),
    forecast,
    fetchedAt,
  };
}
