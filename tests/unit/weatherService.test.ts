import { afterEach, describe, expect, it, vi } from 'vitest';
import type { City } from '../../src/lib/types';
import { getWeather } from '../../src/services/weatherService';

const city: City = {
  name: 'Recife',
  latitude: -8.05,
  longitude: -34.9,
};

function createResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

function stubFetch(implementation: typeof fetch): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('getWeather', () => {
  it('envia coordenadas, unidades e todos os campos current e daily exigidos', async () => {
    const fetchMock = stubFetch(async () => createResponse({ timezone: 'America/Recife' }));

    await getWeather(city);

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.origin + requestUrl.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(requestUrl.searchParams.get('latitude')).toBe('-8.05');
    expect(requestUrl.searchParams.get('longitude')).toBe('-34.9');
    expect(requestUrl.searchParams.get('timezone')).toBe('auto');
    expect(requestUrl.searchParams.get('forecast_days')).toBe('5');
    expect(requestUrl.searchParams.get('temperature_unit')).toBe('celsius');
    expect(requestUrl.searchParams.get('wind_speed_unit')).toBe('kmh');
    expect(requestUrl.searchParams.get('precipitation_unit')).toBe('mm');
    expect(requestUrl.searchParams.get('current')?.split(',')).toEqual([
      'temperature_2m',
      'relative_humidity_2m',
      'weather_code',
      'wind_speed_10m',
      'surface_pressure',
      'precipitation',
    ]);
    expect(requestUrl.searchParams.get('daily')?.split(',')).toEqual([
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'precipitation_sum',
      'wind_speed_10m_max',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('mapeia e preserva dados parciais sem preencher campos ausentes', async () => {
    stubFetch(async () =>
      createResponse({
        timezone: 'America/Recife',
        current: { temperature_2m: 23.4 },
        daily: {
          time: ['2026-10-07'],
          precipitation_sum: [0],
          wind_speed_10m_max: [null],
        },
      }),
    );

    const result = await getWeather(city);

    expect(result?.city).toEqual(city);
    expect(result?.timezone).toBe('America/Recife');
    expect(result?.current).toEqual({ temperatureC: 23.4 });
    expect(result?.forecast).toEqual([{ date: '2026-10-07', precipitationMm: 0 }]);
    expect(result?.fetchedAt).toEqual(expect.any(String));
  });

  it('retorna undefined quando a resposta valida nao contem dados meteorologicos', async () => {
    stubFetch(async () => createResponse({ timezone: 'America/Recife', daily: { time: [] } }));

    await expect(getWeather(city)).resolves.toBeUndefined();
  });

  it('classifica erros HTTP como api', async () => {
    stubFetch(async () => createResponse({}, 503));

    await expect(getWeather(city)).rejects.toMatchObject({
      name: 'WeatherServiceError',
      kind: 'api',
      message: expect.any(String),
    });
  });

  it('classifica falhas de rede e nao repete a consulta', async () => {
    const fetchMock = stubFetch(async () => {
      throw new TypeError('detalhe interno');
    });

    await expect(getWeather(city)).rejects.toMatchObject({
      kind: 'network',
      message: 'Não foi possível conectar ao serviço de previsão.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'JSON invalido',
      async () => ({ ...createResponse({}), json: vi.fn().mockRejectedValue(new SyntaxError()) }),
    ],
    ['estrutura invalida', async () => createResponse({ current: {} })],
  ])('classifica %s como invalid-response', async (_label, responseFactory) => {
    stubFetch(responseFactory);

    await expect(getWeather(city)).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('aborta em 10 segundos e classifica timeout separadamente', async () => {
    vi.useFakeTimers();
    stubFetch(() => new Promise<Response>(() => {}));
    const promise = getWeather(city);
    const rejection = expect(promise).rejects.toMatchObject({ kind: 'timeout' });

    await vi.advanceTimersByTimeAsync(10_000);
    await rejection;
  });

  it('preserva cancelamento externo como AbortError', async () => {
    const controller = new AbortController();
    stubFetch(() => new Promise<Response>(() => {}));
    const promise = getWeather(city, controller.signal);
    const rejection = expect(promise).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();
    await rejection;
  });
});
