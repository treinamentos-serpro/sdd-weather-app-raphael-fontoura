type Freshness = 'fresh' | 'stale' | 'unknown';

const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const unavailable = 'Indisponível';

function calendarDate(year: number, month: number, day: number): Date | undefined {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return date;
}

function localParts(instant: number, timezone: string): number[] {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  return ['year', 'month', 'day', 'hour', 'minute', 'second'].map((type) =>
    Number(parts.find((part) => part.type === type)?.value),
  );
}

function wallTime(instant: number, timezone: string): number {
  const [year, month, day, hour, minute, second] = localParts(instant, timezone);
  const date = calendarDate(year, month, day);
  if (!date) return Number.NaN;
  date.setUTCHours(hour, minute, second);
  return date.getTime();
}

function resolveTimestamp(timestamp: string, timezone: string): number | undefined {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(
      timestamp,
    );
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second, fraction, offset] = match;
  const date = calendarDate(Number(year), Number(month), Number(day));
  if (!date || Number(hour) > 23 || Number(minute) > 59 || Number(second ?? 0) > 59) {
    return undefined;
  }
  date.setUTCHours(
    Number(hour),
    Number(minute),
    Number(second ?? 0),
    Number((fraction ?? '').padEnd(3, '0')),
  );
  const local = date.getTime();
  if (offset) {
    if (offset === 'Z') return local;
    const offsetHours = Number(offset.slice(1, 3));
    const offsetMinutes = Number(offset.slice(4, 6));
    if (offsetHours > 23 || offsetMinutes > 59) return undefined;
    const direction = offset[0] === '+' ? 1 : -1;
    return local - direction * (offsetHours * 60 + offsetMinutes) * minuteMs;
  }
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = Math.floor((local + hours * hourMs) / 1000) * 1000;
    offsets.add(wallTime(sample, timezone) - sample);
  }
  const candidates = [...offsets]
    .map((zoneOffset) => local - zoneOffset)
    .filter((candidate) => wallTime(candidate, timezone) === Math.floor(local / 1000) * 1000);
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function getLocalDates(timezone: string, reference: string | Date): string[] {
  try {
    const instant =
      reference instanceof Date ? reference.getTime() : resolveTimestamp(reference, timezone);
    if (instant === undefined || !Number.isFinite(instant)) return [];
    const [year, month, day] = localParts(instant, timezone);
    const date = calendarDate(year, month, day);
    if (!date) return [];
    return Array.from({ length: 5 }, () => {
      const result = date.toISOString().slice(0, 10);
      date.setUTCDate(date.getUTCDate() + 1);
      return result;
    });
  } catch {
    return [];
  }
}

export function validateForecastDates(
  dates: string[],
  timezone: string,
  reference: string | Date,
): boolean {
  const expected = getLocalDates(timezone, reference);
  return (
    expected.length === 5 &&
    dates.length === 5 &&
    dates.every((date, index) => date === expected[index])
  );
}

export function getFreshness(
  observedAt: string | undefined,
  timezone: string,
  fetchedAt: string,
): Freshness {
  if (!observedAt) return 'unknown';
  try {
    localParts(0, timezone);
    const observed = resolveTimestamp(observedAt, timezone);
    const fetched = resolveTimestamp(fetchedAt, timezone);
    if (observed === undefined || fetched === undefined || fetched < observed) return 'unknown';
    return fetched - observed > hourMs ? 'stale' : 'fresh';
  } catch {
    return 'unknown';
  }
}

export function formatObservationTime(observedAt: string | undefined, timezone: string): string {
  if (!observedAt) return unavailable;
  try {
    const instant = resolveTimestamp(observedAt, timezone);
    if (instant === undefined) return unavailable;
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    }).format(instant);
  } catch {
    return unavailable;
  }
}

export function formatForecastDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return unavailable;
  const parsed = calendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
  if (!parsed) return unavailable;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    weekday: 'short',
  }).format(parsed);
}
