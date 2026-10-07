import type { AsyncState } from '../lib/types';

export interface QueryStateProps {
  state: AsyncState<unknown>;
  operation: 'search' | 'weather';
  onRetry: () => void;
}

export default function QueryState({ state, operation, onRetry }: QueryStateProps) {
  if (state.status === 'idle' || state.status === 'success') return null;

  const isSearch = operation === 'search';
  let text: string;

  if (state.status === 'loading') {
    text = isSearch ? 'Buscando locais...' : 'Carregando dados meteorológicos...';
  } else if (state.status === 'empty') {
    text =
      state.reason === 'no-supported-city'
        ? 'Nenhum local suportado encontrado.'
        : 'Dados meteorológicos indisponíveis.';
  } else if (state.kind === 'timeout') {
    text = isSearch
      ? 'O tempo de espera para buscar locais foi excedido.'
      : 'O tempo de espera para carregar dados meteorológicos foi excedido.';
  } else {
    text = isSearch
      ? 'Não foi possível buscar locais. Tente novamente.'
      : 'Não foi possível carregar dados meteorológicos. Tente novamente.';
  }

  return (
    <div className="min-w-0 max-w-full space-y-2 text-white [overflow-wrap:anywhere]">
      <p role={state.status === 'error' ? 'alert' : 'status'}>{text}</p>
      {state.status === 'error' && (
        <button
          type="button"
          onClick={() => onRetry()}
          className="min-h-11 max-w-full whitespace-normal rounded-lg border border-white/40 bg-night-800 px-3 py-2 hover:bg-night-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-night-900"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
