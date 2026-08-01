import type { Coordinate, Place } from '../types';
import type { SupportedLanguage } from '../copy';
import { haversineKm } from '../lib/geometry';

export const PLACES: Place[] = [
  { id: 'berlin', name: 'Berlin', country: 'Deutschland', latitude: 52.5, longitude: 13.5 },
  { id: 'hamburg', name: 'Hamburg', country: 'Deutschland', latitude: 53.5, longitude: 10 },
  { id: 'munich', name: 'München', country: 'Deutschland', latitude: 48.25, longitude: 11.5 },
  { id: 'cologne', name: 'Köln', country: 'Deutschland', latitude: 51, longitude: 7 },
  { id: 'vienna', name: 'Wien', country: 'Österreich', latitude: 48.25, longitude: 16.5 },
  { id: 'zurich', name: 'Zürich', country: 'Schweiz', latitude: 47.5, longitude: 8.5 },
  { id: 'paris', name: 'Paris', country: 'Frankreich', latitude: 49, longitude: 2.25 },
  { id: 'london', name: 'London', country: 'Vereinigtes Königreich', latitude: 51.5, longitude: -0.25 },
  { id: 'oslo', name: 'Oslo', country: 'Norwegen', latitude: 60, longitude: 10.75 },
  { id: 'reykjavik', name: 'Reykjavík', country: 'Island', latitude: 64.25, longitude: -22 },
  { id: 'lisbon', name: 'Lissabon', country: 'Portugal', latitude: 38.75, longitude: -9.25 },
  { id: 'rome', name: 'Rom', country: 'Italien', latitude: 42, longitude: 12.5 },
  { id: 'athens', name: 'Athen', country: 'Griechenland', latitude: 38, longitude: 23.75 },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkei', latitude: 41, longitude: 29 },
  { id: 'cairo', name: 'Kairo', country: 'Ägypten', latitude: 30, longitude: 31.25 },
  { id: 'cape-town', name: 'Kapstadt', country: 'Südafrika', latitude: -34, longitude: 18.5 },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenia', latitude: -1.25, longitude: 36.75 },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', latitude: 6.5, longitude: 3.5 },
  { id: 'tokyo', name: 'Tokio', country: 'Japan', latitude: 35.75, longitude: 139.75 },
  { id: 'seoul', name: 'Seoul', country: 'Südkorea', latitude: 37.5, longitude: 127 },
  { id: 'beijing', name: 'Peking', country: 'China', latitude: 40, longitude: 116.5 },
  { id: 'delhi', name: 'Delhi', country: 'Indien', latitude: 28.5, longitude: 77.25 },
  { id: 'singapore', name: 'Singapur', country: 'Singapur', latitude: 1.25, longitude: 103.75 },
  { id: 'jakarta', name: 'Jakarta', country: 'Indonesien', latitude: -6.25, longitude: 106.75 },
  { id: 'sydney', name: 'Sydney', country: 'Australien', latitude: -34, longitude: 151.25 },
  { id: 'auckland', name: 'Auckland', country: 'Neuseeland', latitude: -36.75, longitude: 174.75 },
  { id: 'honolulu', name: 'Honolulu', country: 'USA', latitude: 21.25, longitude: -157.75 },
  { id: 'vancouver', name: 'Vancouver', country: 'Kanada', latitude: 49.25, longitude: -123 },
  { id: 'new-york', name: 'New York', country: 'USA', latitude: 40.75, longitude: -74 },
  { id: 'san-francisco', name: 'San Francisco', country: 'USA', latitude: 37.75, longitude: -122.5 },
  { id: 'mexico-city', name: 'Mexiko-Stadt', country: 'Mexiko', latitude: 19.5, longitude: -99.25 },
  { id: 'havana', name: 'Havanna', country: 'Kuba', latitude: 23, longitude: -82.5 },
  { id: 'bogota', name: 'Bogotá', country: 'Kolumbien', latitude: 4.75, longitude: -74 },
  { id: 'lima', name: 'Lima', country: 'Peru', latitude: -12, longitude: -77 },
  { id: 'rio', name: 'Rio de Janeiro', country: 'Brasilien', latitude: -23, longitude: -43.25 },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentinien', latitude: -34.5, longitude: -58.5 },
];

export const DEFAULT_PLACE = PLACES[0];

