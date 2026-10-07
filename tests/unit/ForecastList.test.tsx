import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ForecastList from '../../src/components/ForecastList';
import type { ForecastDay, WeatherData } from '../../src/lib/types';
import { formatForecastDate } from '../../src/lib/weatherDate';

const dates = ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];

function makeData(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    city: { name: 'Curitiba', latitude: -25.43, longitude: -49.27 },
    timezone: 'America/Sao_Paulo',
    fetchedAt: '2026-10-07T12:00:00Z',
    forecast: dates.map((date) => ({
      date,
      minimumC: 10,
      maximumC: 20,
      conditionCode: 61,
      precipitationMm: 2.5,
      windKmh: 12,
    })),
    ...overrides,
  };
}

function expectMetric(card: HTMLElement, label: string, value: string) {
  expect(within(card).getByText(label).closest('dt')?.nextElementSibling?.textContent).toBe(value);
}

function expectDates(expected: string[]) {
  const cards = screen.getAllByRole('listitem');
  expect(cards).toHaveLength(5);
  expected.forEach((date, index) => {
    expect(within(cards[index]).getByRole('heading', { level: 3 })).toHaveTextContent(
      formatForecastDate(date),
    );
    expect(within(cards[index]).getByText(formatForecastDate(date))).toHaveAttribute(
      'datetime',
      date,
    );
  });
}

describe('ForecastList', () => {
  it('apresenta cinco datas locais consecutivas e todos os campos recebidos', () => {
    render(<ForecastList data={makeData()} unit="celsius" />);
    expect(screen.getByRole('region', { name: 'Previsão diária' })).toBeInTheDocument();
    expectDates(dates);
    for (const card of screen.getAllByRole('listitem')) {
      expectMetric(card, 'Mínima', '10 °C');
      expectMetric(card, 'Máxima', '20 °C');
      expectMetric(card, 'Precipitação', '2.5 mm');
      expectMetric(card, 'Vento', '12 km/h');
      expect(within(card).getByText('Chuva leve')).toBeInTheDocument();
    }
  });

  it.each([
    ['minimumC', 'Mínima'],
    ['maximumC', 'Máxima'],
    ['precipitationMm', 'Precipitação'],
    ['windKmh', 'Vento'],
  ] as const)('identifica campo %s ausente sem descartar o dia parcial', (field, label) => {
    const data = makeData();
    data.forecast[0][field] = undefined;
    render(<ForecastList data={data} unit="celsius" />);
    const card = screen.getAllByRole('listitem')[0];
    expectMetric(card, label, 'Indisponível');
    expect(within(card).getByText('Chuva leve')).toBeInTheDocument();
    expect(within(card).queryByText('Dados do dia indisponíveis')).not.toBeInTheDocument();
  });

  it.each([undefined, 999])('identifica condição ausente ou desconhecida: %s', (conditionCode) => {
    const data = makeData();
    data.forecast[0].conditionCode = conditionCode;
    render(<ForecastList data={data} unit="celsius" />);
    expect(
      within(screen.getAllByRole('listitem')[0]).getByText('Condição indisponível'),
    ).toBeInTheDocument();
  });

  it('associa por data, preserva lacuna e ignora datas extras ou inválidas', () => {
    const data = makeData();
    data.forecast = [
      { ...data.forecast[2], maximumC: 33 },
      data.forecast[0],
      { date: '2026-10-06', maximumC: 99 },
      { date: '2026-02-30', maximumC: 88 },
      { date: '', maximumC: 77 },
      data.forecast[4],
      data.forecast[3],
    ];
    render(<ForecastList data={data} unit="celsius" />);
    expectDates(dates);
    const cards = screen.getAllByRole('listitem');
    expect(within(cards[1]).getByText('Dados do dia indisponíveis')).toBeInTheDocument();
    expectMetric(cards[1], 'Máxima', 'Indisponível');
    expectMetric(cards[2], 'Máxima', '33 °C');
    expect(screen.queryByText('99 °C')).not.toBeInTheDocument();
    expect(screen.queryByText('88 °C')).not.toBeInTheDocument();
    expect(screen.queryByText('77 °C')).not.toBeInTheDocument();
  });

  it('mantém cinco datas identificáveis quando a previsão está vazia', () => {
    render(<ForecastList data={makeData({ forecast: [] })} unit="celsius" />);
    expectDates(dates);
    expect(screen.getAllByText('Dados do dia indisponíveis')).toHaveLength(5);
    expect(screen.getAllByText('Indisponível')).toHaveLength(20);
  });

  it.each([
    ['Pacific/Kiritimati', ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']],
    ['Pacific/Honolulu', ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']],
  ])('usa fetchedAt e o fuso %s para determinar hoje', (timezone, expected) => {
    const data = makeData({ timezone, fetchedAt: '2026-10-07T23:30:00Z' });
    render(<ForecastList data={data} unit="celsius" />);
    expectDates(expected);
    const first = screen.getAllByRole('listitem')[0];
    expectMetric(first, 'Mínima', '10 °C');
  });

  it('atualiza ambas as temperaturas ao trocar a unidade sem converter mm ou km/h', () => {
    const data = makeData();
    const { rerender } = render(<ForecastList data={data} unit="celsius" />);
    rerender(<ForecastList data={data} unit="fahrenheit" />);
    for (const card of screen.getAllByRole('listitem')) {
      expectMetric(card, 'Mínima', '50 °F');
      expectMetric(card, 'Máxima', '68 °F');
      expectMetric(card, 'Precipitação', '2.5 mm');
      expectMetric(card, 'Vento', '12 km/h');
    }
  });

  it.each([
    { timezone: 'Fuso/Inexistente' },
    { timezone: '' },
    { fetchedAt: 'inválido' },
    { fetchedAt: '2026-02-30T12:00:00Z' },
  ])('mostra cinco posições sem inventar datas quando a referência é inválida: %j', (overrides) => {
    render(<ForecastList data={makeData(overrides)} unit="celsius" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getAllByRole('heading', { name: 'Data indisponível' })).toHaveLength(5);
    expect(screen.getAllByText('Dados do dia indisponíveis')).toHaveLength(5);
    expect(screen.getAllByText('Indisponível')).toHaveLength(20);
    expect(screen.queryByText('10 °C')).not.toBeInTheDocument();
  });

  it('preserva zero como valor válido para todos os campos e condição', () => {
    const day: ForecastDay = {
      date: dates[0],
      minimumC: 0,
      maximumC: 0,
      conditionCode: 0,
      precipitationMm: 0,
      windKmh: 0,
    };
    render(<ForecastList data={makeData({ forecast: [day] })} unit="celsius" />);
    const card = screen.getAllByRole('listitem')[0];
    expectMetric(card, 'Mínima', '0 °C');
    expectMetric(card, 'Máxima', '0 °C');
    expectMetric(card, 'Precipitação', '0 mm');
    expectMetric(card, 'Vento', '0 km/h');
    expect(within(card).getByText('Céu limpo')).toBeInTheDocument();
  });
});
