import { describe, expect, expectTypeOf, it } from 'vitest';
import { filterAndSortCities } from '../../src/lib/cityCatalog';
import type { City } from '../../src/lib/types';

function city(name: string, country: string, countryCode: string, id: number): City {
  return { id, name, latitude: id, longitude: -id, country, countryCode };
}

describe('filterAndSortCities', () => {
  it('mantém todas as cidades brasileiras e somente capitais internacionais aprovadas', () => {
    const input = [
      city('London', 'United Kingdom', 'GB', 1),
      city('Campinas', 'Brazil', 'BR', 2),
      city('Springfield', 'United States', 'US', 3),
      city('Paris', 'France', 'FR', 4),
      city('Londres', 'Brasil', 'br', 5),
      city('Paris', 'United States', 'US', 6),
    ];

    expect(filterAndSortCities(input).map(({ id }) => id)).toEqual([2, 5, 1, 4]);
  });

  it('reconhece capitais internacionais pelos nomes e países aprovados', () => {
    const capitals = [
      city('Buenos Aires', 'Argentina', 'AR', 1),
      city('Canberra', 'Australia', 'AU', 2),
      city('Ottawa', 'Canada', 'CA', 3),
      city('Beijing', 'China', 'CN', 4),
      city('Berlin', 'Germany', 'DE', 5),
      city('New Delhi', 'India', 'IN', 6),
      city('Jakarta', 'Indonesia', 'ID', 7),
      city('Rome', 'Italy', 'IT', 8),
      city('Tokyo', 'Japan', 'JP', 9),
      city('Mexico City', 'Mexico', 'MX', 10),
      city('Moscow', 'Russia', 'RU', 11),
      city('Riyadh', 'Saudi Arabia', 'SA', 12),
      city('Pretoria', 'South Africa', 'ZA', 13),
      city('Seoul', 'South Korea', 'KR', 14),
      city('Ankara', 'Turkey', 'TR', 15),
      city('Washington, D.C.', 'United States', 'US', 16),
    ];

    expect(filterAndSortCities(capitals)).toHaveLength(capitals.length);
  });

  it('prioriza cidades brasileiras e desempata pelo nome e país', () => {
    const input = [
      city('Ottawa', 'Canada', 'CA', 1),
      city('Manaus', 'Brazil', 'BR', 2),
      city('São Paulo', 'Brazil', 'BR', 3),
      city('Paris', 'France', 'FR', 4),
      city('Brasília', 'Brazil', 'BR', 5),
      city('Berlin', 'Germany', 'DE', 6),
    ];

    expect(filterAndSortCities(input).map(({ id }) => id)).toEqual([5, 2, 3, 6, 1, 4]);
  });

  it('normaliza nomes e países sem alterar ou ordenar o array de entrada', () => {
    const input = Object.freeze([
      Object.freeze(city('  São Paulo ', 'Brasil', '', 1)),
      Object.freeze(city('PARIS', 'France', '', 2)),
    ]);

    const result = filterAndSortCities(input);

    expect(result.map(({ id }) => id)).toEqual([1, 2]);
    expect(input.map(({ id }) => id)).toEqual([1, 2]);
    expectTypeOf(filterAndSortCities).toEqualTypeOf<(cities: readonly City[]) => City[]>();
  });
});
