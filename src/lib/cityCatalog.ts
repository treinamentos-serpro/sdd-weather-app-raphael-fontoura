import type { City } from './types';

const internationalCapitals = new Map<string, string>([
  ['buenos aires', 'AR'],
  ['canberra', 'AU'],
  ['ottawa', 'CA'],
  ['beijing', 'CN'],
  ['paris', 'FR'],
  ['berlin', 'DE'],
  ['new delhi', 'IN'],
  ['jakarta', 'ID'],
  ['rome', 'IT'],
  ['tokyo', 'JP'],
  ['mexico city', 'MX'],
  ['moscow', 'RU'],
  ['riyadh', 'SA'],
  ['pretoria', 'ZA'],
  ['seoul', 'KR'],
  ['ankara', 'TR'],
  ['london', 'GB'],
  ['washington d c', 'US'],
]);

const countryCodes = new Map<string, string>([
  ['argentina', 'AR'],
  ['australia', 'AU'],
  ['canada', 'CA'],
  ['china', 'CN'],
  ['france', 'FR'],
  ['germany', 'DE'],
  ['india', 'IN'],
  ['indonesia', 'ID'],
  ['italy', 'IT'],
  ['japan', 'JP'],
  ['mexico', 'MX'],
  ['russia', 'RU'],
  ['saudi arabia', 'SA'],
  ['south africa', 'ZA'],
  ['south korea', 'KR'],
  ['turkey', 'TR'],
  ['united kingdom', 'GB'],
  ['united states', 'US'],
]);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getCountryCode(city: City): string | undefined {
  if (city.countryCode) return city.countryCode.trim().toUpperCase();

  const country = normalize(city.country ?? '');
  if (country === 'brasil' || country === 'brazil') return 'BR';
  return countryCodes.get(country);
}

function isSupportedCity(city: City): boolean {
  const countryCode = getCountryCode(city);
  if (countryCode === 'BR') return true;

  const approvedCountryCode = internationalCapitals.get(normalize(city.name));
  return approvedCountryCode !== undefined && countryCode === approvedCountryCode;
}

function compareValues(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

export function filterAndSortCities(cities: readonly City[]): City[] {
  return cities.filter(isSupportedCity).sort((first, second) => {
    const firstIsBrazilian = getCountryCode(first) === 'BR';
    const secondIsBrazilian = getCountryCode(second) === 'BR';
    if (firstIsBrazilian !== secondIsBrazilian) return firstIsBrazilian ? -1 : 1;

    const nameOrder = compareValues(normalize(first.name), normalize(second.name));
    if (nameOrder !== 0) return nameOrder;
    return compareValues(normalize(first.country ?? ''), normalize(second.country ?? ''));
  });
}
