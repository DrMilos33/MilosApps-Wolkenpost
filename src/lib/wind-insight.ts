import type { Coordinate, WindLevel, WindReading, WindSnapshot } from '../types';
import { vectorBearing } from './geometry';
import { sampleWind } from './simulation';

const LEVELS: WindLevel[] = ['10m', '925hPa', '850hPa'];

export function windStrength(speedKmh: number): WindReading['strength'] {
  if (speedKmh < 6) return 'calm';
  if (speedKmh < 20) return 'light';
  if (speedKmh < 40) return 'lively';
  if (speedKmh < 60) return 'strong';
  return 'very-strong';
}

export function windReadings(snapshot: WindSnapshot | null, coordinate: Coordinate): WindReading[] {
  if (!snapshot) return [];
  const time = Date.parse(snapshot.forecastStart);
  if (!Number.isFinite(time)) return [];
  return LEVELS.flatMap((level) => {
    const vector = sampleWind(snapshot.fields[level], coordinate, time);
    if (!vector) return [];
    const speedKmh = Math.hypot(vector.east, vector.north) * 3.6;
    return [{
      level,
      speedKmh,
      bearing: vectorBearing(vector.east, vector.north),
      strength: windStrength(speedKmh),
    }];
  });
}
