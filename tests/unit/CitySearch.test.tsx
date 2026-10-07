import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import CitySearch, { type CitySearchProps } from '../../src/components/CitySearch';
import type { AsyncState, City } from '../../src/lib/types';

const brazilianCity: City = {
  id: 1,
  name: 'Santa Maria',
  region: 'Rio Grande do Sul',
  country: 'Brasil',
  countryCode: 'BR',
  latitude: -29.68,
  longitude: -53.8,
};
const foreignCity: City = {
  id: 2,
  name: 'Santa Maria',
  region: 'California',
  country: 'Estados Unidos',
  countryCode: 'US',
  latitude: 34.95,
  longitude: -120.44,
};

function setup(overrides: Partial<CitySearchProps> = {}) {
  const props: CitySearchProps = {
    term: 'Santa Maria',
    state: { status: 'idle' },
    onTermChange: vi.fn(),
    onSearch: vi.fn(),
    onSelect: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  function ControlledSearch() {
    const [term, setTerm] = useState(props.term);
    return (
      <CitySearch
        {...props}
        term={term}
        onTermChange={(nextTerm) => {
          setTerm(nextTerm);
          props.onTermChange(nextTerm);
        }}
      />
    );
  }
  render(<ControlledSearch />);
  return { props, user: userEvent.setup(), input: screen.getByRole('textbox', { name: 'Cidade' }) };
}

describe('CitySearch', () => {
  it.each(['', '   '])('nao envia termo vazio %j por Enter, clique ou submit', async (term) => {
    const { props, user, input } = setup({ term });
    const button = screen.getByRole('button', { name: 'Buscar cidade' });
    expect(button).toBeDisabled();
    await user.click(input);
    await user.keyboard('{Enter}');
    await user.click(button);
    const form = input.closest('form');
    if (!form) throw new Error('Formulario ausente');
    fireEvent.submit(form);
    expect(props.onSearch).not.toHaveBeenCalled();
  });

  it('reporta digitacao sem buscar e envia o termo preservado por Enter e lupa', async () => {
    const { props, user, input } = setup({ term: '' });
    await user.type(input, '  Sao Paulo  ');
    expect(input).toHaveValue('  Sao Paulo  ');
    expect(props.onTermChange).toHaveBeenLastCalledWith('  Sao Paulo  ');
    expect(props.onSearch).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(props.onSearch).toHaveBeenCalledTimes(1);
    const button = screen.getByRole('button', { name: 'Buscar cidade' });
    expect(button).toHaveAttribute('title', 'Buscar cidade');
    await user.click(button);
    expect(props.onSearch).toHaveBeenCalledTimes(2);
  });

  it('distingue homonimas por regiao e pais, preservando a ordem recebida', async () => {
    const { props, user } = setup({
      state: { status: 'success', data: [brazilianCity, foreignCity] },
    });
    const list = screen.getByRole('list', { name: 'Sugestões de cidades' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByRole('button')).toHaveAccessibleName(
      'Santa Maria Rio Grande do Sul Brasil',
    );
    await user.click(within(items[1]).getByRole('button'));
    expect(props.onSelect).toHaveBeenCalledExactlyOnceWith(foreignCity);
    expect(props.onSearch).not.toHaveBeenCalled();
  });

  it('permite foco sequencial e selecao por Tab, Enter e Space', async () => {
    const { props, user, input } = setup({
      state: { status: 'success', data: [brazilianCity, foreignCity] },
    });
    await user.tab();
    expect(input).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Buscar cidade' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /Rio Grande do Sul/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(props.onSelect).toHaveBeenLastCalledWith(brazilianCity);
    await user.tab();
    expect(screen.getByRole('button', { name: /California/ })).toHaveFocus();
    await user.keyboard(' ');
    expect(props.onSelect).toHaveBeenLastCalledWith(foreignCity);
    expect(props.onSelect).toHaveBeenCalledTimes(2);
    expect(props.onSearch).not.toHaveBeenCalled();
  });

  it('aceita cidade sem id, regiao ou pais sem exibir valores ausentes', () => {
    setup({
      state: { status: 'success', data: [{ name: 'Curitiba', latitude: -25, longitude: -49 }] },
    });
    expect(screen.getByRole('button', { name: 'Curitiba' })).toHaveTextContent('Curitiba');
    expect(screen.queryByText(/undefined|null/)).not.toBeInTheDocument();
  });

  it.each<AsyncState<City[]>>([
    { status: 'empty', reason: 'no-supported-city' },
    { status: 'success', data: [] },
  ])('anuncia vazio com role status e permite nova digitacao (%j)', async (state) => {
    const { props, user, input } = setup({ state });
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum local suportado encontrado');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    await user.clear(input);
    await user.type(input, 'Curitiba');
    expect(input).toHaveValue('Curitiba');
    expect(props.onTermChange).toHaveBeenLastCalledWith('Curitiba');
  });

  it.each([
    'network',
    'api',
    'timeout',
    'invalid-response',
  ] as const)('anuncia erro %s seguro, preserva campo editavel e repete por teclado', async (kind) => {
    const { props, user, input } = setup({
      state: { status: 'error', kind, message: 'INTERNAL_SECRET <stack>' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      kind === 'timeout'
        ? 'O tempo de espera da busca foi excedido. Tente novamente.'
        : 'Não foi possível buscar cidades. Tente novamente.',
    );
    expect(screen.queryByText(/INTERNAL_SECRET/)).not.toBeInTheDocument();
    expect(input).toHaveValue('Santa Maria');
    await user.type(input, ' nova');
    expect(input).toHaveValue('Santa Maria nova');
    expect(props.onRetry).not.toHaveBeenCalled();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    expect(props.onSearch).not.toHaveBeenCalled();
  });

  it('anuncia loading sem bloquear edicao nem permitir submissao duplicada', async () => {
    const { props, user, input } = setup({ state: { status: 'loading' } });
    expect(screen.getByRole('status')).toHaveTextContent('Buscando cidades');
    expect(screen.getByRole('status').closest('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Buscar cidade' })).toBeDisabled();
    await user.type(input, ' nova{Enter}');
    expect(input).toHaveValue('Santa Maria nova');
    expect(props.onSearch).not.toHaveBeenCalled();
  });

  it('nao mostra mensagens transitorias ou sugestoes no estado idle', () => {
    setup();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
