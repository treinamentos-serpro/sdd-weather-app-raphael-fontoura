import type { Unit } from './types';

export function celsiusToFahrenheit(value?: number): number | undefined {
  return value === undefined ? undefined : (value * 9) / 5 + 32;
}

export function fahrenheitToCelsius(value?: number): number | undefined {
  return value === undefined ? undefined : ((value - 32) * 5) / 9;
}

export function getTemperature(value: number | undefined, unit: Unit): number | undefined {
  const temperature = unit === 'fahrenheit' ? celsiusToFahrenheit(value) : value;
  return temperature === undefined ? undefined : Math.round(temperature);
}

export function formatTemperature(value: number | undefined, unit: Unit): string {
  const temperature = getTemperature(value, unit);
  return temperature === undefined
    ? 'Indisponível'
    : `${temperature} ${unit === 'fahrenheit' ? '°F' : '°C'}`;
}
