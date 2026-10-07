import type { City } from '../lib/types';

const entries: [string, number, number, string, string, string][] = [
  ['Curitiba', -25.43, -49.27, 'Brasil', 'BR', 'Paraná'],
  ['São Paulo', -23.55, -46.63, 'Brasil', 'BR', 'São Paulo'],
  ['Rio de Janeiro', -22.91, -43.17, 'Brasil', 'BR', 'Rio de Janeiro'],
  ['Brasília', -15.79, -47.88, 'Brasil', 'BR', 'Distrito Federal'],
  ['Belo Horizonte', -19.92, -43.94, 'Brasil', 'BR', 'Minas Gerais'],
  ['Porto Alegre', -30.03, -51.23, 'Brasil', 'BR', 'Rio Grande do Sul'],
  ['Salvador', -12.97, -38.5, 'Brasil', 'BR', 'Bahia'],
  ['Recife', -8.05, -34.88, 'Brasil', 'BR', 'Pernambuco'],
  ['Manaus', -3.12, -60.02, 'Brasil', 'BR', 'Amazonas'],
  ['Fortaleza', -3.72, -38.54, 'Brasil', 'BR', 'Ceará'],
  ['Santa Maria', -29.68, -53.81, 'Brasil', 'BR', 'Rio Grande do Sul'],
  ['Santa Maria', -5.84, -35.69, 'Brasil', 'BR', 'Rio Grande do Norte'],
  ['Londrina', -23.31, -51.16, 'Brasil', 'BR', 'Paraná'],
  ['São João del-Rei', -21.14, -44.26, 'Brasil', 'BR', 'Minas Gerais'],
  ['Buenos Aires', -34.6, -58.38, 'Argentina', 'AR', 'Buenos Aires'],
  ['Canberra', -35.28, 149.13, 'Australia', 'AU', 'Australian Capital Territory'],
  ['Ottawa', 45.42, -75.7, 'Canada', 'CA', 'Ontario'],
  ['Beijing', 39.9, 116.41, 'China', 'CN', 'Beijing'],
  ['Paris', 48.86, 2.35, 'France', 'FR', 'Île-de-France'],
  ['Berlin', 52.52, 13.41, 'Germany', 'DE', 'Berlin'],
  ['New Delhi', 28.61, 77.21, 'India', 'IN', 'Delhi'],
  ['Jakarta', -6.21, 106.85, 'Indonesia', 'ID', 'Jakarta'],
  ['Rome', 41.9, 12.5, 'Italy', 'IT', 'Lazio'],
  ['Tokyo', 35.68, 139.69, 'Japan', 'JP', 'Tokyo'],
  ['Mexico City', 19.43, -99.13, 'Mexico', 'MX', 'Mexico City'],
  ['Moscow', 55.75, 37.62, 'Russia', 'RU', 'Moscow'],
  ['Riyadh', 24.69, 46.72, 'Saudi Arabia', 'SA', 'Riyadh'],
  ['Pretoria', -25.75, 28.19, 'South Africa', 'ZA', 'Gauteng'],
  ['Seoul', 37.57, 126.98, 'South Korea', 'KR', 'Seoul'],
  ['Ankara', 39.93, 32.86, 'Turkey', 'TR', 'Ankara'],
  ['London', 51.51, -0.13, 'United Kingdom', 'GB', 'England'],
  ['Washington, D.C.', 38.91, -77.04, 'United States', 'US', 'District of Columbia'],
];

export const mockCities: readonly City[] = entries.map(
  ([name, latitude, longitude, country, countryCode, region], index) => ({
    id: index + 1,
    name,
    latitude,
    longitude,
    country,
    countryCode,
    region,
  }),
);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function searchMockCities(term: string, signal?: AbortSignal): Promise<City[]> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Busca cancelada', 'AbortError'));
  }
  const query = normalize(term);
  if (!query) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(new DOMException('Busca cancelada', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve(
        mockCities
          .filter((city) => normalize(city.name).includes(query))
          .sort(
            (first, second) =>
              Number(second.countryCode === 'BR') - Number(first.countryCode === 'BR'),
          )
          .map((city) => ({ ...city })),
      );
    }, 300);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
