import { useId } from 'react';
import type { AsyncState, City } from '../lib/types';

export interface CitySearchProps {
  term: string;
  state: AsyncState<City[]>;
  onTermChange: (term: string) => void;
  onSearch: () => void;
  onSelect: (city: City) => void;
  onRetry: () => void;
}

export default function CitySearch({
  term,
  state,
  onTermChange,
  onSearch,
  onSelect,
  onRetry,
}: CitySearchProps) {
  const inputId = useId();
  const cities = state.status === 'success' ? state.data : [];
  const isEmpty = state.status === 'empty' || (state.status === 'success' && !cities.length);
  const focusStyle =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-night-900';

  return (
    <div className="min-w-0 bg-night-900 text-white">
      <form
        aria-busy={state.status === 'loading'}
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (term.trim() && state.status !== 'loading') onSearch();
        }}
      >
        <label htmlFor={inputId} className="block font-medium">
          Cidade
        </label>
        <div className="flex min-w-0 gap-2">
          <input
            id={inputId}
            type="text"
            value={term}
            onChange={(event) => onTermChange(event.target.value)}
            className={`min-w-0 flex-1 rounded-lg border border-white/40 bg-night-800 px-3 py-2 ${focusStyle}`}
          />
          <button
            type="submit"
            aria-label="Buscar cidade"
            title="Buscar cidade"
            disabled={!term.trim() || state.status === 'loading'}
            className={`h-11 w-11 shrink-0 rounded-lg border border-white/40 bg-night-800 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-night-700 ${focusStyle}`}
          >
            <span aria-hidden="true">🔍</span>
          </button>
        </div>
      </form>

      {state.status === 'loading' && (
        <p role="status" className="mt-3">
          Buscando cidades...
        </p>
      )}
      {isEmpty && (
        <p role="status" className="mt-3">
          Nenhum local suportado encontrado
        </p>
      )}
      {state.status === 'error' && (
        <div className="mt-3 space-y-2">
          <p role="alert">
            {state.kind === 'timeout'
              ? 'O tempo de espera da busca foi excedido. Tente novamente.'
              : 'Não foi possível buscar cidades. Tente novamente.'}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className={`max-w-full whitespace-normal rounded-lg border border-white/40 bg-night-800 px-3 py-2 hover:bg-night-700 ${focusStyle}`}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {cities.length > 0 && (
        <ul aria-label="Sugestões de cidades" className="mt-3 min-w-0 space-y-2">
          {cities.map((city) => (
            <li
              key={
                city.id ??
                `${city.latitude}:${city.longitude}:${city.name}:${city.region ?? ''}:${city.country ?? ''}`
              }
              className="min-w-0"
            >
              <button
                type="button"
                aria-label={[city.name, city.region, city.country].filter(Boolean).join(' ')}
                onClick={() => onSelect(city)}
                className={`w-full min-w-0 whitespace-normal rounded-lg border border-white/40 bg-night-800 px-3 py-2 text-left [overflow-wrap:anywhere] hover:bg-night-700 ${focusStyle}`}
              >
                <span className="block font-medium">{city.name}</span>
                {city.region && <span className="block text-sm">{city.region}</span>}
                {city.country && <span className="block text-sm">{city.country}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
