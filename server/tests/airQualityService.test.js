import { describe, expect, it } from 'vitest';
import { createAirQualityService } from '../src/services/airQualityService.js';
import { UpstreamError } from '../src/utils/httpError.js';
import { fakeFetch, owmCurrent, owmForecast, owmGeocode, owmReverse } from './fixtures.js';

const routes = () => ({
  '/data/2.5/air_pollution': () => owmCurrent(),
  '/data/2.5/air_pollution/forecast': () => owmForecast(),
  '/geo/1.0/direct': () => owmGeocode(),
  '/geo/1.0/reverse': () => owmReverse(),
});

const makeService = (fetchImpl, apiKey = 'test-key') =>
  createAirQualityService({
    apiKey,
    baseUrl: 'https://api.openweathermap.org',
    timeoutMs: 1000,
    ttlMs: 60_000,
    geocodeTtlMs: 60_000,
    fetchImpl,
  });

describe('airQualityService.getReport', () => {
  it('builds a full report with AQI, pollutants, forecast and place name', async () => {
    const service = makeService(fakeFetch(routes()));
    const report = await service.getReport(28.6139, 77.209);

    expect(report.location).toEqual({ name: 'New Delhi, Delhi, IN', lat: 28.61, lon: 77.21 });
    expect(report.aqi.category.key).toBe('very_poor');
    expect(report.aqi.owmIndex).toEqual({ value: 5, label: 'Very poor' });
    expect(report.pollutants).toMatchObject({ pm2_5: 180, pm10: 260 });
    expect(report.pollutants).not.toHaveProperty('nh3');
    expect(report.forecast.hourly).toHaveLength(24);
    expect(report.forecast.windows.best.avgAqi).toBeLessThan(report.forecast.windows.worst.avgAqi);
  });

  it('sends the API key to OpenWeather and caches by rounded location', async () => {
    const fetchImpl = fakeFetch(routes());
    const service = makeService(fetchImpl);
    await service.getReport(28.6139, 77.209);
    await service.getReport(28.6141, 77.2088); // rounds to the same cell
    const currentCalls = fetchImpl.calls.filter((u) => u.pathname === '/data/2.5/air_pollution');
    expect(currentCalls).toHaveLength(1);
    expect(currentCalls[0].searchParams.get('appid')).toBe('test-key');
  });

  it('degrades gracefully when forecast and reverse geocoding fail', async () => {
    const service = makeService(
      fakeFetch({
        ...routes(),
        '/data/2.5/air_pollution/forecast': () => new Error('network'),
        '/geo/1.0/reverse': () => ({ __status: 500 }),
      }),
    );
    const report = await service.getReport(28.61, 77.21);
    expect(report.forecast).toBeNull();
    expect(report.location.name).toBeNull();
    expect(report.aqi.value).toBeGreaterThan(0);
  });

  it('throws an UpstreamError when the current AQI call fails', async () => {
    const service = makeService(
      fakeFetch({ ...routes(), '/data/2.5/air_pollution': () => ({ __status: 401 }) }),
    );
    await expect(service.getReport(1, 1)).rejects.toBeInstanceOf(UpstreamError);
  });

  it('throws an UpstreamError on network failure without leaking the key', async () => {
    const service = makeService(
      fakeFetch({ ...routes(), '/data/2.5/air_pollution': () => new Error('ECONNRESET') }),
    );
    const err = await service.getReport(1, 1).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.message).not.toContain('test-key');
  });

  it('throws a 502 when OpenWeather returns no data', async () => {
    const service = makeService(
      fakeFetch({ ...routes(), '/data/2.5/air_pollution': () => ({ list: [] }) }),
    );
    await expect(service.getReport(1, 1)).rejects.toMatchObject({ status: 502 });
  });

  it('reports "not configured" when no API key is set', async () => {
    const service = makeService(fakeFetch(routes()), '');
    await expect(service.getReport(1, 1)).rejects.toMatchObject({ code: 'AQI_NOT_CONFIGURED' });
  });
});

describe('airQualityService.searchCities', () => {
  it('maps geocoding results and caches them', async () => {
    const fetchImpl = fakeFetch(routes());
    const service = makeService(fetchImpl);
    const results = await service.searchCities('Delhi');
    await service.searchCities('delhi');
    expect(results).toEqual([
      { name: 'Delhi', state: 'Delhi', country: 'IN', lat: 28.6517, lon: 77.2219 },
    ]);
    expect(fetchImpl.calls.filter((u) => u.pathname === '/geo/1.0/direct')).toHaveLength(1);
  });

  it('returns an empty list for unexpected payloads', async () => {
    const service = makeService(fakeFetch({ '/geo/1.0/direct': () => ({ message: 'odd' }) }));
    expect(await service.searchCities('Nowhere')).toEqual([]);
  });
});
