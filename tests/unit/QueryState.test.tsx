import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QueryState, { type QueryStateProps } from '../../src/components/QueryState';
import type { AsyncState } from '../../src/lib/types';

const operations: QueryStateProps['operation'][] = ['search', 'weather'];
const errorKinds: Extract<AsyncState<unknown>, { status: 'error' }>['kind'][] = [
  'network',
  'api',
  'timeout',
  'invalid-response',
];
const internalMessage = 'Detalhe interno: https://internal.example/forecast token=secret HTTP 500';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(operations)('QueryState: %s', (operation) => {
  it.each<AsyncState<unknown>>([
    { status: 'idle' },
    { status: 'success', data: internalMessage },
  ])('nao renderiza conteudo em $status', (state) => {
    const onRetry = vi.fn();
    const { container } = render(
      <QueryState state={state} operation={operation} onRetry={onRetry} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('anuncia carregamento especifico da operacao sem retry', () => {
    const onRetry = vi.fn();
    render(<QueryState state={{ status: 'loading' }} operation={operation} onRetry={onRetry} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      operation === 'search' ? 'Buscando locais...' : 'Carregando dados meteorológicos...',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it.each([
    { reason: 'no-supported-city' as const, text: 'Nenhum local suportado encontrado.' },
    { reason: 'no-weather-data' as const, text: 'Dados meteorológicos indisponíveis.' },
  ])('anuncia estado vazio $reason com mensagem exata', ({ reason, text }) => {
    const onRetry = vi.fn();
    render(
      <QueryState state={{ status: 'empty', reason }} operation={operation} onRetry={onRetry} />,
    );

    expect(screen.getByRole('status').textContent).toBe(text);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it.each(errorKinds)('anuncia %s com mensagem segura e retry manual unico', async (kind) => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const state: AsyncState<unknown> = { status: 'error', kind, message: internalMessage };
    const { container, rerender } = render(
      <QueryState state={state} operation={operation} onRetry={onRetry} />,
    );
    const alert = screen.getByRole('alert');

    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent(
      operation === 'search' ? 'buscar locais' : 'carregar dados meteorológicos',
    );
    if (kind === 'timeout') {
      expect(alert).toHaveTextContent('tempo de espera');
    } else {
      expect(alert).toHaveTextContent('Não foi possível');
      expect(alert).not.toHaveTextContent('tempo de espera');
    }
    expect(container).not.toHaveTextContent(internalMessage);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(onRetry).not.toHaveBeenCalled();

    rerender(<QueryState state={state} operation={operation} onRetry={onRetry} />);
    expect(onRetry).not.toHaveBeenCalled();
    await user.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith();
    expect(alert).toBeVisible();

    rerender(<QueryState state={{ status: 'loading' }} operation={operation} onRetry={onRetry} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeVisible();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('QueryState: interacao', () => {
  it('permite retry por teclado sem submissao de formulario', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <QueryState
          state={{ status: 'error', kind: 'network', message: internalMessage }}
          operation="weather"
          onRetry={onRetry}
        />
      </form>,
    );

    await user.tab();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('mantem operacoes independentes e nao chama rede', async () => {
    const user = userEvent.setup();
    const searchRetry = vi.fn();
    const weatherRetry = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const requestMock = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => {});
    render(
      <>
        <section aria-label="Busca">
          <QueryState
            state={{ status: 'error', kind: 'api', message: internalMessage }}
            operation="search"
            onRetry={searchRetry}
          />
        </section>
        <section aria-label="Clima">
          <QueryState
            state={{ status: 'error', kind: 'timeout', message: internalMessage }}
            operation="weather"
            onRetry={weatherRetry}
          />
        </section>
      </>,
    );

    expect(searchRetry).not.toHaveBeenCalled();
    expect(weatherRetry).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole('region', { name: 'Busca' })).getByRole('button', {
        name: 'Tentar novamente',
      }),
    );
    expect(searchRetry).toHaveBeenCalledTimes(1);
    expect(weatherRetry).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole('region', { name: 'Clima' })).getByRole('button', {
        name: 'Tentar novamente',
      }),
    );
    expect(searchRetry).toHaveBeenCalledTimes(1);
    expect(weatherRetry).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
  });
});
