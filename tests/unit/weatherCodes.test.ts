import { describe, expect, expectTypeOf, it } from 'vitest';
import type { CurrentWeather, ForecastDay } from '../../src/lib/types';
import { getWeatherLabel } from '../../src/lib/weatherCodes';

describe('getWeatherLabel', () => {
  it.each([
    [0, 'Céu limpo'],
    [1, 'Predominantemente limpo'],
    [2, 'Parcialmente nublado'],
    [3, 'Encoberto'],
    [45, 'Nevoeiro'],
    [48, 'Nevoeiro com deposição de geada'],
    [51, 'Garoa leve'],
    [53, 'Garoa moderada'],
    [55, 'Garoa intensa'],
    [56, 'Garoa congelante leve'],
    [57, 'Garoa congelante intensa'],
    [61, 'Chuva leve'],
    [63, 'Chuva moderada'],
    [65, 'Chuva forte'],
    [66, 'Chuva congelante leve'],
    [67, 'Chuva congelante forte'],
    [71, 'Neve leve'],
    [73, 'Neve moderada'],
    [75, 'Neve forte'],
    [77, 'Grãos de neve'],
    [80, 'Pancadas de chuva leves'],
    [81, 'Pancadas de chuva moderadas'],
    [82, 'Pancadas de chuva violentas'],
    [85, 'Pancadas de neve leves'],
    [86, 'Pancadas de neve fortes'],
    [95, 'Trovoada leve ou moderada'],
    [96, 'Trovoada com granizo leve'],
    [99, 'Trovoada com granizo forte'],
  ] as const)('traduz o código WMO %i para "%s"', (code, label) => {
    expect(getWeatherLabel(code)).toBe(label);
  });

  it.each([
    undefined,
    -1,
    4,
    100,
    1.5,
    Number.NaN,
    Infinity,
    -Infinity,
  ])('retorna indisponível sem erro para o código %s', (code) => {
    expect(getWeatherLabel(code)).toBe('Condição indisponível');
  });

  it('aceita chamada sem argumento', () => {
    expect(getWeatherLabel()).toBe('Condição indisponível');
    expectTypeOf(getWeatherLabel).toEqualTypeOf<(code?: number) => string>();
  });

  it('aceita os códigos opcionais dos contratos sem alterar os dados', () => {
    const current: CurrentWeather = Object.freeze({ conditionCode: 0 });
    const forecast: ForecastDay = Object.freeze({ date: '2026-10-07' });

    expect(getWeatherLabel(current.conditionCode)).toBe('Céu limpo');
    expect(getWeatherLabel(forecast.conditionCode)).toBe('Condição indisponível');
    expect(current).toEqual({ conditionCode: 0 });
    expect(forecast).toEqual({ date: '2026-10-07' });
  });

  it('mantém o resultado entre chamadas intercaladas', () => {
    expect(getWeatherLabel(61)).toBe('Chuva leve');
    expect(getWeatherLabel(99)).toBe('Trovoada com granizo forte');
    expect(getWeatherLabel()).toBe('Condição indisponível');
    expect(getWeatherLabel(61)).toBe('Chuva leve');
  });
});
