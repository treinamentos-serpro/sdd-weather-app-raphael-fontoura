import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeather } from '../../src/hooks/useWeather';
import type { AsyncState, City, WeatherData } from '../../src/lib/types';
import { getWeather } from '../../src/services/weatherService';

vi.mock('../../src/services/weatherService', () => ({ getWeather: vi.fn() }));

const weatherMock = vi.mocked(getWeather);
const curitiba: City = { name: 'Curitiba', latitude: -25.43, longitude: -49.27, countryCode: 'BR' };
const paris: City = { name: 'Paris', latitude: 48.86, longitude: 2.35, countryCode: 'FR' };

function weather(city: City): WeatherData {
  return {
    city,
    timezone: city.countryCode === 'BR' ? 'America/Sao_Paulo' : 'Europe/Paris',
    fetchedAt: '2026-10-07T12:00:00Z',
    current: { temperatureC: 22 },
    forecast: [],
  };
}

function deferred() {
  let resolve!: (data: WeatherData | undefined) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<WeatherData | undefined>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useWeather', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    weatherMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fica idle sem cidade, inclusive ao tentar retry', () => {
    const { result } = renderHook(() => useWeather(null));
    act(() => result.current.retry());
    expect(result.current.state).toEqual({ status: 'idle' });
    expect(weatherMock).not.toHaveBeenCalled();
  });

  it('consulta uma vez e preserva resposta parcial sem retry automatico', async () => {
    const partial = weather(curitiba);
    weatherMock.mockResolvedValue(partial);
    const { result, rerender } = renderHook(({ city }) => useWeather(city), {
      initialProps: { city: curitiba },
    });
    expect(result.current.state).toEqual({ status: 'loading' });
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'success', data: partial });
    rerender({ city: { ...curitiba } });
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(weatherMock).toHaveBeenCalledTimes(1);
    expect(weatherMock).toHaveBeenCalledWith(curitiba, expect.any(AbortSignal));
  });

  it('limpa dados no primeiro render da nova cidade, antes dos effects', async () => {
    weatherMock.mockResolvedValueOnce(weather(curitiba)).mockReturnValueOnce(deferred().promise);
    const renders: { city: City | null; state: AsyncState<WeatherData> }[] = [];
    const { result, rerender } = renderHook(
      ({ city }: { city: City | null }) => {
        const hook = useWeather(city);
        renders.push({ city, state: hook.state });
        return hook;
      },
      { initialProps: { city: curitiba as City | null } },
    );
    await act(async () => {});
    expect(result.current.state.status).toBe('success');
    rerender({ city: paris });
    expect(renders.filter((render) => render.city === paris).map((render) => render.state)).toEqual(
      expect.arrayContaining([{ status: 'loading' }]),
    );
    expect(
      renders
        .filter((render) => render.city === paris)
        .every((render) => render.state.status === 'loading'),
    ).toBe(true);
    rerender({ city: null });
    expect(result.current.state).toEqual({ status: 'idle' });
    expect(weatherMock.mock.calls[1]?.[1]?.aborted).toBe(true);
  });

  it.each([
    'success',
    'error',
  ] as const)('descarta %s antigo mesmo sem cooperacao do service', async (outcome) => {
    const old = deferred();
    weatherMock.mockReturnValueOnce(old.promise).mockResolvedValueOnce(weather(paris));
    const { result, rerender } = renderHook(({ city }) => useWeather(city), {
      initialProps: { city: curitiba },
    });
    rerender({ city: paris });
    expect(weatherMock.mock.calls[0]?.[1]?.aborted).toBe(true);
    await act(async () => {});
    await act(async () => {
      if (outcome === 'success') old.resolve(weather(curitiba));
      else old.reject(new Error('Erro antigo'));
    });
    expect(result.current.state).toEqual({ status: 'success', data: weather(paris) });
  });

  it('representa resposta indisponivel como empty sem retry automatico', async () => {
    weatherMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useWeather(curitiba));
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(result.current.state).toEqual({ status: 'empty', reason: 'no-weather-data' });
    expect(weatherMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new TypeError('Sem conexao'), 'network'],
    [new DOMException('Tempo esgotado', 'TimeoutError'), 'timeout'],
    [new Error('Falha do servico'), 'api'],
    [
      Object.assign(new Error('Resposta invalida'), { kind: 'invalid-response' }),
      'invalid-response',
    ],
  ] as const)('encerra loading por %s e retry faz uma consulta da mesma cidade', async (error, kind) => {
    weatherMock.mockRejectedValueOnce(error).mockResolvedValueOnce(weather(curitiba));
    const { result } = renderHook(() => useWeather(curitiba));
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(result.current.state).toEqual({ status: 'error', kind, message: error.message });
    expect(weatherMock).toHaveBeenCalledTimes(1);
    act(() => result.current.retry());
    expect(result.current.state).toEqual({ status: 'loading' });
    await act(async () => {});
    expect(weatherMock).toHaveBeenCalledTimes(2);
    expect(weatherMock.mock.calls.map(([city]) => city)).toEqual([curitiba, curitiba]);
    expect(result.current.state.status).toBe('success');
  });

  it('encerra consulta travada em 10s e descarta resposta apos timeout', async () => {
    const pending = deferred();
    weatherMock.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useWeather(curitiba));
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(result.current.state).toMatchObject({ status: 'error', kind: 'timeout' });
    expect(weatherMock.mock.calls[0]?.[1]?.aborted).toBe(true);
    await act(async () => pending.resolve(weather(curitiba)));
    expect(result.current.state).toMatchObject({ status: 'error', kind: 'timeout' });
    expect(weatherMock).toHaveBeenCalledTimes(1);
  });

  it('retry invalida consulta pendente da mesma cidade', async () => {
    const pending = deferred();
    weatherMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(weather(curitiba));
    const { result } = renderHook(() => useWeather(curitiba));
    act(() => result.current.retry());
    expect(weatherMock.mock.calls[0]?.[1]?.aborted).toBe(true);
    await act(async () => {});
    await act(async () => pending.reject(new Error('Falha anterior')));
    expect(result.current.state).toEqual({ status: 'success', data: weather(curitiba) });
    expect(weatherMock).toHaveBeenCalledTimes(2);
  });

  it('cancela operacao e timer ao desmontar', async () => {
    const pending = deferred();
    weatherMock.mockReturnValue(pending.promise);
    const { unmount } = renderHook(() => useWeather(curitiba));
    unmount();
    expect(weatherMock.mock.calls[0]?.[1]?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => pending.reject(new Error('Falha apos desmontar')));
  });
});
