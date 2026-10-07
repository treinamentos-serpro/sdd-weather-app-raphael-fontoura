import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UnitToggle from '../../src/components/UnitToggle';
import type { Unit, WeatherData } from '../../src/lib/types';

function ControlledToggle({ onUnitChange }: { onUnitChange: (unit: Unit) => void }) {
  const [unit, setUnit] = useState<Unit>('celsius');
  return (
    <UnitToggle
      unit={unit}
      onUnitChange={(nextUnit) => {
        setUnit(nextUnit);
        onUnitChange(nextUnit);
      }}
    />
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('UnitToggle', () => {
  it('tem grupo e labels acessiveis, inicia em Celsius e nao emite ao montar', () => {
    const onUnitChange = vi.fn();
    render(<UnitToggle onUnitChange={onUnitChange} />);

    expect(screen.getByRole('group', { name: 'Unidade de temperatura' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Celsius' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Fahrenheit' })).not.toBeChecked();
    expect(onUnitChange).not.toHaveBeenCalled();
  });

  it('respeita unidade recebida e atualizacoes por props sem emitir callback', () => {
    const onUnitChange = vi.fn();
    const { rerender } = render(<UnitToggle unit="fahrenheit" onUnitChange={onUnitChange} />);

    expect(screen.getByRole('radio', { name: 'Fahrenheit' })).toBeChecked();
    rerender(<UnitToggle unit="celsius" onUnitChange={onUnitChange} />);
    expect(screen.getByRole('radio', { name: 'Celsius' })).toBeChecked();
    expect(onUnitChange).not.toHaveBeenCalled();
  });

  it('emite apenas a nova unidade uma vez e ignora cliques na unidade ativa', async () => {
    const user = userEvent.setup();
    const onUnitChange = vi.fn();
    render(<ControlledToggle onUnitChange={onUnitChange} />);

    await user.click(screen.getByRole('radio', { name: 'Celsius' }));
    expect(onUnitChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('radio', { name: 'Fahrenheit' }));
    expect(screen.getByRole('radio', { name: 'Fahrenheit' })).toBeChecked();
    expect(onUnitChange.mock.calls).toEqual([['fahrenheit']]);
    await user.click(screen.getByRole('radio', { name: 'Fahrenheit' }));
    expect(onUnitChange).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('radio', { name: 'Celsius' }));
    expect(onUnitChange.mock.calls).toEqual([['fahrenheit'], ['celsius']]);
  });

  it('permite Tab e ArrowRight/ArrowLeft com estado controlado pelo wrapper', async () => {
    const user = userEvent.setup();
    const onUnitChange = vi.fn();
    render(<ControlledToggle onUnitChange={onUnitChange} />);

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Celsius' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Fahrenheit' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Fahrenheit' })).toBeChecked();
    expect(onUnitChange.mock.calls).toEqual([['fahrenheit']]);
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Celsius' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Celsius' })).toBeChecked();
    expect(onUnitChange.mock.calls).toEqual([['fahrenheit'], ['celsius']]);
  });

  it('nao chama rede nem modifica fixture de cidade, clima atual ou previsao', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const requestMock = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => {});
    const fixture: WeatherData = {
      city: { name: 'Curitiba', latitude: -25.43, longitude: -49.27 },
      timezone: 'America/Sao_Paulo',
      current: {
        temperatureC: 20.4,
        conditionCode: 3,
        humidityPercent: 75,
        windKmh: 12,
        pressureHpa: 1012,
        precipitationMm: 0.5,
      },
      forecast: [{ date: '2026-10-07', minimumC: 10.2, maximumC: 23.6, conditionCode: 3 }],
      fetchedAt: '2026-10-07T12:00:00Z',
    };
    const snapshot = structuredClone(fixture);
    const onUnitChange = vi.fn();
    render(<ControlledToggle onUnitChange={onUnitChange} />);

    await user.click(screen.getByRole('radio', { name: 'Fahrenheit' }));
    await user.click(screen.getByRole('radio', { name: 'Celsius' }));

    expect(onUnitChange.mock.calls).toEqual([['fahrenheit'], ['celsius']]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
    expect(fixture).toEqual(snapshot);
  });
});
