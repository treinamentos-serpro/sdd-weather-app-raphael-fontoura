import { filterAndSortCities } from '../lib/cityCatalog';
import type { City } from '../lib/types';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REQUEST_TIMEOUT_MS = 10_000;

export type WeatherServiceErrorKind = 'network' | 'api' | 'timeout' | 'invalid-response';

const errorMessages: Record<WeatherServiceErrorKind, string> = {
  network:
    'Não foi possível conectar ao serviço de busca. Verifique sua conexão e tente novamente.',
  api: 'O serviço de busca está indisponível no momento. Tente novamente.',
  timeout: 'A busca demorou mais que o esperado. Tente novamente.',
  'invalid-response': 'O serviço de busca retornou uma resposta inválida. Tente novamente.',
};

export class WeatherServiceError extends Error {
  readonly kind: WeatherServiceErrorKind;

  constructor(kind: WeatherServiceErrorKind) {
    super(errorMessages[kind]);
    this.name = 'WeatherServiceError';
    this.kind = kind;
  }
}

interface GeocodingResult {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isGeocodingResult(value: unknown): value is GeocodingResult {
  if (!isRecord(value)) return false;
  return (
    (value.id === undefined || (typeof value.id === 'number' && Number.isFinite(value.id))) &&
    typeof value.name === 'string' &&
    typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude) &&
    isOptionalString(value.country) &&
    isOptionalString(value.country_code) &&
    isOptionalString(value.admin1) &&
    isOptionalString(value.timezone)
  );
}

function parseResults(payload: unknown): GeocodingResult[] {
  if (!isRecord(payload)) throw new WeatherServiceError('invalid-response');
  if (payload.results === undefined) return [];
  if (!Array.isArray(payload.results) || !payload.results.every(isGeocodingResult)) {
    throw new WeatherServiceError('invalid-response');
  }
  return payload.results;
}

function toCity(result: GeocodingResult): City {
  return {
    id: result.id,
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    country: result.country,
    countryCode: result.country_code,
    region: result.admin1,
    timezone: result.timezone,
  };
}

function createAbortError(): DOMException {
  return new DOMException('Busca cancelada', 'AbortError');
}

export function searchCities(name: string, signal?: AbortSignal): Promise<City[]> {
  if (signal?.aborted) return Promise.reject(createAbortError());

  const url = new URL(GEOCODING_URL);
  url.searchParams.set('name', name);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'pt');
  url.searchParams.set('format', 'json');

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
    }, REQUEST_TIMEOUT_MS);

    signal?.addEventListener('abort', onExternalAbort, { once: true });

    if (signal?.aborted) {
      onExternalAbort();
      return;
    }

    void Promise.resolve()
      .then(() => fetch(url, { signal: controller.signal }))
      .then(async (response) => {
        if (settled) return;
        if (!response.ok) throw new WeatherServiceError('api');

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new WeatherServiceError('invalid-response');
        }

        const cities = parseResults(payload).map(toCity);
        finish(() => resolve(filterAndSortCities(cities)));
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
