import { useEffect, useState } from 'react';
import type { AsyncState, City, WeatherData } from '../lib/types';
import { getWeather } from '../services/weatherService';

type WeatherError = Extract<AsyncState<WeatherData>, { status: 'error' }>;
type Selection = { key: string; city: City | null };

function toWeatherError(error: unknown): WeatherError {
  let kind: WeatherError['kind'] = 'api';
  if (error instanceof TypeError) kind = 'network';
  if ((error instanceof Error || error instanceof DOMException) && error.name === 'TimeoutError') {
    kind = 'timeout';
  }
  if (typeof error === 'object' && error !== null && 'kind' in error) {
    const candidate = error.kind;
    if (
      candidate === 'network' ||
      candidate === 'api' ||
      candidate === 'timeout' ||
      candidate === 'invalid-response'
    ) {
      kind = candidate;
    }
  }
  return {
    status: 'error',
    kind,
    message:
      error instanceof Error || error instanceof DOMException
        ? error.message
        : 'Nao foi possivel consultar o clima.',
  };
}

export function useWeather(city: City | null): {
  state: AsyncState<WeatherData>;
  retry: () => void;
} {
  const key = JSON.stringify(city);
  const [selection, setSelection] = useState<Selection>({ key, city });
  const [response, setResponse] = useState<{
    selection: Selection;
    state: AsyncState<WeatherData>;
  } | null>(null);

  if (selection.key !== key) setSelection({ key, city });

  useEffect(() => {
    if (!selection.city) return;
    const selectedCity = selection.city;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setResponse({
        selection,
        state: { status: 'error', kind: 'timeout', message: 'Tempo de consulta esgotado.' },
      });
      controller.abort();
    }, 10_000);

    async function load(): Promise<void> {
      try {
        const data = await getWeather(selectedCity, controller.signal);
        if (controller.signal.aborted) return;
        setResponse({
          selection,
          state: data
            ? { status: 'success', data }
            : { status: 'empty', reason: 'no-weather-data' },
        });
      } catch (error: unknown) {
        if (!controller.signal.aborted) setResponse({ selection, state: toWeatherError(error) });
      } finally {
        clearTimeout(timer);
      }
    }

    void load();
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selection]);

  function retry(): void {
    if (city) setSelection({ key, city });
  }

  const state: AsyncState<WeatherData> = !city
    ? { status: 'idle' }
    : selection.key === key && response?.selection === selection
      ? response.state
      : { status: 'loading' };

  return { state, retry };
}
