import { useEffect, useRef, useState } from 'react';
import type { AsyncState, City } from '../lib/types';
import { searchCities } from '../services/geocodingService';

type SearchError = Extract<AsyncState<City[]>, { status: 'error' }>;

function toSearchError(error: unknown): SearchError {
  let kind: SearchError['kind'] = 'api';
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
        : 'Nao foi possivel buscar cidades.',
  };
}

export function useCitySearch(): {
  term: string;
  setTerm: (term: string) => void;
  state: AsyncState<City[]>;
  search: () => void;
  retry: () => void;
  selectCity: (city: City) => City;
} {
  const [term, updateTerm] = useState('');
  const [state, setState] = useState<AsyncState<City[]>>({ status: 'idle' });
  const currentTerm = useRef('');
  const operation = useRef<AbortController | null>(null);

  useEffect(() => () => operation.current?.abort(), []);

  function invalidate(): void {
    operation.current?.abort();
    operation.current = null;
  }

  function setTerm(nextTerm: string): void {
    invalidate();
    currentTerm.current = nextTerm;
    updateTerm(nextTerm);
    setState({ status: 'idle' });
  }

  function search(): void {
    invalidate();
    if (!currentTerm.current.trim()) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setState({ status: 'loading' });
    void searchCities(currentTerm.current, controller.signal).then(
      (cities) => {
        if (controller.signal.aborted) return;
        setState(
          cities.length
            ? { status: 'success', data: cities }
            : { status: 'empty', reason: 'no-supported-city' },
        );
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState(toSearchError(error));
      },
    );
  }

  function selectCity(city: City): City {
    invalidate();
    setState({ status: 'idle' });
    return city;
  }

  return { term, setTerm, state, search, retry: search, selectCity };
}
