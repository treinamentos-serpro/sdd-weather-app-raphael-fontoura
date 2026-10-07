import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import type { City, WeatherData } from '../../src/lib/types';
import { getLocalDates } from '../../src/lib/weatherDate';
import { searchCities } from '../../src/services/geocodingService';
import { getWeather } from '../../src/services/weatherService';

vi.mock('../../src/services/geocodingService', () => ({ searchCities: vi.fn() }));
vi.mock('../../src/services/weatherService', () => ({ getWeather: vi.fn() }));

const searchMock = vi.mocked(searchCities);
const weatherMock = vi.mocked(getWeather);
const fetchMock = vi.fn();
const curitiba: City = {
  name: 'Curitiba',
  latitude: -25.43,
  longitude: -49.27,
  region: 'Paraná',
  country: 'Brasil',
};
const paris: City = {
  name: 'Paris',
  latitude: 48.86,
  longitude: 2.35,
  region: 'Île-de-France',
  country: 'França',
};

function weather(city: City, temperatureC = 22): WeatherData {
  const fetchedAt = '2026-10-07T12:00:00Z';
  return {
    city,
    timezone: 'UTC',
    fetchedAt,
    current: {
      observedAt: fetchedAt,
      temperatureC,
      conditionCode: 0,
      humidityPercent: 65,
      windKmh: 12,
      pressureHpa: 1013,
      precipitationMm: 0,
    },
    forecast: getLocalDates('UTC', fetchedAt).map((date, index) => ({
      date,
      minimumC: 10.4 + index,
      maximumC: 20.6 + index,
      conditionCode: 3,
      precipitationMm: index,
      windKmh: 8 + index,
    })),
  };
}

function currentWeather() {
  return within(screen.getByRole('region', { name: 'Clima atual' }));
}

