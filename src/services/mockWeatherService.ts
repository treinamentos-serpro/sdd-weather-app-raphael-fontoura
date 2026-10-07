import type { City, WeatherData } from '../lib/types';
import { getLocalDates } from '../lib/weatherDate';

const countryTimezones: Record<string, string> = {
  AR: 'America/Argentina/Buenos_Aires',
  AU: 'Australia/Sydney',
  CA: 'America/Toronto',
  CN: 'Asia/Shanghai',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  IN: 'Asia/Kolkata',
  ID: 'Asia/Jakarta',
  IT: 'Europe/Rome',
  JP: 'Asia/Tokyo',
  MX: 'America/Mexico_City',
  RU: 'Europe/Moscow',
  SA: 'Asia/Riyadh',
  ZA: 'Africa/Johannesburg',
  KR: 'Asia/Seoul',
  TR: 'Europe/Istanbul',
  GB: 'Europe/London',
  US: 'America/New_York',
};

function getTimezone(city: City): string | undefined {
  if (city.timezone) return city.timezone;
  if (city.countryCode !== 'BR') return countryTimezones[city.countryCode ?? ''];
  if (city.name === 'Manaus') return 'America/Manaus';
  if (city.name === 'Salvador') return 'America/Bahia';
  if (city.name === 'Recife') return 'America/Recife';
  if (
    city.name === 'Fortaleza' ||
    (city.name === 'Santa Maria' && city.region === 'Rio Grande do Norte')
  ) {
    return 'America/Fortaleza';
  }
  return 'America/Sao_Paulo';
}

function createWeather(city: City): WeatherData | undefined {
  const timezone = getTimezone(city);
  if (!timezone) return undefined;
  const now = new Date();
  const dates = getLocalDates(timezone, now);
  if (dates.length !== 5) return undefined;
  const fetchedAt = now.toISOString();
  const variation = Math.round(Math.abs(city.longitude)) % 7;
  const temperatureC = Math.round(31 - Math.abs(city.latitude) * 0.35 + variation * 0.5);
  return {
    city: { ...city },
    timezone,
    fetchedAt,
    current: {
      observedAt: fetchedAt,
      temperatureC,
      conditionCode: variation % 3,
      humidityPercent: 50 + variation * 5,
      windKmh: 8 + variation * 2,
      pressureHpa: 1008 + variation,
      precipitationMm: variation % 2 ? 0.8 : 0,
    },
    forecast: dates.map((date, index) => ({
      date,
      minimumC: temperatureC - 5 + (index % 3),
      maximumC: temperatureC + 3 + (index % 3),
      conditionCode: (variation + index) % 4,
      precipitationMm: (variation + index) % 2 ? 1.2 : 0,
      windKmh: 8 + variation + index,
    })),
  };
}

export function getMockWeather(city: City, signal?: AbortSignal): Promise<WeatherData | undefined> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Consulta cancelada', 'AbortError'));
  }
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(new DOMException('Consulta cancelada', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve(createWeather(city));
    }, 450);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
