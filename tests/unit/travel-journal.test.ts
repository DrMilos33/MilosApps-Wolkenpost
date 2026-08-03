import { describe, expect, it } from 'vitest';
import { dailyMission, journeyEvent, missionComplete, updateTravelPassport } from '../../src/lib/travel-journal';
import type { RouteHighlight, RouteResult } from '../../src/types';

const result = {
  points: [
    { latitude: 52.5, longitude: 13.5, time: 0, speed: 10, bearing: 0 },
    { latitude: 49, longitude: 2.25, time: 1, speed: 10, bearing: 0 },
  ],
  distanceKm: 10,
  durationHours: 1,
  averageSpeedKmh: 10,
  maxSpeedKmh: 10,
  source: { kind: 'demo', label: 'demo', model: 'fixed', fetchedAt: '', forecastStart: '' },
  objectType: 'cloud',
  startLabel: 'Berlin',
  endLabel: 'Paris',
  windBoost: 10,
} satisfies RouteResult;

const landmark = {
  id: 'eiffel-tower', kind: 'landmark', name: 'Eiffelturm', latitude: 48.858,
  longitude: 2.294, distanceKm: 12, elapsedHours: 1, progress: 0.8,
} satisfies RouteHighlight;

describe('travel journal', () => {
  it('chooses a stable daily mission', () => {
    expect(dailyMission(new Date('2026-08-03T01:00:00Z')))
      .toBe(dailyMission(new Date('2026-08-03T23:00:00Z')));
  });

  it('records countries, landmarks and flights without duplicates', () => {
    const first = updateTravelPassport({ countries: [], landmarks: [], flights: 0 }, result, [landmark]);
    const second = updateTravelPassport(first, result, [landmark]);
    expect(second.countries).toEqual(['DE', 'FR']);
    expect(second.landmarks).toEqual(['eiffel-tower']);
    expect(second.flights).toBe(2);
  });

  it('evaluates each mission from visible flight state', () => {
    expect(missionComplete('adventure', result, [], false)).toBe(true);
    expect(missionComplete('landmark', result, [landmark], false)).toBe(true);
    expect(missionComplete('comparison', result, [], true)).toBe(true);
  });

  it('creates a reproducible event and prioritizes landmark moments', () => {
    expect(journeyEvent(result, [])).toBe(journeyEvent(result, []));
    expect(journeyEvent(result, [landmark])).toBe('postcard');
  });
});