function deferredWeather() {
  let resolve!: (data: WeatherData | undefined) => void;
  const promise = new Promise<WeatherData | undefined>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function selectCity(user: ReturnType<typeof userEvent.setup>, city: City) {
  const input = screen.getByRole('textbox', { name: 'Cidade' });
  await user.clear(input);
  await user.type(input, city.name);
  await user.click(screen.getByRole('button', { name: 'Buscar cidade' }));
  await user.click(
    await screen.findByRole('button', {
      name: [city.name, city.region, city.country].filter(Boolean).join(' '),
    }),
  );
}

describe('App', () => {
  beforeEach(() => {
    searchMock.mockReset();
    weatherMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    searchMock.mockImplementation(async (term) => (term === paris.name ? [paris] : [curitiba]));
    weatherMock.mockImplementation(async (city) => weather(city));
  });

  afterEach(() => {
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('inicia sem cidade nem consulta e mantém a busca disponível', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Previsão do tempo' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Cidade' })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('Nenhuma cidade selecionada.');
    expect(screen.queryByText('Dados simulados')).not.toBeInTheDocument();
    expect(searchMock).not.toHaveBeenCalled();
    expect(weatherMock).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Celsius' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Fahrenheit' })).not.toBeChecked();
    expect(screen.queryByRole('region', { name: 'Clima atual' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Previsão diária' })).not.toBeInTheDocument();
  });

  it('busca, seleciona e apresenta clima em Celsius com todas as métricas', async () => {
    const user = userEvent.setup();
    render(<App />);
    await selectCity(user, curitiba);
    await screen.findByRole('region', { name: 'Clima atual' });
    expect(screen.getByRole('heading', { name: 'Curitiba' })).toHaveFocus();
    expect(currentWeather().getByText('22 °C')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Curitiba' })).toBeVisible();
    expect(screen.getByText('Paraná · Brasil')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Clima atual' })).toBeVisible();
    for (const value of ['Céu limpo', '65%', '12 km/h', '1013 hPa', '0 mm']) {
      expect(currentWeather().getByText(value)).toBeVisible();
    }
    expect(searchMock).toHaveBeenCalledWith('Curitiba', expect.any(AbortSignal));
    expect(weatherMock).toHaveBeenCalledWith(curitiba, expect.any(AbortSignal));
    expect(screen.queryByRole('list', { name: 'Sugestões de cidades' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Cidade' })).toBeEnabled();
  });

  it('troca cidade, limpa clima anterior no loading e substitui os dados', async () => {
    const pending = deferredWeather();
    weatherMock.mockResolvedValueOnce(weather(curitiba)).mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    render(<App />);
    await selectCity(user, curitiba);
    await screen.findByRole('region', { name: 'Clima atual' });
    await selectCity(user, paris);
    expect(screen.queryByRole('region', { name: 'Clima atual' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Previsão diária' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Curitiba' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Paris' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando dados meteorológicos...');
    expect(screen.getByRole('status').closest('[aria-busy="true"]')).toBeNull();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    await act(async () => pending.resolve(weather(paris, 16)));
    await screen.findByRole('region', { name: 'Clima atual' });
    expect(currentWeather().getByText('16 °C')).toBeVisible();
    expect(screen.getByText('Île-de-France · França')).toBeVisible();
    expect(weatherMock.mock.calls.map(([city]) => city)).toEqual([curitiba, paris]);
  });

  it('descarta resposta atrasada da cidade anterior', async () => {
    const pending = deferredWeather();
    weatherMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(weather(paris, 16));
    const user = userEvent.setup();
    render(<App />);
    await selectCity(user, curitiba);
    await selectCity(user, paris);
    await screen.findByRole('region', { name: 'Clima atual' });
    expect(weatherMock.mock.calls[0]?.[1]?.aborted).toBe(true);
    await act(async () => pending.resolve(weather(curitiba)));
    expect(currentWeather().getByText('16 °C')).toBeVisible();
    expect(currentWeather().queryByText('22 °C')).not.toBeInTheDocument();
  });

  it('retry da busca repete o termo sem consultar clima nem duplicar alertas', async () => {
    searchMock.mockRejectedValueOnce(new TypeError('Sem conexão'));
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('textbox', { name: 'Cidade' }), 'Curitiba');
    await user.click(screen.getByRole('button', { name: 'Buscar cidade' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível buscar cidades.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('list', { name: 'Sugestões de cidades' })).toBeVisible();
    expect(searchMock.mock.calls.map(([term]) => term)).toEqual(['Curitiba', 'Curitiba']);
    expect(weatherMock).not.toHaveBeenCalled();
  });

  it('retry do clima consulta novamente a cidade selecionada sem repetir busca', async () => {
    const pending = deferredWeather();
    weatherMock
      .mockRejectedValueOnce(new TypeError('Sem conexão'))
      .mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    render(<App />);
    await selectCity(user, curitiba);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar dados meteorológicos.',
    );
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando dados meteorológicos...');
    expect(screen.getByRole('heading', { name: 'Curitiba' })).toBeVisible();
    await act(async () => pending.resolve(weather(curitiba)));
    await screen.findByRole('region', { name: 'Clima atual' });
    expect(currentWeather().getByText('22 °C')).toBeVisible();
    expect(weatherMock.mock.calls.map(([city]) => city)).toEqual([curitiba, curitiba]);
    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it('preserva clima parcial e apresenta métricas ausentes como indisponíveis', async () => {
    weatherMock.mockResolvedValue({ ...weather(curitiba), current: { temperatureC: 0 } });
    const user = userEvent.setup();
    render(<App />);
    await selectCity(user, curitiba);
    expect(await screen.findByText('0 °C')).toBeVisible();
    const current = screen.getByRole('region', { name: 'Condições observadas' });
    expect(within(current).getAllByText('Indisponível')).toHaveLength(5);
    expect(weatherMock).toHaveBeenCalledTimes(1);
  });

  it('mostra busca vazia sem iniciar consulta meteorológica', async () => {
    searchMock.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('textbox', { name: 'Cidade' }), 'Atlantis');
    await user.click(screen.getByRole('button', { name: 'Buscar cidade' }));
    expect(await screen.findByText('Nenhum local suportado encontrado')).toBeVisible();
    expect(weatherMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Previsão diária' })).not.toBeInTheDocument();
  });

  it('mostra clima vazio mantendo a cidade selecionada e busca disponível', async () => {
    weatherMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<App />);
    await selectCity(user, curitiba);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Dados meteorológicos indisponíveis.'),
    );
    expect(screen.getByRole('heading', { name: 'Curitiba' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Cidade' })).toBeEnabled();
    expect(screen.queryByRole('region', { name: 'Clima atual' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Previsão diária' })).not.toBeInTheDocument();
  });

  it('alterna as 11 temperaturas e volta sem consultas nem alterações nos demais dados', async () => {
    const data = weather(curitiba);
    const original = structuredClone(data);
    weatherMock.mockResolvedValue(data);
    const user = userEvent.setup();
    render(<App />);
    await selectCity(user, curitiba);
    const forecast = within(await screen.findByRole('region', { name: 'Previsão diária' }));
    const days = forecast.getAllByRole('listitem');
    const preservedCurrent = ['Céu limpo', '65%', '12 km/h', '1013 hPa', '0 mm'];
    const units = [
      {
        name: 'Celsius',
        suffix: '°C',
        current: 22,
        minima: [10, 11, 12, 13, 14],
        maxima: [21, 22, 23, 24, 25],
      },
      {
        name: 'Fahrenheit',
        suffix: '°F',
        current: 72,
        minima: [51, 53, 54, 56, 58],
        maxima: [69, 71, 73, 74, 76],
      },
      {
        name: 'Celsius',
        suffix: '°C',
        current: 22,
        minima: [10, 11, 12, 13, 14],
        maxima: [21, 22, 23, 24, 25],
      },
    ];
    for (const unit of units) {
      await user.click(screen.getByRole('radio', { name: unit.name }));
      expect(screen.getByRole('radio', { name: unit.name })).toBeChecked();
      expect(currentWeather().getByText(`${unit.current} ${unit.suffix}`)).toBeVisible();
      expect(currentWeather().getAllByText(/^-?\d+ °[CF]$/)).toHaveLength(1);
      expect(forecast.getAllByText(/^-?\d+ °[CF]$/)).toHaveLength(10);
      for (const [index, day] of days.entries()) {
        expect(within(day).getByText(`${unit.minima[index]} ${unit.suffix}`)).toBeVisible();
        expect(within(day).getByText(`${unit.maxima[index]} ${unit.suffix}`)).toBeVisible();
        for (const value of ['Encoberto', `${index} mm`, `${8 + index} km/h`]) {
          expect(within(day).getByText(value)).toBeVisible();
        }
      }
      for (const value of preservedCurrent) {
        expect(currentWeather().getByText(value)).toBeVisible();
      }
      expect(screen.getByRole('heading', { name: 'Curitiba' })).toBeVisible();
      expect(screen.getByText('Paraná · Brasil')).toBeVisible();
      expect(data).toEqual(original);
      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(weatherMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  it('apresenta cinco datas locais consecutivas em um fuso distante', async () => {
    const fetchedAt = '2026-10-07T23:30:00Z';
    const dates = ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'];
    const data = weather(curitiba);
    weatherMock.mockResolvedValue({
      ...data,
      timezone: 'Pacific/Kiritimati',
      fetchedAt,
      forecast: data.forecast.map((day, index) => ({ ...day, date: dates[index] })),
    });
    const user = userEvent.setup();
    render(<App />);
    await selectCity(user, curitiba);
    const forecast = await screen.findByRole('region', { name: 'Previsão diária' });
    expect(within(forecast).getAllByRole('listitem')).toHaveLength(5);
    expect(Array.from(forecast.querySelectorAll('time'), (time) => time.dateTime)).toEqual(dates);
    await user.click(screen.getByRole('radio', { name: 'Fahrenheit' }));
    expect(Array.from(forecast.querySelectorAll('time'), (time) => time.dateTime)).toEqual(dates);
  });

  it('preserva previsão parcial e dias ausentes ao alternar unidade', async () => {
    const data = weather(curitiba);
    const firstDate = data.forecast[0].date;
    weatherMock.mockResolvedValue({
      ...data,
      forecast: [{ date: firstDate, minimumC: 0, precipitationMm: 0, windKmh: 0 }],
    });
    const user = userEvent.setup();
    render(<App />);
    await selectCity(user, curitiba);
    const forecast = within(await screen.findByRole('region', { name: 'Previsão diária' }));
    const days = forecast.getAllByRole('listitem');
    expect(days).toHaveLength(5);
    const firstDay = within(days[0]);
    expect(firstDay.getByText('0 °C')).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'Fahrenheit' }));
    expect(firstDay.getByText('32 °F')).toBeVisible();
    expect(firstDay.getByText('Indisponível')).toBeVisible();
    expect(firstDay.getByText('Condição indisponível')).toBeVisible();
    expect(firstDay.getByText('0 mm')).toBeVisible();
    expect(firstDay.getByText('0 km/h')).toBeVisible();
    expect(forecast.getAllByText('Dados do dia indisponíveis')).toHaveLength(4);
    await user.click(screen.getByRole('radio', { name: 'Celsius' }));
    expect(firstDay.getByText('0 °C')).toBeVisible();
    expect(forecast.getAllByText('Dados do dia indisponíveis')).toHaveLength(4);
    expect(weatherMock).toHaveBeenCalledTimes(1);
  });

  it('permite alternar antes da seleção e mantém a unidade ao trocar cidade', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Fahrenheit' }));
    expect(weatherMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Previsão diária' })).not.toBeInTheDocument();
    await selectCity(user, curitiba);
    await screen.findByRole('region', { name: 'Clima atual' });
    expect(currentWeather().getByText('72 °F')).toBeVisible();
    await selectCity(user, paris);
    await screen.findByRole('region', { name: 'Clima atual' });
    expect(screen.getByRole('heading', { name: 'Paris' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Fahrenheit' })).toBeChecked();
    expect(currentWeather().getByText('72 °F')).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: 'Previsão diária' })).getAllByText(/°F$/),
    ).toHaveLength(10);
    expect(weatherMock.mock.calls.map(([city]) => city)).toEqual([curitiba, paris]);
  });
});
