import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockCities, searchMockCities } from '../../src/services/mockCityService';

describe('searchMockCities', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function search(term: string) {
    const request = searchMockCities(term);
    await vi.advanceTimersByTimeAsync(300);
    return request;
  }

  it('ignora vazio e espacos sem agendar operacao', async () => {
    expect(await searchMockCities('')).toEqual([]);
    expect(await searchMockCities('   ')).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('respeita latencia local e nao usa fetch', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    try {
      const request = searchMockCities('Curitiba');
      const resolved = vi.fn();
      void request.then(resolved);
      await vi.advanceTimersByTimeAsync(299);
      expect(resolved).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(await request).toEqual([expect.objectContaining({ name: 'Curitiba' })]);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('normaliza matching sem modificar acentos, espacos e hifens nos resultados', async () => {
    expect(await search('  SAO PAULO  ')).toEqual([expect.objectContaining({ name: 'São Paulo' })]);
    expect(await search('sao joao del-rei')).toEqual([
      expect.objectContaining({ name: 'São João del-Rei' }),
    ]);
  });

  it('prioriza brasileiros e identifica homonimas por regiao e pais', async () => {
    expect((await search('lon')).map((city) => city.name)).toEqual(['Londrina', 'London']);
    const homonyms = await search('Santa Maria');
    expect(homonyms).toHaveLength(2);
    expect(new Set(homonyms.map((city) => city.region)).size).toBe(2);
    expect(new Set(homonyms.map((city) => city.id)).size).toBe(2);
    expect(homonyms.every((city) => city.country === 'Brasil')).toBe(true);
  });

  it('inclui todas as cidades obrigatorias e apenas capitais internacionais aprovadas', () => {
    const brazilianNames = mockCities
      .filter((city) => city.countryCode === 'BR')
      .map((city) => city.name);
    expect(brazilianNames).toEqual(
      expect.arrayContaining([
        'Curitiba',
        'São Paulo',
        'Rio de Janeiro',
        'Brasília',
        'Belo Horizonte',
        'Porto Alegre',
        'Salvador',
        'Recife',
        'Manaus',
        'Fortaleza',
      ]),
    );
    expect(mockCities.filter((city) => city.countryCode !== 'BR').map((city) => city.name)).toEqual(
      [
        'Buenos Aires',
        'Canberra',
        'Ottawa',
        'Beijing',
        'Paris',
        'Berlin',
        'New Delhi',
        'Jakarta',
        'Rome',
        'Tokyo',
        'Mexico City',
        'Moscow',
        'Riyadh',
        'Pretoria',
        'Seoul',
        'Ankara',
        'London',
        'Washington, D.C.',
      ],
    );
    expect(mockCities.every((city) => city.country && city.region)).toBe(true);
  });

  it('retorna vazio para cidade fora do catalogo finito', async () => {
    expect(await search('Cidade inexistente')).toEqual([]);
  });

  it('cancela o timer e rejeita com AbortError', async () => {
    const controller = new AbortController();
    const request = searchMockCities('Tokyo', controller.signal);
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejeita sinal previamente cancelado sem agendar timer', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(searchMockCities('Paris', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
