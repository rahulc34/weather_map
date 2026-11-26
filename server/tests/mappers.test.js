import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, POLLUTANTS } from '@smogsense/shared';
import {
  pickPollutants,
  roundCoord,
  toCities,
  toForecast,
  toPlaceName,
  toReport,
} from '../src/services/airQualityMappers.js';
import { normalizeError } from '../src/middleware/errorHandler.js';
import { HttpError } from '../src/utils/httpError.js';
import { summarizeIssues } from '../src/utils/zodIssues.js';
import { profileSchema } from '../src/utils/validation.js';
import { owmCurrent, owmForecast, owmGeocode, owmReverse, NOW_SEC } from './fixtures.js';

describe('airQualityMappers', () => {
  it('rounds coordinates to ~1 km cells', () => {
    expect(roundCoord(28.61394)).toBe(28.61);
  });

  it('maps cities and tolerates unexpected payloads', () => {
    expect(toCities(owmGeocode())[0]).toEqual({
      name: 'Delhi',
      state: 'Delhi',
      country: 'IN',
      lat: 28.6517,
      lon: 77.2219,
    });
    expect(toCities({ message: 'error' })).toEqual([]);
  });

  it('builds a readable place name', () => {
    expect(toPlaceName(owmReverse())).toBe('New Delhi, Delhi, IN');
    expect(toPlaceName([])).toBeNull();
  });

  it('keeps only displayed pollutants, rounded', () => {
    const result = pickPollutants({ pm2_5: 12.345, nh3: 4, co: 300 });
    expect(result).toEqual({ pm2_5: 12.3, co: 300 });
    expect(Object.keys(result).every((key) => POLLUTANTS.includes(key))).toBe(true);
  });

  it('limits the forecast to the next 24 hours', () => {
    const forecast = toForecast(owmForecast(), NOW_SEC * 1000);
    expect(forecast.hourly).toHaveLength(24);
    expect(forecast.windows.best.avgAqi).toBeLessThan(forecast.windows.worst.avgAqi);
    expect(toForecast(null)).toBeNull();
  });

  it('assembles a report and rejects empty measurements', () => {
    const report = toReport({ current: owmCurrent(), forecast: null, name: 'X', lat: 1, lon: 2 });
    expect(report.location).toEqual({ name: 'X', lat: 1, lon: 2 });
    expect(() =>
      toReport({ current: { list: [] }, forecast: null, name: null, lat: 0, lon: 0 }),
    ).toThrow(HttpError);
  });
});

describe('normalizeError', () => {
  it('maps body-parser errors to client-safe HttpErrors', () => {
    expect(normalizeError({ type: 'entity.parse.failed' })).toMatchObject({
      status: 400,
      code: 'INVALID_JSON',
    });
    expect(normalizeError({ type: 'entity.too.large' })).toMatchObject({ status: 413 });
  });

  it('passes other errors through unchanged', () => {
    const err = new Error('boom');
    expect(normalizeError(err)).toBe(err);
  });
});

describe('summarizeIssues', () => {
  it('reports at most five fields, naming the root when there is no path', () => {
    const result = profileSchema.safeParse({ commute: 'x', cookingFuel: 'y', heating: 'z', a: 1 });
    const issues = summarizeIssues(result.error, 'body');
    expect(issues.length).toBeLessThanOrEqual(5);
    expect(issues.map((i) => i.field)).toEqual(expect.arrayContaining(['commute', 'cookingFuel']));
  });
});

describe('shared contract', () => {
  it('server defaults equal the shared DEFAULT_PROFILE used by the client form', () => {
    expect(profileSchema.parse({})).toEqual(DEFAULT_PROFILE);
  });

  it('the client default profile passes server validation', () => {
    expect(profileSchema.safeParse(DEFAULT_PROFILE).success).toBe(true);
  });
});
