import { nearestPlace } from '../data/places';
import type { RouteHighlight, RouteResult, TravelPassport } from '../types';

export type DailyMissionId = 'adventure' | 'landmark' | 'comparison';
export type JourneyEventId = 'postcard' | 'gust' | 'glider';

export function dailyMission(date = new Date()): DailyMissionId {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  return (['adventure', 'landmark', 'comparison'] as const)[day % 3];
}

export function updateTravelPassport(
  passport: TravelPassport,
  result: RouteResult,
  highlights: RouteHighlight[],
): TravelPassport {
  const end = result.points.at(-1) ?? result.points[0];
  const countryCodes = [nearestPlace(result.points[0]).countryCode, nearestPlace(end).countryCode]
    .filter((entry): entry is string => Boolean(entry));
  const landmarkIds = highlights
    .filter((highlight) => highlight.kind === 'landmark')
    .map((highlight) => highlight.id);
  return {
    countries: [...new Set([...passport.countries, ...countryCodes])],
    landmarks: [...new Set([...passport.landmarks, ...landmarkIds])],
    flights: Math.min(9999, passport.flights + 1),
  };
}

export function missionComplete(
  mission: DailyMissionId,
  result: RouteResult | null,
  highlights: RouteHighlight[],
  compared: boolean,
): boolean {
  if (mission === 'adventure') return result?.windBoost === 10;
  if (mission === 'landmark') return highlights.some((highlight) => highlight.kind === 'landmark');
  return compared;
}

export function journeyEvent(result: RouteResult, highlights: RouteHighlight[]): JourneyEventId {
  if (highlights.some((highlight) => highlight.kind === 'landmark')) return 'postcard';
  const signature = `${result.source.forecastStart}|${result.startLabel}|${Math.round(result.distanceKm)}`;
  const checksum = [...signature].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return checksum % 2 === 0 ? 'gust' : 'glider';
}
