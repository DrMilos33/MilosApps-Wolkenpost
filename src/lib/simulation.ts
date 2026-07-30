import { nearestPlace } from '../data/places';
import type {
  Coordinate,
  ObjectType,
  RoutePoint,
  RouteResult,
  WindField,
  WindVector,
} from '../types';
import {
  clamp,
  destinationPoint,
  haversineKm,
  vectorBearing,
  wrapLongitude,
} from './geometry';

export interface ObjectProfile {
  label: string;
  level: '10m' | '925hPa' | '850hPa';
  hours: number;
  driftFactor: number;
  stepMinutes: number;
}

export const OBJECT_PROFILES: Record<ObjectType, ObjectProfile> = {
  cloud: { label: 'Wolke', level: '850hPa', hours: 18, driftFactor: 0.9, stepMinutes: 15 },
  balloon: { label: 'Ballon', level: '925hPa', hours: 12, driftFactor: 0.82, stepMinutes: 15 },
  seed: { label: 'Samen', level: '10m', hours: 3, driftFactor: 0.38, stepMinutes: 10 },
  'paper-plane': { label: 'Papierflieger', level: '10m', hours: 1.5, driftFactor: 0.52, stepMinutes: 5 },
};

function interpolateTime(node: WindField['nodes'][number], time: number): WindVector | null {
  if (!node.times.length || node.times.length !== node.vectors.length) return null;
  if (time <= node.times[0]) return node.vectors[0];
  const lastIndex = node.times.length - 1;
  if (time >= node.times[lastIndex]) return node.vectors[lastIndex];

  let upperIndex = node.times.findIndex((entry) => entry >= time);
  if (upperIndex <= 0) upperIndex = 1;
  const lowerIndex = upperIndex - 1;
  const span = node.times[upperIndex] - node.times[lowerIndex];
  const amount = span > 0 ? (time - node.times[lowerIndex]) / span : 0;
  const lower = node.vectors[lowerIndex];
  const upper = node.vectors[upperIndex];
  if (![lower.east, lower.north, upper.east, upper.north].every(Number.isFinite)) return null;

  return {
    east: lower.east + (upper.east - lower.east) * amount,
    north: lower.north + (upper.north - lower.north) * amount,
  };
}

function shortestLongitudeDifference(a: number, b: number): number {
  return Math.abs(wrapLongitude(a - b));
}

export function sampleWind(field: WindField, coordinate: Coordinate, time: number): WindVector | null {
  const candidates = field.nodes
    .map((node) => {
      const vector = interpolateTime(node, time);
      const latitudeDistance = node.latitude - coordinate.latitude;
      const longitudeDistance = shortestLongitudeDifference(node.longitude, coordinate.longitude)
        * Math.max(0.2, Math.cos((coordinate.latitude * Math.PI) / 180));
      const distanceSquared = latitudeDistance ** 2 + longitudeDistance ** 2;
      return { vector, distanceSquared };
    })
    .filter((candidate): candidate is { vector: WindVector; distanceSquared: number } =>
      candidate.vector !== null,
    )
    .sort((a, b) => a.distanceSquared - b.distanceSquared)
    .slice(0, 4);

  if (!candidates.length) return null;
  if (candidates[0].distanceSquared < 1e-8) return candidates[0].vector;

  let weightSum = 0;
  let east = 0;
  let north = 0;
  for (const candidate of candidates) {
    const weight = 1 / Math.max(candidate.distanceSquared, 0.0001);
    weightSum += weight;
    east += candidate.vector.east * weight;
    north += candidate.vector.north * weight;
  }

  return { east: east / weightSum, north: north / weightSum };
}

export function simulateRoute(
  start: Coordinate,
  startLabel: string,
  objectType: ObjectType,
  field: WindField,
): RouteResult {
  const profile = OBJECT_PROFILES[objectType];
  const firstTime = Math.min(...field.nodes.flatMap((node) => node.times));
  if (!Number.isFinite(firstTime)) throw new Error('Windfeld enthält keinen gültigen Zeitpunkt.');

  const stepSeconds = profile.stepMinutes * 60;
  const totalSteps = Math.round((profile.hours * 60) / profile.stepMinutes);
  const points: RoutePoint[] = [{
    ...start,
    time: firstTime,
    speed: 0,
  }];
  let current = { ...start };
  let previousVector: WindVector | null = null;
  let distanceKm = 0;
  let maxSpeedKmh = 0;

  for (let step = 1; step <= totalSteps; step += 1) {
    const time = firstTime + step * stepSeconds * 1000;
    const sampled = sampleWind(field, current, time);
    if (!sampled) throw new Error('Windfeld enthält eine Lücke auf der Route.');

    const capped: WindVector = {
      east: clamp(sampled.east, -80, 80),
      north: clamp(sampled.north, -80, 80),
    };
    const smoothed: WindVector = previousVector
      ? {
          east: previousVector.east * 0.25 + capped.east * 0.75,
          north: previousVector.north * 0.25 + capped.north * 0.75,
        }
      : capped;
    previousVector = smoothed;

    const speedMs = Math.hypot(smoothed.east, smoothed.north) * profile.driftFactor;
    const speedKmh = speedMs * 3.6;
    const stepDistance = (speedMs * stepSeconds) / 1000;
    const next = destinationPoint(current, stepDistance, vectorBearing(smoothed.east, smoothed.north));
    distanceKm += haversineKm(current, next);
    maxSpeedKmh = Math.max(maxSpeedKmh, speedKmh);
    current = next;
    points.push({ ...current, time, speed: speedKmh });
  }

  const endPlace = nearestPlace(current);
  return {
    points,
    distanceKm,
    durationHours: profile.hours,
    averageSpeedKmh: profile.hours > 0 ? distanceKm / profile.hours : 0,
    maxSpeedKmh,
    source: field.source,
    objectType,
    startLabel,
    endLabel: `nahe ${endPlace.name}`,
  };
}