const ENGLISH_PLACE_LABELS: Record<string, { name?: string; country: string }> = {
  berlin: { country: 'Germany' },
  hamburg: { country: 'Germany' },
  munich: { name: 'Munich', country: 'Germany' },
  cologne: { name: 'Cologne', country: 'Germany' },
  vienna: { name: 'Vienna', country: 'Austria' },
  zurich: { name: 'Zurich', country: 'Switzerland' },
  paris: { country: 'France' },
  london: { country: 'United Kingdom' },
  oslo: { country: 'Norway' },
  reykjavik: { country: 'Iceland' },
  lisbon: { name: 'Lisbon', country: 'Portugal' },
  rome: { name: 'Rome', country: 'Italy' },
  athens: { name: 'Athens', country: 'Greece' },
  istanbul: { country: 'Türkiye' },
  cairo: { name: 'Cairo', country: 'Egypt' },
  'cape-town': { name: 'Cape Town', country: 'South Africa' },
  nairobi: { country: 'Kenya' },
  lagos: { country: 'Nigeria' },
  tokyo: { name: 'Tokyo', country: 'Japan' },
  seoul: { country: 'South Korea' },
  beijing: { name: 'Beijing', country: 'China' },
  delhi: { country: 'India' },
  singapore: { name: 'Singapore', country: 'Singapore' },
  jakarta: { country: 'Indonesia' },
  sydney: { country: 'Australia' },
  auckland: { country: 'New Zealand' },
  honolulu: { country: 'USA' },
  vancouver: { country: 'Canada' },
  'new-york': { country: 'USA' },
  'san-francisco': { country: 'USA' },
  'mexico-city': { name: 'Mexico City', country: 'Mexico' },
  havana: { name: 'Havana', country: 'Cuba' },
  bogota: { country: 'Colombia' },
  lima: { country: 'Peru' },
  rio: { country: 'Brazil' },
  'buenos-aires': { country: 'Argentina' },
};

function canonicalPlaceId(place: Place): string | undefined {
  if (ENGLISH_PLACE_LABELS[place.id]) return place.id;
  return PLACES.find((candidate) => place.id.startsWith(`near-${candidate.id}-`))?.id;
}

export function localizePlace(
  place: Place,
  language: SupportedLanguage,
  genericLabels?: { point: string; lastStart: string; storedLocally: string },
): Place {
  if (language === 'de') {
    const original = PLACES.find((candidate) => candidate.id === canonicalPlaceId(place));
    if (original) return { ...place, name: original.name, country: original.country };
    if (place.id.startsWith('map-') && genericLabels) {
      return { ...place, name: genericLabels.point };
    }
    return place;
  }

  const id = canonicalPlaceId(place);
  const original = PLACES.find((candidate) => candidate.id === id);
  const english = id ? ENGLISH_PLACE_LABELS[id] : undefined;
  if (original && english) {
    return {
      ...place,
      name: english.name ?? original.name,
      country: english.country,
    };
  }
  if (genericLabels && place.id.startsWith('map-')) {
    return { ...place, name: genericLabels.point };
  }
  if (genericLabels && place.id === 'saved') {
    return { ...place, name: genericLabels.lastStart, country: genericLabels.storedLocally };
  }
  return place;
}

export function searchPlaces(query: string, language: SupportedLanguage = 'de'): Place[] {
  const normalized = query.trim().toLocaleLowerCase(language);
  if (!normalized) {
    return PLACES.slice(0, 6).map((place) => localizePlace(place, language));
  }
  return PLACES.filter((place) =>
    `${place.name} ${place.country} ${localizePlace(place, 'en').name} ${localizePlace(place, 'en').country}`
      .toLocaleLowerCase(language)
      .includes(normalized),
  ).slice(0, 8).map((place) => localizePlace(place, language));
}

export function nearestPlace(coordinate: Coordinate): Place {
  return PLACES.reduce((nearest, place) =>
    haversineKm(coordinate, place) < haversineKm(coordinate, nearest) ? place : nearest,
  );
}

export function coarseCoordinate(coordinate: Coordinate): Coordinate {
  return {
    latitude: Math.round(coordinate.latitude * 4) / 4,
    longitude: Math.round(coordinate.longitude * 4) / 4,
  };
}
