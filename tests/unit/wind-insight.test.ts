import { windReadings, windStrength } from '../../src/lib/wind-insight';
import type { WindField, WindLevel, WindSnapshot, WindVector } from '../../src/types';

const START = Date.parse('2026-08-03T00:00:00.000Z');

function field(vector: WindVector): WindField {
  return {
    nodes: [{
      latitude: 52.5,
      longitude: 13.5,
      times: [START],
      vectors: [vector],
    }],
    source: {
      kind: 'live',
      label: 'Test',
      model: 'fixed',
      fetchedAt: '2026-08-03T00:00:00.000Z',
      forecastStart: '2026-08-03T00:00:00.000Z',
    },
  };
}

function snapshot(vectors: Record<WindLevel, WindVector>): WindSnapshot {
  return {
    fields: {
      '10m': field(vectors['10m']),
      '925hPa': field(vectors['925hPa']),
      '850hPa': field(vectors['850hPa']),
    },
    fetchedAt: '2026-08-03T00:00:00.000Z',
    forecastStart: '2026-08-03T00:00:00.000Z',
  };
}

describe('wind insight', () => {
  it('uses stable visual strength bands at their exact boundaries', () => {
    expect([0, 5.99, 6, 19.99, 20, 39.99, 40, 59.99, 60].map(windStrength)).toEqual([
      'calm', 'calm', 'light', 'light', 'lively', 'lively', 'strong', 'strong', 'very-strong',
    ]);
  });

  it('reports all three flight heights with speed and travel bearing', () => {
    const readings = windReadings(snapshot({
      '10m': { east: 0, north: 1 },
      '925hPa': { east: 3, north: 4 },
      '850hPa': { east: -10, north: 0 },
    }), { latitude: 52.5, longitude: 13.5 });

    expect(readings.map((reading) => reading.level)).toEqual(['10m', '925hPa', '850hPa']);
    expect(readings.map((reading) => Math.round(reading.speedKmh))).toEqual([4, 18, 36]);
    expect(readings.map((reading) => Math.round(reading.bearing))).toEqual([0, 37, 270]);
  });
});
