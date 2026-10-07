import { expect, type Locator, type Page, test } from '@playwright/test';
import { getLocalDates } from '../../src/lib/weatherDate';

const reference = '2026-10-07T23:30:00Z';
const temperaturePattern = /^-?\d+ °[CF]$/;

const cityFixtures = [
  {
    id: 1859710,
    name: 'Curitiba',
    latitude: -25.43,
    longitude: -49.27,
    region: 'Paraná',
    country: 'Brasil',
    country_code: 'BR',
    timezone: 'America/Sao_Paulo',
    temperature: 18,
  },
  {
    id: 2988507,
    name: 'Paris',
    latitude: 48.85,
    longitude: 2.35,
    region: 'Île-de-France',
    country: 'France',
    country_code: 'FR',
    timezone: 'Europe/Paris',
    temperature: 27,
  },
  {
    id: 2078025,
    name: 'Canberra',
    latitude: -35.28,
    longitude: 149.13,
    region: 'Australian Capital Territory',
    country: 'Australia',
    country_code: 'AU',
    timezone: 'Australia/Sydney',
    temperature: 11,
  },
  {
    id: 1850147,
    name: 'Tokyo',
    latitude: 35.68,
    longitude: 139.69,
    region: 'Tokyo',
    country: 'Japan',
    country_code: 'JP',
    timezone: 'Asia/Tokyo',
    temperature: 22,
  },
  {
    id: 3450001,
    name: "São João d'El-Rei",
    latitude: -21.14,
    longitude: -44.26,
    region: 'Minas Gerais',
    country: 'Brasil',
    country_code: 'BR',
    timezone: 'America/Sao_Paulo',
    temperature: 19,
  },
];

interface MockOptions {
  failedSearches?: number;
  failedForecasts?: number;
  partialForecast?: boolean;
}

interface MockRequests {
  geocoding: string[];
  forecast: string[];
}

async function mockOpenMeteo(page: Page, options: MockOptions = {}): Promise<MockRequests> {
  const requests: MockRequests = { geocoding: [], forecast: [] };
  let failedSearches = options.failedSearches ?? 0;
  let failedForecasts = options.failedForecasts ?? 0;
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const hostname = url.hostname;

    if (hostname === 'geocoding-api.open-meteo.com') {
      requests.geocoding.push(url.toString());
      if (failedSearches > 0) {
        failedSearches -= 1;
        await route.fulfill({ status: 500, json: { error: true } });
        return;
      }
      const term = url.searchParams.get('name')?.trim().toLocaleLowerCase('pt-BR');
      const city = cityFixtures.find((fixture) => fixture.name.toLocaleLowerCase('pt-BR') === term);
      await route.fulfill({
        json: city ? { results: [city] } : { results: [] },
      });
      return;
    }

    if (hostname === 'api.open-meteo.com') {
      requests.forecast.push(url.toString());
      if (failedForecasts > 0) {
        failedForecasts -= 1;
        await route.fulfill({ status: 500, json: { error: true } });
        return;
      }
      const latitude = Number(url.searchParams.get('latitude'));
      const city = cityFixtures.find((fixture) => fixture.latitude === latitude);
      if (!city) {
        await route.abort();
        return;
      }
      const dates = getLocalDates(city.timezone, reference);
      if (options.partialForecast) {
        await route.fulfill({
          json: {
            timezone: city.timezone,
            current: {
              time: `${dates[0]}T12:00`,
              temperature_2m: null,
              weather_code: null,
              relative_humidity_2m: null,
              wind_speed_10m: null,
            },
            daily: {
              time: dates,
              temperature_2m_min: dates.map(() => null),
              weather_code: dates.map(() => null),
              precipitation_sum: dates.map(() => null),
            },
          },
        });
        return;
      }
      await route.fulfill({
        json: {
          timezone: city.timezone,
          current: {
            time: `${dates[0]}T12:00`,
            temperature_2m: city.temperature,
            weather_code: 0,
            relative_humidity_2m: 55,
            wind_speed_10m: 12,
            surface_pressure: 1013,
            precipitation: 0,
          },
          daily: {
            time: dates,
            temperature_2m_min: dates.map((_, index) => city.temperature - 4 + index),
            temperature_2m_max: dates.map((_, index) => city.temperature + 2 + index),
            weather_code: dates.map(() => 0),
            precipitation_probability_max: dates.map(() => 10),
            precipitation_sum: dates.map(() => 0),
            wind_speed_10m_max: dates.map(() => 18),
          },
        },
      });
      return;
    }

    if (hostname === 'open-meteo.com' || hostname.endsWith('.open-meteo.com')) {
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await page.clock.setFixedTime(new Date(reference));
  return requests;
}

async function selectCity(page: Page, term: string, accessibleName: string) {
  const input = page.getByRole('textbox', { name: 'Cidade' });
  await input.fill(term);
  await input.press('Enter');
  const suggestion = page.getByRole('button', { name: accessibleName, exact: true });
  await suggestion.focus();
  await expect(suggestion).toBeFocused();
  await suggestion.press('Enter');
  await expect(page.getByRole('heading', { name: term, exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Clima atual' })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Previsão diária' }).getByRole('listitem'),
  ).toHaveCount(5);
}

async function searchFor(page: Page, term: string) {
  const input = page.getByRole('textbox', { name: 'Cidade' });
  await input.fill(term);
  await input.press('Enter');
}

async function expectNoOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
}

