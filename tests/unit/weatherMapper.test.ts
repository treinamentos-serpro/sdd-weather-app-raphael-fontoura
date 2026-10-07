import { describe, expect, it } from 'vitest';
import type { City } from '../../src/lib/types';
import { mapWeatherResponse } from '../../src/lib/weatherMapper';

const city: City = {
  name: 'Curitiba',
  latitude: -25.43,
  longitude: -49.27,
  timezone: 'America/Sao_Paulo',
};
const fetchedAt = '2026-10-07T15:00:00Z';

describe('mapWeatherResponse', () => {
  it('mapeia os campos atuais e diários preservando timezone e datas', () => {
    const result = mapWeatherResponse(
      {
        timezone: 'America/Sao_Paulo',
        current: {
          time: '2026-10-07T12:00',
          temperature_2m: 22.4,
          weather_code: 2,
          relative_humidity_2m: 58,
          wind_speed_10m: 12.6,
          surface_pressure: 1014.2,
          precipitation: 0,
        },
        daily: {
          time: ['2026-10-07', '2026-10-08'],
          temperature_2m_min: [15.1, 16],
          temperature_2m_max: [24.3, 25.2],
          weather_code: [2, 3],
          precipitation_sum: [0, 1.2],
          wind_speed_10m_max: [18, 20.5],
        },
      },
      city,
      fetchedAt,
    );

    expect(result).toEqual({
      city,
      timezone: 'America/Sao_Paulo',
      current: {
        observedAt: '2026-10-07T12:00',
        temperatureC: 22.4,
        conditionCode: 2,
        humidityPercent: 58,
        windKmh: 12.6,
        pressureHpa: 1014.2,
        precipitationMm: 0,
      },
      forecast: [
        {
          date: '2026-10-07',
          minimumC: 15.1,
          maximumC: 24.3,
          conditionCode: 2,
          precipitationMm: 0,
          windKmh: 18,
        },
        {
          date: '2026-10-08',
          minimumC: 16,
          maximumC: 25.2,
          conditionCode: 3,
          precipitationMm: 1.2,
          windKmh: 20.5,
        },
      ],
      fetchedAt,
    });
  });

  it('preserva respostas parciais sem inventar timezone, datas ou valores', () => {
    const result = mapWeatherResponse(
      {
        timezone: 'Pacific/Auckland',
        current: {
          temperature_2m: 0,
          relative_humidity_2m: null,
          wind_speed_10m: Number.NaN,
        },
        daily: {
          time: ['2026-10-07', '2026-10-08'],
          temperature_2m_min: [0],
          temperature_2m_max: [null, 18],
          weather_code: ['2', 3],
        },
      },
      city,
      fetchedAt,
    );

    expect(result).toEqual({
      city,
      timezone: 'Pacific/Auckland',
      current: { temperatureC: 0 },
      forecast: [
        { date: '2026-10-07', minimumC: 0 },
        { date: '2026-10-08', maximumC: 18, conditionCode: 3 },
      ],
      fetchedAt,
    });
  });

  it('aceita blocos ausentes e blocos vazios sem criar datas', () => {
    expect(mapWeatherResponse({ timezone: 'UTC' }, city, fetchedAt)).toEqual({
      city,
      timezone: 'UTC',
      forecast: [],
      fetchedAt,
    });
    expect(
      mapWeatherResponse({ timezone: 'UTC', current: {}, daily: {} }, city, fetchedAt),
    ).toEqual({
      city,
      timezone: 'UTC',
      current: {},
      forecast: [],
      fetchedAt,
    });
  });

  it.each([null, [], 'payload', 42])('rejeita raiz que nao seja objeto: %j', (payload) => {
    expect(() => mapWeatherResponse(payload, city, fetchedAt)).toThrow(TypeError);
  });

  it.each(['current', 'daily'] as const)('rejeita bloco %s que nao seja objeto', (block) => {
    expect(() => mapWeatherResponse({ timezone: 'UTC', [block]: null }, city, fetchedAt)).toThrow(
      TypeError,
    );
    expect(() => mapWeatherResponse({ timezone: 'UTC', [block]: [] }, city, fetchedAt)).toThrow(
      TypeError,
    );
  });

  it.each([
    null,
    '2026-10-07',
    ['2026-10-7'],
    ['2026-02-29'],
    ['2026-10-07T00:00:00Z'],
  ])('rejeita daily.time invalido: %j', (time) => {
    expect(() => mapWeatherResponse({ timezone: 'UTC', daily: { time } }, city, fetchedAt)).toThrow(
      TypeError,
    );
  });

  it('rejeita timezone ausente porque nao pode fabricar um valor', () => {
    expect(() => mapWeatherResponse({}, city, fetchedAt)).toThrow(TypeError);
  });
});
