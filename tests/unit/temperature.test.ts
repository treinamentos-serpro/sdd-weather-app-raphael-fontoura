import { describe, expect, it } from 'vitest';
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatTemperature,
  getTemperature,
} from '../../src/lib/temperature';
import type { Unit, WeatherData } from '../../src/lib/types';

describe('Conversao de temperatura', () => {
  it.each([
    [0, 32],
    [100, 212],
    [-40, -40],
    [20.25, 68.45],
  ])('converte %s Celsius para %s Fahrenheit sem arredondar', (celsius, fahrenheit) => {
    expect(celsiusToFahrenheit(celsius)).toBeCloseTo(fahrenheit);
  });

  it.each([
    [32, 0],
    [212, 100],
    [-40, -40],
    [68.45, 20.25],
  ])('converte %s Fahrenheit para %s Celsius sem arredondar', (fahrenheit, celsius) => {
    expect(fahrenheitToCelsius(fahrenheit)).toBeCloseTo(celsius);
  });

  it('mantem valores ausentes nas duas conversoes', () => {
    expect(celsiusToFahrenheit()).toBeUndefined();
    expect(celsiusToFahrenheit(undefined)).toBeUndefined();
    expect(fahrenheitToCelsius()).toBeUndefined();
    expect(fahrenheitToCelsius(undefined)).toBeUndefined();
  });
});

describe('Apresentacao de temperatura', () => {
  it.each<[number, Unit, number, string]>([
    [0, 'celsius', 0, '0 °C'],
    [0, 'fahrenheit', 32, '32 °F'],
    [20.4, 'celsius', 20, '20 °C'],
    [20.5, 'celsius', 21, '21 °C'],
    [-20.6, 'celsius', -21, '-21 °C'],
    [-20.5, 'celsius', -20, '-20 °C'],
    [20.3, 'fahrenheit', 69, '69 °F'],
    [20.2, 'fahrenheit', 68, '68 °F'],
    [-40, 'fahrenheit', -40, '-40 °F'],
  ])('apresenta %s Celsius em %s como %s', (value, unit, rounded, formatted) => {
    expect(getTemperature(value, unit)).toBe(rounded);
    expect(formatTemperature(value, unit)).toBe(formatted);
  });

  it.each<Unit>(['celsius', 'fahrenheit'])('preserva ausencia em %s', (unit) => {
    expect(getTemperature(undefined, unit)).toBeUndefined();
    expect(formatTemperature(undefined, unit)).toBe('Indisponível');
  });

  it('deriva temperaturas atuais e previstas sem alterar os dados normalizados', () => {
    const weather: WeatherData = {
      city: { name: 'Curitiba', latitude: -25.43, longitude: -49.27 },
      timezone: 'America/Sao_Paulo',
      current: { temperatureC: 20.3, conditionCode: 0, humidityPercent: 65 },
      forecast: [{ date: '2026-10-07', minimumC: 0, maximumC: 25.4, conditionCode: 3 }],
      fetchedAt: '2026-10-07T12:00:00Z',
    };
    const original = structuredClone(weather);
    Object.freeze(weather.city);
    Object.freeze(weather.current);
    for (const day of weather.forecast) Object.freeze(day);
    Object.freeze(weather.forecast);
    Object.freeze(weather);

    for (const unit of ['fahrenheit', 'celsius', 'fahrenheit'] as const) {
      expect(getTemperature(weather.current?.temperatureC, unit)).toBe(
        unit === 'fahrenheit' ? 69 : 20,
      );
      expect(formatTemperature(weather.forecast[0].minimumC, unit)).toBe(
        unit === 'fahrenheit' ? '32 °F' : '0 °C',
      );
      expect(formatTemperature(weather.forecast[0].maximumC, unit)).toBe(
        unit === 'fahrenheit' ? '78 °F' : '25 °C',
      );
      expect(weather).toEqual(original);
    }
  });
});
