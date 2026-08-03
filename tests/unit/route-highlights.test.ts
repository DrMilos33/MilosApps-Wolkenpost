import { copy } from '../../src/copy';
import { routeHighlights } from '../../src/lib/route-highlights';
import type { RoutePoint, RouteResult } from '../../src/types';

const SOURCE = {
  kind: 'demo' as const,
  label: 'Test',
  model: 'fixed',
  fetchedAt: '2026-08-03T00:00:00.000Z',
  forecastStart: '2026-08-03T00:00:00.000Z',
};

function point(latitude: number, longitude: number, hour: number): RoutePoint {
  return {
    latitude,
    longitude,
    time: Date.parse('2026-08-03T00:00:00.000Z') + hour * 3_600_000,
    speed: 40,
    bearing: 270,
  };
}

function result(points: RoutePoint[]): RouteResult {
  return {
    points,
    distanceKm: 900,
    durationHours: points.length - 1,
    averageSpeedKmh: 40,
    maxSpeedKmh: 40,
    source: SOURCE,
    objectType: 'cloud',
    startLabel: 'Berlin',
    endLabel: 'Paris',
  };
}

describe('route highlights', () => {
  it('identifies important places close to the flown route in chronological order', () => {
    const highlights = routeHighlights(result([
      point(52.5, 13.5, 0),
      point(51.313, 12.413, 1),
      point(50.966, 10.306, 2),
      point(50.941, 6.958, 3),
      point(48.858, 2.294, 4),
    ]), 'de', copy.de.map);

    expect(highlights.map((highlight) => highlight.name)).toEqual(expect.arrayContaining([
      'Völkerschlachtdenkmal',
      'Wartburg',
      'Kölner Dom',
      'Eiffelturm',
    ]));
    expect(highlights.every((highlight, index) =>
      index === 0 || highlight.progress >= highlights[index - 1].progress,
    )).toBe(true);
    expect(highlights.every((highlight) => highlight.distanceKm < 1)).toBe(true);
  });

  it('does not claim an overflight for distant places', () => {
    const highlights = routeHighlights(result([
      point(0, -30, 0),
      point(0, -20, 1),
      point(0, -10, 2),
    ]), 'en', copy.en.map);
    expect(highlights).toEqual([]);
  });
});
