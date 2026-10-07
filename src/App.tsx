import { useState } from 'react';
import CitySearch from './components/CitySearch';
import CurrentWeather from './components/CurrentWeather';
import ForecastList from './components/ForecastList';
import QueryState from './components/QueryState';
import UnitToggle from './components/UnitToggle';
import { useCitySearch } from './hooks/useCitySearch';
import { useWeather } from './hooks/useWeather';
import type { City, Unit } from './lib/types';

export default function App() {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [unit, setUnit] = useState<Unit>('celsius');
  const citySearch = useCitySearch();
  const weather = useWeather(selectedCity);
  const locationDetails = [selectedCity?.region, selectedCity?.country].filter(Boolean).join(' · ');

  function handleSelect(city: City): void {
    setSelectedCity(citySearch.selectCity(city));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-night-800 to-night-900 font-sans text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-8">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden="true" className="text-sun">
              ☀
            </span>
            Tempo
          </p>
        </div>
      </header>

      <main className="mx-auto min-w-0 max-w-5xl space-y-8 px-4 py-8 sm:px-8 sm:py-10">
        <section aria-labelledby="page-title" className="min-w-0 space-y-6">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
            <h1 id="page-title" className="break-words text-2xl font-semibold sm:text-3xl">
              Previsão do tempo
            </h1>
            <UnitToggle unit={unit} onUnitChange={setUnit} />
          </div>
          <CitySearch
            term={citySearch.term}
            state={citySearch.state}
            onTermChange={citySearch.setTerm}
            onSearch={citySearch.search}
            onSelect={handleSelect}
            onRetry={citySearch.retry}
          />
        </section>

        <div className="min-h-80 min-w-0 space-y-6 border-t border-white/10 pt-6">
          {selectedCity ? (
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <h2 className="text-xl font-semibold text-accent-400">{selectedCity.name}</h2>
              {locationDetails && <p className="mt-1 text-sm text-white/80">{locationDetails}</p>}
            </div>
          ) : (
            <p role="status" className="text-white/80">
              Nenhuma cidade selecionada.
            </p>
          )}

          {weather.state.status === 'success' ? (
            <>
              <CurrentWeather data={weather.state.data} unit={unit} />
              <div className="min-w-0 border-t border-white/10 pt-6">
                <ForecastList data={weather.state.data} unit={unit} />
              </div>
            </>
          ) : (
            <QueryState state={weather.state} operation="weather" onRetry={weather.retry} />
          )}
        </div>
      </main>
    </div>
  );
}
