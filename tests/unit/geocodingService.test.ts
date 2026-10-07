import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchCities, WeatherServiceError } from '../../src/services/geocodingService';

function response(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function stubFetch(implementation: FetchFunction) {
  const fetchMock = vi.fn<FetchFunction>(implementation);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('searchCities', () => {
  it('constrói a query com os parâmetros esperados sem alterar o termo', async () => {
    const fetchMock = stubFetch(async () => response({ results: [] }));
    const term = "São João d'Ávila - Centro";

    await expect(searchCities(term)).resolves.toEqual([]);

    const requestUrl = fetchMock.mock.calls[0]?.[0];
    expect(requestUrl).toBeInstanceOf(URL);
    if (!(requestUrl instanceof URL)) throw new Error('O service deve enviar uma URL.');
    const url = requestUrl;
    expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search');
    expect(url.searchParams.get('name')).toBe(term);
    expect(url.searchParams.get('count')).toBe('5');
    expect(url.searchParams.get('language')).toBe('pt');
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.search).toContain('%C3%A3o');
    expect(url.search).toContain('%27');
    expect(url.search).toContain('-');
    expect(url.search).toContain('+');
  });

  it('mapeia os campos, exclui locais não suportados e prioriza cidades brasileiras', async () => {
    stubFetch(async () =>
      response({
        results: [
          {
            id: 3,
            name: 'Paris',
            latitude: 48.86,
            longitude: 2.35,
            country: 'France',
            country_code: 'FR',
            admin1: 'Île-de-France',
            timezone: 'Europe/Paris',
          },
          {
            id: 2,
            name: 'Zulu',
            latitude: -23.5,
            longitude: -46.6,
            country: 'Brasil',
            country_code: 'BR',
            admin1: 'São Paulo',
            timezone: 'America/Sao_Paulo',
          },
          {
            id: 4,
            name: 'Paris suburb',
            latitude: 49,
            longitude: 2,
            country: 'France',
            country_code: 'FR',
          },
          {
            id: 1,
            name: 'Alpha',
            latitude: -22.9,
            longitude: -43.2,
            country: 'Brasil',
            country_code: 'BR',
            admin1: 'Rio de Janeiro',
          },
        ],
      }),
    );

    const cities = await searchCities('cidade');

    expect(cities.map((city) => city.name)).toEqual(['Alpha', 'Zulu', 'Paris']);
    expect(cities[0]).toMatchObject({
      id: 1,
      countryCode: 'BR',
      region: 'Rio de Janeiro',
    });
    expect(cities[1]?.timezone).toBe('America/Sao_Paulo');
  });

  it('retorna lista vazia quando a resposta válida não contém resultados', async () => {
    stubFetch(async () => response({}));
    await expect(searchCities('lugar inexistente')).resolves.toEqual([]);
  });

  it('classifica resposta HTTP como erro da API', async () => {
    stubFetch(async () => response({}, 503));
    await expect(searchCities('Curitiba')).rejects.toMatchObject({
      name: 'WeatherServiceError',
      kind: 'api',
      message: expect.stringContaining('indisponível'),
    });
  });

  it('classifica falha de rede separadamente', async () => {
    stubFetch(async () => {
      throw new TypeError('detalhe interno');
    });
    await expect(searchCities('Curitiba')).rejects.toMatchObject({
      name: 'WeatherServiceError',
      kind: 'network',
    });
  });

  it.each([
    null,
    { results: 'inválido' },
    { results: [{ name: 'Sem coordenadas' }] },
  ])('classifica payload inválido como erro de resposta', async (payload) => {
    stubFetch(async () => response(payload));
    await expect(searchCities('Curitiba')).rejects.toMatchObject({
      name: 'WeatherServiceError',
      kind: 'invalid-response',
    });
  });

  it('classifica JSON inválido como erro de resposta', async () => {
    stubFetch(async () => ({
      ...response({}),
      json: vi.fn().mockRejectedValue(new SyntaxError()),
    }));
    await expect(searchCities('Curitiba')).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('encerra por timeout em 10 segundos e permite repetir a busca', async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch(() => new Promise<Response>(() => {}));
    const pending = searchCities('Curitiba');
    const rejection = expect(pending).rejects.toMatchObject({
      name: 'WeatherServiceError',
      kind: 'timeout',
    });

    await vi.advanceTimersByTimeAsync(9_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    await expect(pending).rejects.toBeInstanceOf(WeatherServiceError);
  });

  it('mantém cancelamento externo distinguível como AbortError', async () => {
    const fetchMock = stubFetch(() => new Promise<Response>(() => {}));
    const controller = new AbortController();
    const pending = searchCities('Curitiba', controller.signal);
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejeita sinal previamente cancelado como cancelamento, não como falha de serviço', async () => {
    const fetchMock = stubFetch(async () => response({ results: [] }));
    const controller = new AbortController();
    controller.abort();

    await expect(searchCities('Curitiba', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
