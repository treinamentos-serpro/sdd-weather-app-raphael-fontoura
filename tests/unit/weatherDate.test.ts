import { describe, expect, it } from 'vitest';
import {
  formatForecastDate,
  formatObservationTime,
  getFreshness,
  getLocalDates,
  validateForecastDates,
} from '../../src/lib/weatherDate';

describe('Datas locais da previsao', () => {
  it('comeca hoje no fuso distante do dispositivo e aceita Date', () => {
    const reference = '2026-12-31T12:30:00Z';
    const expected = ['2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04', '2027-01-05'];
    expect(getLocalDates('Pacific/Kiritimati', reference)).toEqual(expected);
    expect(getLocalDates('Pacific/Kiritimati', new Date(reference))).toEqual(expected);
    expect(getLocalDates('Pacific/Honolulu', reference)[0]).toBe('2026-12-31');
  });

  it.each([
    ['2026-03-07T23:30:00', ['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10', '2026-03-11']],
    ['2026-10-31T00:30:00', ['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']],
  ])('avanca pelo calendario nas transicoes DST: %s', (reference, expected) => {
    expect(getLocalDates('America/New_York', reference)).toEqual(expected);
  });

  it('inclui 29 de fevereiro em ano bissexto', () => {
    expect(getLocalDates('UTC', '2028-02-28T12:00:00Z')).toEqual([
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
      '2028-03-02',
      '2028-03-03',
    ]);
  });

  const dates = ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
  it('valida exatamente cinco datas consecutivas com inicio hoje', () => {
    expect(validateForecastDates(dates, 'America/Sao_Paulo', '2026-10-08T01:00:00Z')).toBe(true);
  });

  it.each([
    [],
    dates.slice(1),
    [...dates, '2026-10-12'],
    ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'],
    ['2026-10-07', '2026-10-08', '2026-10-10', '2026-10-11', '2026-10-12'],
    ['2026-10-08', '2026-10-07', ...dates.slice(2)],
    ['2026-10-07', '2026-10-07', ...dates.slice(2)],
    ['2026-10-7', ...dates.slice(1)],
  ])('rejeita quantidade, inicio, lacunas, ordem ou formato: %j', (...invalid) => {
    expect(validateForecastDates(invalid, 'UTC', '2026-10-07T12:00:00Z')).toBe(false);
  });

  it('rejeita referencia ou timezone invalidos sem lancar erro', () => {
    expect(getLocalDates('Invalid/Zone', '2026-10-07T12:00:00Z')).toEqual([]);
    expect(getLocalDates('UTC', new Date(Number.NaN))).toEqual([]);
    expect(getLocalDates('UTC', '2026-02-30T12:00:00Z')).toEqual([]);
    expect(validateForecastDates(dates, 'UTC', 'invalido')).toBe(false);
  });
});

describe('Atualidade da observacao', () => {
  it.each([
    ['2026-10-07T15:59:59Z', 'fresh'],
    ['2026-10-07T16:00:00Z', 'fresh'],
    ['2026-10-07T16:00:00.001Z', 'stale'],
  ])('limite de 60 minutos para consulta %s resulta em %s', (fetchedAt, expected) => {
    expect(getFreshness('2026-10-07T12:00:00', 'America/Sao_Paulo', fetchedAt)).toBe(expected);
  });

  it.each([
    ['2026-03-08T01:30:00', '2026-03-08T07:30:00Z'],
    ['2026-03-08T03:30:00', '2026-03-08T08:30:00Z'],
    ['2026-11-01T00:30:00', '2026-11-01T05:30:00Z'],
    ['2026-11-01T02:30:00', '2026-11-01T08:30:00Z'],
  ])('interpreta horario sem offset nos dois lados do DST: %s', (observedAt, fetchedAt) => {
    expect(getFreshness(observedAt, 'America/New_York', fetchedAt)).toBe('fresh');
    const later = new Date(new Date(fetchedAt).getTime() + 1).toISOString();
    expect(getFreshness(observedAt, 'America/New_York', later)).toBe('stale');
  });

  it('considera DST de meia hora e offset explicito', () => {
    expect(getFreshness('2026-10-04T02:45:00', 'Australia/Lord_Howe', '2026-10-03T16:45:00Z')).toBe(
      'fresh',
    );
    expect(
      getFreshness('2026-11-01T01:30:00-04:00', 'America/New_York', '2026-11-01T06:30:00Z'),
    ).toBe('fresh');
    expect(
      getFreshness('2026-11-01T01:30:00-05:00', 'America/New_York', '2026-11-01T07:30:00Z'),
    ).toBe('fresh');
  });

  it('interpreta tambem fetchedAt local no fuso informado', () => {
    expect(getFreshness('2026-10-07T12:00:00', 'Asia/Tokyo', '2026-10-07T13:00:00')).toBe('fresh');
  });

  it.each([
    undefined,
    '',
    'invalido',
    '2026-02-30T12:00:00',
    '2026-10-07T24:00:00',
    '2026-10-07T12:60:00',
    '2026-10-07T12:00:60Z',
    '2026-10-07T12:00:00+24:00',
    '2026-03-08T02:30:00',
    '2026-11-01T01:30:00',
  ])('nao alega atualidade para horario ausente, invalido ou ambiguo: %s', (observedAt) => {
    expect(getFreshness(observedAt, 'America/New_York', '2026-11-01T12:00:00Z')).toBe('unknown');
  });

  it('retorna unknown para consulta invalida, observacao futura ou fuso invalido', () => {
    expect(getFreshness('2026-10-07T12:00:00Z', 'UTC', 'invalido')).toBe('unknown');
    expect(getFreshness('2026-10-07T12:00:00Z', 'UTC', '2026-10-07T11:59:59Z')).toBe('unknown');
    expect(getFreshness('2026-10-07T12:00:00Z', 'Invalid/Zone', '2026-10-07T13:00:00Z')).toBe(
      'unknown',
    );
  });
});

describe('Formatacao para UI', () => {
  it('formata observacao em pt-BR com fuso explicito, sem usar o do dispositivo', () => {
    const formatted = formatObservationTime('2026-10-07T15:00:00Z', 'America/Sao_Paulo');
    expect(formatted).toMatch(/^12:00 /);
    expect(formatted).toBe(formatObservationTime('2026-10-07T12:00:00', 'America/Sao_Paulo'));
    expect(formatObservationTime('2026-10-07T15:00:00Z', 'Asia/Tokyo')).toMatch(/^00:00 /);
    expect(formatObservationTime('2026-03-08T03:30:00', 'America/New_York')).toMatch(/^03:30 /);
  });

  it.each([
    undefined,
    'invalido',
    '2026-03-08T02:30:00',
    '2026-11-01T01:30:00',
  ])('nao alega horario de observacao indisponivel: %s', (observedAt) => {
    expect(formatObservationTime(observedAt, 'America/New_York')).toBe('Indisponível');
  });

  it('formata dia, mes e dia da semana sem mudar a data', () => {
    expect(formatForecastDate('2026-10-07')).toBe('qua., 07/10');
    expect(formatForecastDate('2028-02-29')).toBe('ter., 29/02');
  });

  it.each([
    '',
    'invalido',
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-01',
    '2026-10-00',
    '2026-1-01',
    '2026-10-07T00:00:00Z',
  ])('rejeita data de previsao invalida: %s', (date) => {
    expect(formatForecastDate(date)).toBe('Indisponível');
  });

  it('retorna indisponivel para fuso invalido', () => {
    expect(formatObservationTime('2026-10-07T12:00:00Z', 'Invalid/Zone')).toBe('Indisponível');
  });
});
