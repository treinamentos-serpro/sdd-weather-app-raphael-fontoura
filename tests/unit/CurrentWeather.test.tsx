import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CurrentWeather from '../../src/components/CurrentWeather';
import type { CurrentWeather as Observation, WeatherData } from '../../src/lib/types';

function makeData(current: Observation = {}): WeatherData {
  return {
    city: { name: 'Curitiba', latitude: -25.43, longitude: -49.27 },
    timezone: 'America/Sao_Paulo',
    fetchedAt: '2026-10-07T13:00:00Z',
    forecast: [],
    current: {
      observedAt: '2026-10-07T12:30:00Z',
      temperatureC: 20,
      conditionCode: 0,
      humidityPercent: 75,
      windKmh: 12.5,
      pressureHpa: 1013,
      precipitationMm: 0.5,
      ...current,
    },
  };
}

describe('CurrentWeather', () => {
  it('exibe todos os campos, unidades e simbolo decorativo em uma secao nomeada', () => {
    render(<CurrentWeather data={makeData()} unit="celsius" />);
    expect(screen.getByRole('region', { name: 'Clima atual' })).toBeInTheDocument();
    expect(screen.getByText('20 °C')).toBeInTheDocument();
    expect(screen.getByText('Céu limpo')).toBeInTheDocument();
    expect(screen.getByText('☀️')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Umidade').nextElementSibling).toHaveTextContent('75%');
    expect(screen.getByText('Vento').nextElementSibling).toHaveTextContent('12.5 km/h');
    expect(screen.getByText('Pressão').nextElementSibling).toHaveTextContent('1013 hPa');
    expect(screen.getByText('Precipitação').nextElementSibling).toHaveTextContent('0.5 mm');
    expect(screen.queryByText('Desatualizado')).not.toBeInTheDocument();
    expect(screen.queryByText('Atualidade não verificável')).not.toBeInTheDocument();
  });

  it('preserva valores zero em todos os campos', () => {
    render(
      <CurrentWeather
        data={makeData({
          temperatureC: 0,
          conditionCode: 0,
          humidityPercent: 0,
          windKmh: 0,
          pressureHpa: 0,
          precipitationMm: 0,
        })}
        unit="celsius"
      />,
    );
    for (const value of ['0 °C', 'Céu limpo', '0%', '0 km/h', '0 hPa', '0 mm']) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.queryByText('Indisponível')).not.toBeInTheDocument();
  });

  it.each([
    'temperatureC',
    'conditionCode',
    'humidityPercent',
    'windKmh',
    'pressureHpa',
    'precipitationMm',
  ] as const)('marca somente %s ausente como Indisponivel', (field) => {
    render(<CurrentWeather data={makeData({ [field]: undefined })} unit="celsius" />);
    expect(screen.getAllByText('Indisponível')).toHaveLength(1);
    expect(screen.queryByText('Condição indisponível')).not.toBeInTheDocument();
  });

  it('trata current ausente sem alegar atualidade', () => {
    const data = makeData();
    delete data.current;
    render(<CurrentWeather data={data} unit="celsius" />);
    expect(screen.getAllByText('Indisponível')).toHaveLength(6);
    expect(screen.getByText('Horário de observação: Indisponível')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Condições observadas' })).toBeInTheDocument();
    expect(screen.getByText('Atualidade não verificável')).toBeInTheDocument();
    expect(screen.queryByText('Clima atual')).not.toBeInTheDocument();
  });

  it('formata o instante no fuso dos dados, incluindo a identificacao do fuso', () => {
    const { rerender } = render(<CurrentWeather data={makeData()} unit="celsius" />);
    expect(screen.getByText(/^Horário de observação: 09:30 (?:BRT|GMT-3)$/)).toBeInTheDocument();
    rerender(<CurrentWeather data={{ ...makeData(), timezone: 'UTC' }} unit="celsius" />);
    expect(screen.getByText(/^Horário de observação: 12:30 UTC$/)).toBeInTheDocument();
  });

  it.each([
    ['2026-10-07T12:00:00Z', 'Clima atual', false],
    ['2026-10-07T11:59:59Z', 'Condições observadas', true],
  ] as const)('aplica o limite de 60 minutos para %s', (observedAt, heading, stale) => {
    render(<CurrentWeather data={makeData({ observedAt })} unit="celsius" />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByText('Desatualizado') !== null).toBe(stale);
    expect(screen.getByText('20 °C')).toBeInTheDocument();
    if (stale) expect(screen.queryByText('Clima atual')).not.toBeInTheDocument();
  });

  it.each([
    undefined,
    'invalido',
    '2026-10-07T13:01:00Z',
  ])('nao alega atualidade verificavel para timestamp %s', (observedAt) => {
    render(<CurrentWeather data={makeData({ observedAt })} unit="celsius" />);
    expect(screen.getByRole('heading', { name: 'Condições observadas' })).toBeInTheDocument();
    expect(screen.getByText('Atualidade não verificável')).toBeInTheDocument();
    expect(screen.queryByText('Clima atual')).not.toBeInTheDocument();
    expect(screen.queryByText('Desatualizado')).not.toBeInTheDocument();
    if (!observedAt || observedAt === 'invalido') {
      expect(screen.getByText('Horário de observação: Indisponível')).toBeInTheDocument();
    }
  });

  it('deriva Fahrenheit apenas na apresentacao sem alterar os dados Celsius', () => {
    const data = makeData();
    const { rerender } = render(<CurrentWeather data={data} unit="fahrenheit" />);
    expect(screen.getByText('68 °F')).toBeInTheDocument();
    expect(data.current?.temperatureC).toBe(20);
    rerender(<CurrentWeather data={data} unit="celsius" />);
    expect(screen.getByText('20 °C')).toBeInTheDocument();
  });
});
