import { simulateRoute } from '../../src/lib/simulation';
import type { WindField, WindVector } from '../../src/types';

const START_TIME = Date.parse('2026-07-30T00:00:00Z');

function field(vector: WindVector, latitude = 52.5, longitude = 13.5): WindField {
  return {
    nodes: [{
      latitude,
      longitude,
      times: Array.from({ length: 40 }, (_, index) => START_TIME + index * 60 * 60 * 1000),
      vectors: Array.from({ length: 40 }, () => vector),
    }],
    source: {
      kind: 'demo',
      label: 'Test',
      model: 'fixed',
      fetchedAt: '2026-07-30T00:00:00.000Z',
      forecastStart: '2026-07-30T00:00:00.000Z',
    },
  };
}

describe('route simulation', () => {
  it('is reproducible for the same field and inputs', () => {
    const wind = field({ east: 12, north: 2 });
    const first = simulateRoute({ latitude: 52.5, longitude: 13.5 }, 'Berlin', 'cloud', wind);
    const second = simulateRoute({ latitude: 52.5, longitude: 13.5 }, 'Berlin', 'cloud', wind);
    expect(second).toEqual(first);
    expect(first.distanceKm).toBeGreaterThan(600);
    expect(first.points[0].speed).toBe(first.points[1].speed);
    expect(first.points[0].bearing).toBe(first.points[1].bearing);
  });

  it('stretches the playful route without relabelling the measured wind', () => {
    const wind = field({ east: 12, north: 2 });
    const real = simulateRoute({ latitude: 52.5, longitude: 13.5 }, 'Berlin', 'cloud', wind, 1);
    const playful = simulateRoute({ latitude: 52.5, longitude: 13.5 }, 'Berlin', 'cloud', wind, 2);

    expect(playful.distanceKm).toBeGreaterThan(real.distanceKm * 1.9);
    expect(playful.maxSpeedKmh).toBeCloseTo(real.maxSpeedKmh, 10);
    expect(playful.averageSpeedKmh).toBeCloseTo(real.averageSpeedKmh, 10);
    expect(playful.points[24].speed).toBeCloseTo(real.points[24].speed, 10);
    expect(playful.windBoost).toBe(2);
    expect(real.windBoost).toBe(1);
  });

  it('keeps a weak-wind route at the start', () => {
    const result = simulateRoute(
      { latitude: 52.5, longitude: 13.5 },
      'Berlin',
      'seed',
      field({ east: 0, north: 0 }),
    );
    expect(result.distanceKm).toBe(0);
    expect(result.points.every((point) => point.latitude === 52.5 && point.longitude === 13.5)).toBe(true);
  });

  it('caps extreme wind to a bounded physical input', () => {
    const result = simulateRoute(
      { latitude: 0, longitude: 0 },
      'Äquator',
      'cloud',
      field({ east: 400, north: -400 }, 0, 0),
    );
    expect(result.maxSpeedKmh).toBeLessThanOrEqual(Math.hypot(80, 80) * 3.6 * 0.9);
    expect(result.points).toHaveLength(73);
  });

  it('crosses the date line without invalid longitude values', () => {
    const result = simulateRoute(
      { latitude: 10, longitude: 179.5 },
      'Datumsgrenze',
      'cloud',
      field({ east: 25, north: 0 }, 10, 179.5),
    );
    expect(result.points.some((point) => point.longitude < -170)).toBe(true);
    expect(result.points.every((point) => point.longitude >= -180 && point.longitude <= 180)).toBe(true);
  });

  it('rejects a field without valid timestamps', () => {
    const broken = field({ east: 1, north: 1 });
    broken.nodes[0].times = [];
    broken.nodes[0].vectors = [];
    expect(() => simulateRoute({ latitude: 0, longitude: 0 }, 'Start', 'balloon', broken))
      .toThrow('keinen gültigen Zeitpunkt');
  });
});
