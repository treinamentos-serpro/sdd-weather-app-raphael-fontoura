import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  AsyncState,
  City,
  CurrentWeather,
  ForecastDay,
  Unit,
  WeatherData,
} from '../../src/lib/types';

describe('Contratos de dominio', () => {
  const city: City = { name: 'Curitiba', latitude: -25.43, longitude: -49.27 };

  it('exige nome e coordenadas e permite metadados geograficos opcionais', () => {
    expectTypeOf<City>().toEqualTypeOf<{
      id?: number;
      name: string;
      latitude: number;
      longitude: number;
      country?: string;
      countryCode?: string;
      region?: string;
      timezone?: string;
    }>();
    expect(city).toEqual({ name: 'Curitiba', latitude: -25.43, longitude: -49.27 });
    expect(city.country).toBeUndefined();
  });

  it('permite condicoes atuais inteiramente indisponiveis', () => {
    expectTypeOf<CurrentWeather>().toEqualTypeOf<{
      observedAt?: string;
      temperatureC?: number;
      conditionCode?: number;
      humidityPercent?: number;
      windKmh?: number;
      pressureHpa?: number;
      precipitationMm?: number;
    }>();
    const current: CurrentWeather = {};
    expect(current.temperatureC).toBeUndefined();
    expect(current).toEqual({});
  });

  it('exige a data da previsao sem exigir medidas meteorologicas', () => {
    expectTypeOf<ForecastDay>().toEqualTypeOf<{
      date: string;
      minimumC?: number;
      maximumC?: number;
      conditionCode?: number;
      precipitationMm?: number;
      windKmh?: number;
    }>();
    const day: ForecastDay = { date: '2026-10-07' };
    expect(day.minimumC).toBeUndefined();
    expect(day.maximumC).toBeUndefined();
  });

  it('exige cidade, timezone, forecast e fetchedAt sem exigir clima atual', () => {
    expectTypeOf<WeatherData>().toEqualTypeOf<{
      city: City;
      timezone: string;
      current?: CurrentWeather;
      forecast: ForecastDay[];
      fetchedAt: string;
    }>();
    const weather: WeatherData = {
      city,
      timezone: 'America/Sao_Paulo',
      forecast: [],
      fetchedAt: '2026-10-07T12:00:00Z',
    };
    expect(weather.current).toBeUndefined();
    expect(weather.forecast).toEqual([]);
  });

  it('restringe unidades a Celsius e Fahrenheit', () => {
    expectTypeOf<Unit>().toEqualTypeOf<'celsius' | 'fahrenheit'>();
    const units: Unit[] = ['celsius', 'fahrenheit'];
    expect(units).toEqual(['celsius', 'fahrenheit']);
  });

  it('representa todos os estados com seus dados, motivos e categorias de erro', () => {
    expectTypeOf<AsyncState<City>>().toEqualTypeOf<
      | { status: 'idle' }
      | { status: 'loading' }
      | { status: 'success'; data: City }
      | { status: 'empty'; reason: 'no-supported-city' | 'no-weather-data' }
      | {
          status: 'error';
          kind: 'network' | 'api' | 'timeout' | 'invalid-response';
          message: string;
        }
    >();
    const states: AsyncState<City>[] = [
      { status: 'idle' },
      { status: 'loading' },
      { status: 'success', data: city },
      { status: 'empty', reason: 'no-supported-city' },
      { status: 'empty', reason: 'no-weather-data' },
      { status: 'error', kind: 'network', message: 'Sem conexao' },
      { status: 'error', kind: 'api', message: 'Erro de servico' },
      { status: 'error', kind: 'timeout', message: 'Tempo esgotado' },
      { status: 'error', kind: 'invalid-response', message: 'Resposta invalida' },
    ];
    for (const state of states) {
      if (state.status === 'success') {
        expectTypeOf(state.data).toEqualTypeOf<City>();
        expect(state.data).toEqual(city);
      }
      if (state.status === 'error') {
        expect(state.message).not.toBe('');
      }
    }
    expect(new Set(states.map((state) => state.status))).toEqual(
      new Set(['idle', 'loading', 'success', 'empty', 'error']),
    );
  });

  it('preserva zero como medida disponivel', () => {
    const current: CurrentWeather = { temperatureC: 0, precipitationMm: 0 };
    const day: ForecastDay = { date: '2026-10-07', minimumC: 0, maximumC: 0 };
    expect(current.temperatureC).toBe(0);
    expect(current.precipitationMm).toBe(0);
    expect(day.minimumC).toBe(0);
    expect(day.maximumC).toBe(0);
  });
});
