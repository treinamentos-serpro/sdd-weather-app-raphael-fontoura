import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCitySearch } from '../../src/hooks/useCitySearch';
import type { City } from '../../src/lib/types';
import { searchCities } from '../../src/services/geocodingService';

vi.mock('../../src/services/geocodingService', () => ({ searchCities: vi.fn() }));

const searchMock = vi.mocked(searchCities);
const curitiba: City = { name: 'Curitiba', latitude: -25.43, longitude: -49.27 };
const paris: City = { name: 'Paris', latitude: 48.86, longitude: 2.35 };

function deferred() {
  let resolve!: (cities: City[]) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<City[]>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useCitySearch', () => {
  beforeEach(() => {
    searchMock.mockReset();
  });

  it('inicia idle e nao chama service para vazio ou espacos, nem ao digitar', () => {
    const { result } = renderHook(useCitySearch);
    expect(result.current.state).toEqual({ status: 'idle' });
    act(() => result.current.search());
    act(() => result.current.setTerm('   '));
    act(() => result.current.retry());
    act(() => result.current.setTerm('Curitiba'));
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('preserva o campo original e transita loading para success', async () => {
    const pending = deferred();
    searchMock.mockReturnValue(pending.promise);
    const { result } = renderHook(useCitySearch);
    act(() => {
      result.current.setTerm('  São João del-Rei  ');
      result.current.search();
    });
    expect(result.current.term).toBe('  São João del-Rei  ');
    expect(searchMock).toHaveBeenCalledWith('  São João del-Rei  ', expect.any(AbortSignal));
    expect(result.current.state).toEqual({ status: 'loading' });
    await act(async () => pending.resolve([curitiba]));
    expect(result.current.state).toEqual({ status: 'success', data: [curitiba] });
  });

  it('representa busca sem resultados como empty tipado', async () => {
    searchMock.mockResolvedValue([]);
    const { result } = renderHook(useCitySearch);
    await act(async () => {
      result.current.setTerm('Desconhecida');
      result.current.search();
    });
    expect(result.current.state).toEqual({ status: 'empty', reason: 'no-supported-city' });
  });

  it.each([
    [new TypeError('Sem conexao'), 'network'],
    [new DOMException('Tempo esgotado', 'TimeoutError'), 'timeout'],
    [new Error('Falha do servico'), 'api'],
    [
      Object.assign(new Error('Resposta invalida'), { kind: 'invalid-response' }),
      'invalid-response',
    ],
  ] as const)('preserva termo apos %s e repete somente por retry manual', async (error, kind) => {
    searchMock.mockRejectedValueOnce(error).mockResolvedValueOnce([curitiba]);
    const { result } = renderHook(useCitySearch);
    await act(async () => {
      result.current.setTerm('  Curitiba  ');
      result.current.search();
    });
    expect(result.current.state).toEqual({ status: 'error', kind, message: error.message });
    expect(result.current.term).toBe('  Curitiba  ');
    expect(searchMock).toHaveBeenCalledTimes(1);
    await act(async () => result.current.retry());
    expect(searchMock).toHaveBeenCalledTimes(2);
    expect(searchMock.mock.calls.map(([term]) => term)).toEqual(['  Curitiba  ', '  Curitiba  ']);
    expect(result.current.state).toEqual({ status: 'success', data: [curitiba] });
  });

  it.each([
    'success',
    'error',
  ] as const)('ignora %s atrasado mesmo se service nao respeita abort', async (outcome) => {
    const previous = deferred();
    searchMock.mockReturnValueOnce(previous.promise).mockResolvedValueOnce([paris]);
    const { result } = renderHook(useCitySearch);
    act(() => {
      result.current.setTerm('Curitiba');
      result.current.search();
    });
    const previousSignal = searchMock.mock.calls[0]?.[1];
    await act(async () => {
      result.current.setTerm('Paris');
      result.current.search();
    });
    expect(previousSignal?.aborted).toBe(true);
    await act(async () => {
      if (outcome === 'success') previous.resolve([curitiba]);
      else previous.reject(new Error('Falha antiga'));
    });
    expect(result.current.state).toEqual({ status: 'success', data: [paris] });
  });

  it('invalida busca ao trocar termo sem iniciar outra', async () => {
    const pending = deferred();
    searchMock.mockReturnValue(pending.promise);
    const { result } = renderHook(useCitySearch);
    act(() => {
      result.current.setTerm('Curitiba');
      result.current.search();
    });
    act(() => result.current.setTerm(''));
    await act(async () => pending.resolve([curitiba]));
    expect(result.current.state).toEqual({ status: 'idle' });
    expect(result.current.term).toBe('');
    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it('retorna a cidade selecionada e invalida busca pendente', async () => {
    const pending = deferred();
    searchMock.mockReturnValue(pending.promise);
    const { result } = renderHook(useCitySearch);
    act(() => {
      result.current.setTerm('Curitiba');
      result.current.search();
    });
    act(() => expect(result.current.selectCity(curitiba)).toBe(curitiba));
    expect(searchMock.mock.calls[0]?.[1]?.aborted).toBe(true);
    await act(async () => pending.resolve([paris]));
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('cancela operacao ao desmontar', async () => {
    const pending = deferred();
    searchMock.mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(useCitySearch);
    act(() => {
      result.current.setTerm('Paris');
      result.current.search();
    });
    unmount();
    expect(searchMock.mock.calls[0]?.[1]?.aborted).toBe(true);
    const rejected = expect(pending.promise).rejects.toThrow('Falha apos desmontar');
    pending.reject(new Error('Falha apos desmontar'));
    await rejected;
  });
});
