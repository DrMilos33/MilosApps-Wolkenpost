import type { SupportedLanguage } from '../copy';
import { LANDMARKS } from '../data/landmarks';
import { localizePlace, PLACES } from '../data/places';
import type { Coordinate, RouteHighlight, RouteResult } from '../types';
import { haversineKm } from './geometry';

interface Candidate extends Coordinate {
  id: string;
  kind: RouteHighlight['kind'];
  name: string;
  radiusKm: number;
}

function closestPoint(result: RouteResult, candidate: Coordinate) {
  return result.points.reduce((closest, point, index) => {
    const distanceKm = haversineKm(point, candidate);
    return distanceKm < closest.distanceKm ? { distanceKm, index } : closest;
  }, { distanceKm: Number.POSITIVE_INFINITY, index: 0 });
}

export function routeHighlights(
  result: RouteResult | null,
  language: SupportedLanguage,
  placeCopy: Parameters<typeof localizePlace>[2],
  maximum = 5,
): RouteHighlight[] {
  if (!result || result.points.length < 2) return [];
  const candidates: Candidate[] = [
    ...LANDMARKS.map((landmark) => ({
      ...landmark,
      name: landmark.name[language],
      kind: 'landmark' as const,
      radiusKm: 70,
    })),
    ...PLACES.map((place) => ({
      ...place,
      name: localizePlace(place, language, placeCopy).name,
      kind: 'city' as const,
      radiusKm: 95,
    })),
  ];

  const highlights = candidates.flatMap<RouteHighlight>((candidate) => {
    const closest = closestPoint(result, candidate);
    const progress = closest.index / (result.points.length - 1);
    if (closest.distanceKm > candidate.radiusKm || progress < 0.06) return [];
    const point = result.points[closest.index];
    return [{
      id: candidate.id,
      kind: candidate.kind,
      name: candidate.name,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      distanceKm: closest.distanceKm,
      elapsedHours: Math.max(0, (point.time - result.points[0].time) / 3_600_000),
      progress,
    }];
  }).sort((a, b) => a.progress - b.progress || a.distanceKm - b.distanceKm);

  const deduplicated: RouteHighlight[] = [];
  for (const highlight of highlights) {
    const nearbyIndex = deduplicated.findIndex((entry) => haversineKm(entry, highlight) < 18);
    if (nearbyIndex >= 0) {
      if (highlight.kind === 'landmark' && deduplicated[nearbyIndex].kind === 'city') {
        deduplicated[nearbyIndex] = highlight;
      }
      continue;
    }
    deduplicated.push(highlight);
  }
  return deduplicated.slice(0, maximum);
}
