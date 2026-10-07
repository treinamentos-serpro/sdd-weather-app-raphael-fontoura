import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFreshness, getLocalDates } from '../../src/lib/weatherDate';
import { mockCities } from '../../src/services/mockCityService';
import { getMockWeather } from '../../src/services/mockWeatherService';

const timezones = [
  'America/Sao_Paulo',
  'America/Sao_Paulo',
  'America/Sao_Paulo',
  'America/Sao_Paulo',
  'America/Sao_Paulo',
  'America/Sao_Paulo',
  'America/Bahia',
  'America/Recife',
  'America/Manaus',
  'America/Fortaleza',
  'America/Sao_Paulo',
  'America/Fortaleza',
  'America/Sao_Paulo',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Australia/Sydney',
  'America/Toronto',
  'Asia/Shanghai',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Jakarta',
  'Europe/Rome',
  'Asia/Tokyo',
  'America/Mexico_City',
  'Europe/Moscow',
  'Asia/Riyadh',
  'Africa/Johannesburg',
  'Asia/Seoul',
  'Europe/Istanbul',
  'Europe/London',
  'America/New_York',
];

describe('getMockWeather', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T02:00:00Z'));
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('Rede proibida');
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(
    mockCities.map((city, index) => [city, timezones[index]] as const),
  )('gera cinco datas locais e campos atuais para $name no fuso correto', async (city, timezone) => {
    const promise = getMockWeather(city);
    await vi.advanceTimersByTimeAsync(450);
    const data = await promise;
    expect(data?.timezone).toBe(timezone);
    expect(data?.city).toEqual(city);
    expect(data?.forecast.map((day) => day.date)).toEqual(getLocalDates(timezone, new Date()));
    expect(data?.forecast).toHaveLength(5);
    expect(data?.current).toEqual({
      observedAt: new Date().toISOString(),
      temperatureC: expect.any(Number),
      conditionCode: expect.any(Number),
      humidityPercent: expect.any(Number),
      windKmh: expect.any(Number),
      pressureHpa: expect.any(Number),
      precipitationMm: expect.any(Number),
    });
    expect(
      getFreshness(data?.current?.observedAt, data?.timezone ?? '', data?.fetchedAt ?? ''),
    ).toBe('fresh');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('aguarda 450ms e gera instantes e datas novos em cada consulta', async () => {
    const city = mockCities[8];
    let settled = false;
    const first = getMockWeather(city).then((data) => {
      settled = true;
      return data;
    });
    await vi.advanceTimersByTimeAsync(449);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const old = await first;
    expect(old?.forecast[0]?.date).toBe('2026-10-07');
    vi.setSystemTime(new Date('2026-10-09T05:00:00Z'));
    const second = getMockWeather(city);
    await vi.advanceTimersByTimeAsync(450);
    const next = await second;
    expect(next?.forecast[0]?.date).toBe('2026-10-09');
    expect(next?.fetchedAt).not.toBe(old?.fetchedAt);
  });

  it('varia temperaturas plausiveis por cidade', async () => {
    const promises = mockCities.map((city) => getMockWeather(city));
    await vi.advanceTimersByTimeAsync(450);
    const data = await Promise.all(promises);
    const temperatures = data.map((item) => item?.current?.temperatureC);
    expect(new Set(temperatures).size).toBeGreaterThan(10);
    for (const temperature of temperatures) {
      expect(temperature).toBeGreaterThanOrEqual(-10);
      expect(temperature).toBeLessThanOrEqual(45);
    }
  });

  it('respeita timezone explicito e nao usa timezone do dispositivo', async () => {
    const promise = getMockWeather({ ...mockCities[0], timezone: 'Asia/Tokyo' });
    await vi.advanceTimersByTimeAsync(450);
    expect((await promise)?.forecast[0]?.date).toBe('2026-10-08');
    expect((await promise)?.timezone).toBe('Asia/Tokyo');
  });

  it.each([
    undefined,
    'Fuso/Invalido',
  ])('retorna indisponivel sem fuso valido: %s', async (timezone) => {
    const promise = getMockWeather({ name: 'Desconhecida', latitude: 0, longitude: 0, timezone });
    await vi.advanceTimersByTimeAsync(450);
    expect(await promise).toBeUndefined();
  });

  it('rejeita sinal previamente abortado sem timer', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(getMockWeather(mockCities[0], controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborta latencia pendente e remove timer', async () => {
    const controller = new AbortController();
    const promise = getMockWeather(mockCities[0], controller.signal);
    const rejected = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});