async function forecastDates(forecast: Locator): Promise<string[]> {
  return forecast
    .locator('time')
    .evaluateAll((times) => times.map((time) => time.getAttribute('datetime') ?? ''));
}

async function nonTemperatureValues(page: Page) {
  const current = page.getByRole('region', { name: 'Clima atual' });
  const forecast = page.getByRole('region', { name: 'Previsão diária' });
  const days = forecast.getByRole('listitem');
  const daily = [];
  for (const day of await days.all()) {
    daily.push({
      condition: await day.locator('p').allTextContents(),
      precipitation: await day.getByText('Precipitação', { exact: true }).locator('..').innerText(),
      wind: await day.getByText('Vento', { exact: true }).locator('..').innerText(),
    });
  }
  return {
    city: await page.getByRole('main').getByRole('heading', { level: 2 }).first().innerText(),
    condition: await current
      .locator('p')
      .filter({ hasText: /Céu limpo|nublado|limpo/ })
      .innerText(),
    metrics: await current.locator('dl').innerText(),
    dates: await forecastDates(forecast),
    daily,
  };
}

test.describe('Integração Open-Meteo em viewport mobile', () => {
  test.use({ viewport: { width: 320, height: 800 } });

  test('busca Curitiba, troca unidade sem novas requisições e substitui por Paris', async ({
    page,
  }) => {
    const requests = await mockOpenMeteo(page);
    await page.goto('/');
    await expect(page.getByRole('radio', { name: 'Celsius', exact: true })).toBeChecked();
    await expect(page.getByRole('region', { name: 'Previsão diária' })).toHaveCount(0);
    await expectNoOverflow(page);

    await selectCity(page, 'Curitiba', 'Curitiba Paraná Brasil');
    const forecast = page.getByRole('region', { name: 'Previsão diária' });
    expect(await forecastDates(forecast)).toEqual(getLocalDates('America/Sao_Paulo', reference));
    await expect(
      page.getByRole('region', { name: 'Clima atual' }).getByText('18 °C'),
    ).toBeVisible();
    const temperatures = page.getByRole('main').getByText(temperaturePattern);
    await expect(temperatures).toHaveCount(11);
    const celsius = await temperatures.allTextContents();
    const preserved = await nonTemperatureValues(page);
    expect(requests.geocoding).toHaveLength(1);
    expect(requests.forecast).toHaveLength(1);
    expect(new URL(requests.geocoding[0]).searchParams.get('name')).toBe('Curitiba');
    expect(new URL(requests.forecast[0]).searchParams.get('latitude')).toBe('-25.43');
    await expectNoOverflow(page);

    await page.getByRole('radio', { name: 'Fahrenheit', exact: true }).locator('..').click();
    await expect(temperatures).toHaveText(
      celsius.map((value) => `${Math.round((Number.parseInt(value, 10) * 9) / 5 + 32)} °F`),
    );
    expect(await nonTemperatureValues(page)).toEqual(preserved);
    expect(requests.geocoding).toHaveLength(1);
    expect(requests.forecast).toHaveLength(1);
    await expectNoOverflow(page);

    await selectCity(page, 'Paris', 'Paris Île-de-France France');
    await expect(page.getByRole('heading', { name: 'Curitiba', exact: true })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Fahrenheit', exact: true })).toBeChecked();
    await expect(
      page.getByRole('region', { name: 'Clima atual' }).getByText('81 °F'),
    ).toBeVisible();
    await expect(temperatures).toHaveCount(11);
    expect(await forecastDates(forecast)).toEqual(getLocalDates('Europe/Paris', reference));
    expect(requests.geocoding).toHaveLength(2);
    expect(requests.forecast).toHaveLength(2);
    expect(new URL(requests.forecast[1]).searchParams.get('latitude')).toBe('48.85');
    await expectNoOverflow(page);
  });

  test('busca vazia e cidade internacional não aprovada não consultam forecast', async ({
    page,
  }) => {
    const requests = await mockOpenMeteo(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Buscar cidade' })).toBeDisabled();

    await searchFor(page, 'Atlantis');
    await expect(
      page.getByText('Nenhum local suportado encontrado', { exact: true }),
    ).toBeVisible();
    await searchFor(page, 'Tokyo');
    await expect(
      page.getByText('Nenhum local suportado encontrado', { exact: true }),
    ).toBeVisible();

    await expect(page.getByRole('region', { name: 'Previsão diária' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Clima atual' })).toHaveCount(0);
    await expect(page.getByText(temperaturePattern)).toHaveCount(0);
    expect(requests.geocoding).toHaveLength(2);
    expect(requests.forecast).toHaveLength(0);
    await expectNoOverflow(page);
  });

  test('termo com apenas espaços não inicia geocoding nem forecast', async ({ page }) => {
    const requests = await mockOpenMeteo(page);
    await page.goto('/');
    const input = page.getByRole('textbox', { name: 'Cidade' });
    await input.fill('   ');
    await expect(page.getByRole('button', { name: 'Buscar cidade' })).toBeDisabled();
    await input.press('Enter');

    expect(requests.geocoding).toHaveLength(0);
    expect(requests.forecast).toHaveLength(0);
    await expect(page.getByRole('region', { name: 'Clima atual' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Previsão diária' })).toHaveCount(0);
  });

  test('preserva caracteres especiais e aguarda a seleção antes do forecast', async ({ page }) => {
    const requests = await mockOpenMeteo(page);
    await page.goto('/');
    const term = "São João d'El-Rei";
    await searchFor(page, term);
    const suggestion = page.getByRole('button', {
      name: "São João d'El-Rei Minas Gerais Brasil",
      exact: true,
    });
    await expect(suggestion).toBeVisible();

    expect(requests.geocoding).toHaveLength(1);
    expect(new URL(requests.geocoding[0]).searchParams.get('name')).toBe(term);
    expect(requests.forecast).toHaveLength(0);

    await suggestion.click();
    await expect(page.getByRole('heading', { name: term, exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Clima atual' })).toBeVisible();
    expect(requests.forecast).toHaveLength(1);
    expect(new URL(requests.forecast[0]).searchParams.get('latitude')).toBe('-21.14');
  });

  test('marca campos meteorológicos ausentes e nulos como indisponíveis', async ({ page }) => {
    const requests = await mockOpenMeteo(page, { partialForecast: true });
    await page.goto('/');
    await selectCity(page, 'Paris', 'Paris Île-de-France France');

    const current = page.getByRole('region', { name: 'Clima atual' });
    const forecast = page.getByRole('region', { name: 'Previsão diária' });
    await expect(current.getByText('Indisponível', { exact: true })).toHaveCount(6);
    await expect(forecast.getByText('Indisponível', { exact: true })).toHaveCount(20);
    const renderedText = await page.getByRole('main').innerText();
    expect(renderedText).not.toMatch(/undefined|NaN|null/);
    expect(requests.geocoding).toHaveLength(1);
    expect(requests.forecast).toHaveLength(1);
  });

  test('permite repetir a busca pelo mesmo termo e o forecast pela mesma cidade', async ({
    page,
  }) => {
    const requests = await mockOpenMeteo(page, { failedSearches: 1, failedForecasts: 1 });
    await page.goto('/');
    await searchFor(page, 'Paris');
    await expect(page.getByRole('alert')).toContainText('Não foi possível buscar cidades');
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    const suggestion = page.getByRole('button', {
      name: 'Paris Île-de-France France',
      exact: true,
    });
    await expect(suggestion).toBeVisible();
    await suggestion.click();

    await expect(page.getByRole('alert')).toContainText(
      'Não foi possível carregar dados meteorológicos',
    );
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByRole('region', { name: 'Clima atual' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Paris', exact: true })).toBeVisible();

    expect(requests.geocoding).toHaveLength(2);
    expect(requests.geocoding.map((request) => new URL(request).searchParams.get('name'))).toEqual([
      'Paris',
      'Paris',
    ]);
    expect(requests.forecast).toHaveLength(2);
    expect(
      requests.forecast.map((request) => new URL(request).searchParams.get('latitude')),
    ).toEqual(['48.85', '48.85']);
  });
});

test.describe('Integração Open-Meteo em viewport desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('preserva navegação por teclado, foco visível e busca de Canberra', async ({ page }) => {
    const requests = await mockOpenMeteo(page);
    await page.goto('/');
    const celsius = page.getByRole('radio', { name: 'Celsius', exact: true });
    const fahrenheit = page.getByRole('radio', { name: 'Fahrenheit', exact: true });
    await page.keyboard.press('Tab');
    await expect(celsius).toBeFocused();
    const focusOutline = await celsius
      .locator('..')
      .locator('span')
      .first()
      .evaluate((label) => ({
        style: getComputedStyle(label).outlineStyle,
        width: getComputedStyle(label).outlineWidth,
      }));
    expect(focusOutline.style).not.toBe('none');
    expect(Number.parseFloat(focusOutline.width)).toBeGreaterThan(0);
    await page.keyboard.press('ArrowRight');
    await expect(fahrenheit).toBeFocused();
    await expect(fahrenheit).toBeChecked();
    await page.keyboard.press('ArrowLeft');
    await expect(celsius).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('textbox', { name: 'Cidade' })).toBeFocused();

    await selectCity(page, 'Canberra', 'Canberra Australian Capital Territory Australia');
    await expect(
      page.getByText('Australian Capital Territory · Australia', { exact: true }),
    ).toBeVisible();
    expect(await forecastDates(page.getByRole('region', { name: 'Previsão diária' }))).toEqual(
      getLocalDates('Australia/Sydney', reference),
    );
    expect(requests.geocoding).toHaveLength(1);
    expect(requests.forecast).toHaveLength(1);
    await expectNoOverflow(page);
  });
});
