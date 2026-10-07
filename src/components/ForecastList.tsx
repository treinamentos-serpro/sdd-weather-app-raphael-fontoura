import { formatTemperature } from '../lib/temperature';
import type { Unit, WeatherData } from '../lib/types';
import { getWeatherLabel } from '../lib/weatherCodes';
import { formatForecastDate, getLocalDates } from '../lib/weatherDate';

export interface ForecastListProps {
  data: WeatherData;
  unit: Unit;
}

const unavailableSlots = ['slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5'];

export default function ForecastList({ data, unit }: ForecastListProps) {
  const dates = getLocalDates(data.timezone, data.fetchedAt);
  const slots = dates.length === 5 ? dates : unavailableSlots;

  return (
    <section aria-label="Previsão diária" className="min-w-0 font-sans text-white">
      <h2 className="mb-4 text-lg font-semibold">Previsão de 5 dias</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {slots.map((key) => {
          const date = dates.length === 5 ? key : undefined;
          const day = date ? data.forecast.find((item) => item.date === date) : undefined;
          return (
            <li
              key={key}
              className="min-w-0 break-words rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-md"
            >
              <h3 className="mb-3 text-sm font-semibold text-accent-400">
                {date ? (
                  <time dateTime={date}>{formatForecastDate(date)}</time>
                ) : (
                  'Data indisponível'
                )}
              </h3>
              {!day && <p className="mb-3 text-sm">Dados do dia indisponíveis</p>}
              <p className="mb-3 text-sm">
                <span aria-hidden="true">☁ </span>
                {getWeatherLabel(day?.conditionCode)}
              </p>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt>Mínima</dt>
                  <dd className="text-base font-semibold">
                    {formatTemperature(day?.minimumC, unit)}
                  </dd>
                </div>
                <div>
                  <dt>Máxima</dt>
                  <dd className="text-base font-semibold text-sun">
                    {formatTemperature(day?.maximumC, unit)}
                  </dd>
                </div>
                <div>
                  <dt>
                    <span aria-hidden="true">☂ </span>
                    <span>Precipitação</span>
                  </dt>
                  <dd>
                    {day?.precipitationMm === undefined
                      ? 'Indisponível'
                      : `${day.precipitationMm} mm`}
                  </dd>
                </div>
                <div>
                  <dt>Vento</dt>
                  <dd>{day?.windKmh === undefined ? 'Indisponível' : `${day.windKmh} km/h`}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
