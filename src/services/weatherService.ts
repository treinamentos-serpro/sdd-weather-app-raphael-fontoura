import type { City, WeatherData } from '../lib/types';
import { mapWeatherResponse } from '../lib/weatherMapper';

export type WeatherServiceErrorKind = 'network' | 'api' | 'timeout' | 'invalid-response';

const errorMessages: Record<WeatherServiceErrorKind, string> = {
  network: 'Não foi possível conectar ao serviço de previsão.',
  api: 'O serviço de previsão está indisponível no momento.',
  timeout: 'A consulta do tempo demorou mais que o esperado.',
  'invalid-response': 'O serviço retornou dados de previsão inválidos.',
};

export class WeatherServiceError extends Error {
  readonly kind: WeatherServiceErrorKind;

  constructor(kind: WeatherServiceErrorKind) {
    super(errorMessages[kind]);
    this.name = 'WeatherServiceError';
    this.kind = kind;
  }
}

function hasWeatherValues(data: WeatherData): boolean {
  if (data.current && Object.keys(data.current).some((key) => key !== 'observedAt')) {
    return true;
  }
  return data.forecast.some((day) => Object.keys(day).some((key) => key !== 'date'));
}

function createAbortError(): DOMException {
  return new DOMException('Consulta cancelada.', 'AbortError');
}

export function getWeather(city: City, signal?: AbortSignal): Promise<WeatherData | undefined> {
  if (signal?.aborted) return Promise.reject(createAbortError());

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    timezone: 'auto',
    forecast_days: '5',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    current:
      'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure,precipitation',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max',
  }).toString();

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onExternalAbort);
    };

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };

    const onExternalAbort = () => {
      controller.abort();
      finish(() => reject(createAbortError()));
    };

    const timeoutId = setTimeout(() => {
      controller.abort();
      finish(() => reject(new WeatherServiceError('timeout')));
    }, 10_000);

    signal?.addEventListener('abort', onExternalAbort, { once: true });
    if (signal?.aborted) {
      onExternalAbort();
      return;
    }

    void Promise.resolve()
      .then(() => {
        if (settled) return undefined;
        return fetch(url, { signal: controller.signal });
      })
      .then(async (response) => {
        if (!response || settled) return;
        if (!response.ok) throw new WeatherServiceError('api');

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new WeatherServiceError('invalid-response');
        }

        let data: WeatherData;
        try {
          data = mapWeatherResponse(payload, city, new Date().toISOString());
        } catch {
          throw new WeatherServiceError('invalid-response');
        }

        finish(() => resolve(hasWeatherValues(data) ? data : undefined));
      })
      .catch((error: unknown) => {
        if (settled) return;
        if (error instanceof WeatherServiceError) {
          finish(() => reject(error));
          return;
        }
        finish(() => reject(new WeatherServiceError('network')));
      });
  });
}
