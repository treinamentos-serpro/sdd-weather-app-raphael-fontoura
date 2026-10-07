import type { Unit } from '../lib/types';

export interface UnitToggleProps {
  unit?: Unit;
  onUnitChange: (unit: Unit) => void;
}

export default function UnitToggle({ unit = 'celsius', onUnitChange }: UnitToggleProps) {
  return (
    <fieldset className="min-w-0 max-w-full text-white">
      <legend className="sr-only">Unidade de temperatura</legend>
      <div className="inline-flex max-w-full gap-1 rounded-lg border border-white/40 bg-night-800/80 p-1 backdrop-blur-md">
        {(['celsius', 'fahrenheit'] as const).map((option) => (
          <label key={option} className="min-w-0 flex-1 cursor-pointer">
            <input
              type="radio"
              name="temperature-unit"
              value={option}
              checked={unit === option}
              onChange={() => {
                if (option !== unit) onUnitChange(option);
              }}
              className="peer sr-only"
            />
            <span className="flex min-h-11 items-center justify-center rounded-md px-4 font-medium hover:bg-white/10 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-400">
              <span aria-hidden="true">{option === 'celsius' ? '°C' : '°F'}</span>
              <span className="sr-only">{option === 'celsius' ? 'Celsius' : 'Fahrenheit'}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
