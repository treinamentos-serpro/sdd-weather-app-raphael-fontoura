import { useId } from 'react';
import { formatTemperature } from '../lib/temperature';
import type { Unit, WeatherData } from '../lib/types';
import { getWeatherLabel } from '../lib/weatherCodes';
import { formatObservationTime, getFreshness } from '../lib/weatherDate';

export interface CurrentWeatherProps {
  data: WeatherData;
  unit: Unit;
}

const weatherSymbols: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  53: '🌦️',
  55: '🌦️',
  56: '🌧️',
  57: '🌧️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  66: '🌧️',
  67: '🌧️',
  71: '🌨️',
  73: '🌨️',
  75: '🌨️',
  77: '🌨️',
  80: '🌧️',
  81: '🌧️',
  82: '🌧️',
  85: '🌨️',
  86: '🌨️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
};

export default function CurrentWeather({ data, unit }: CurrentWeatherProps) {
  const id = useId();
  const current = data.current;
  const freshness = getFreshness(current?.observedAt, data.timezone, data.fetchedAt);
  const condition =
    current?.conditionCode === undefined ? 'Indisponível' : getWeatherLabel(current.conditionCode);
  const symbol =
    current?.conditionCode === undefined ? undefined : weatherSymbols[current.conditionCode];
  const metrics = [
    { key: 'humidity', label: 'Umidade', value: current?.humidityPercent, suffix: '%' },
    { key: 'wind', label: 'Vento', value: current?.windKmh, suffix: ' km/h' },
    { key: 'pressure', label: 'Pressão', value: current?.pressureHpa, suffix: ' hPa' },
    { key: 'precipitation', label: 'Precipitação', value: current?.precipitationMm, suffix: ' mm' },
  ];

  return (
    <section aria-labelledby={`${id}-heading`} className="min-w-0 font-sans text-white">
      <header className="flex flex-wrap items-center gap-3">
        <h2 id={`${id}-heading`} className="text-xl font-semibold">
          {freshness === 'fresh' ? 'Clima atual' : 'Condições observadas'}
        </h2>
        {freshness !== 'fresh' && (
          <span className="max-w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-sun backdrop-blur-md">
            {freshness === 'stale' ? 'Desatualizado' : 'Atualidade não verificável'}
          </span>
        )}
      </header>
      <div className="my-6 min-w-0">
        <p className="text-sm text-accent-400">Temperatura</p>
        <p className="break-words text-4xl font-semibold sm:text-5xl">
          {formatTemperature(current?.temperatureC, unit)}
        </p>
        <p className="mt-2 flex items-center gap-2 text-lg">
          {symbol && <span aria-hidden="true">{symbol}</span>}
          <span>{condition}</span>
        </p>
      </div>
      <p className="mb-4 break-words text-sm text-white/80">
        Horário de observação: {formatObservationTime(current?.observedAt, data.timezone)}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 sm:grid-cols-4">
        {metrics.map(({ key, label, value, suffix }) => (
          <div key={key} className="min-w-0 border-t border-white/10 py-3">
            <dt className="break-words text-sm text-white/80">{label}</dt>
            <dd className="mt-1 break-words text-base font-medium">
              {value === undefined ? 'Indisponível' : `${value}${suffix}`}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
