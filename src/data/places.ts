import type { Coordinate, Place } from '../types';
import type { SupportedLanguage } from '../copy';
import { haversineKm } from '../lib/geometry';

function city(
  id: string,
  name: string,
  region: string,
  country: string,
  countryCode: string,
  latitude: number,
  longitude: number,
): Place {
  return { id, name, region, country, countryCode, latitude, longitude, type: 'city' };
}

export const PLACES: Place[] = [
  city('berlin', 'Berlin', 'Berlin', 'Deutschland', 'DE', 52.5, 13.5),
  city('hamburg', 'Hamburg', 'Hamburg', 'Deutschland', 'DE', 53.5, 10),
  city('munich', 'München', 'Bayern', 'Deutschland', 'DE', 48.25, 11.5),
  city('cologne', 'Köln', 'Nordrhein-Westfalen', 'Deutschland', 'DE', 51, 7),
  city('vienna', 'Wien', 'Wien', 'Österreich', 'AT', 48.25, 16.5),
  city('zurich', 'Zürich', 'Zürich', 'Schweiz', 'CH', 47.5, 8.5),
  city('paris', 'Paris', 'Île-de-France', 'Frankreich', 'FR', 49, 2.25),
  city('london', 'London', 'England', 'Vereinigtes Königreich', 'GB', 51.5, -0.25),
  city('oslo', 'Oslo', 'Oslo', 'Norwegen', 'NO', 60, 10.75),
  city('reykjavik', 'Reykjavík', 'Hauptstadtregion', 'Island', 'IS', 64.25, -22),
  city('lisbon', 'Lissabon', 'Lissabon', 'Portugal', 'PT', 38.75, -9.25),
  city('rome', 'Rom', 'Latium', 'Italien', 'IT', 42, 12.5),
  city('athens', 'Athen', 'Attika', 'Griechenland', 'GR', 38, 23.75),
  city('istanbul', 'Istanbul', 'Marmararegion', 'Türkei', 'TR', 41, 29),
  city('cairo', 'Kairo', 'Kairo', 'Ägypten', 'EG', 30, 31.25),
  city('cape-town', 'Kapstadt', 'Westkap', 'Südafrika', 'ZA', -34, 18.5),
  city('nairobi', 'Nairobi', 'Nairobi County', 'Kenia', 'KE', -1.25, 36.75),
  city('lagos', 'Lagos', 'Lagos', 'Nigeria', 'NG', 6.5, 3.5),
  city('tokyo', 'Tokio', 'Tokio', 'Japan', 'JP', 35.75, 139.75),
  city('seoul', 'Seoul', 'Seoul', 'Südkorea', 'KR', 37.5, 127),
  city('beijing', 'Peking', 'Peking', 'China', 'CN', 40, 116.5),
  city('delhi', 'Delhi', 'Delhi', 'Indien', 'IN', 28.5, 77.25),
  city('singapore', 'Singapur', 'Singapur', 'Singapur', 'SG', 1.25, 103.75),
  city('jakarta', 'Jakarta', 'Jakarta', 'Indonesien', 'ID', -6.25, 106.75),
  city('sydney', 'Sydney', 'New South Wales', 'Australien', 'AU', -34, 151.25),
  city('auckland', 'Auckland', 'Auckland', 'Neuseeland', 'NZ', -36.75, 174.75),
  city('honolulu', 'Honolulu', 'Hawaii', 'USA', 'US', 21.25, -157.75),
  city('vancouver', 'Vancouver', 'British Columbia', 'Kanada', 'CA', 49.25, -123),
  city('new-york', 'New York', 'New York', 'USA', 'US', 40.75, -74),
  city('san-francisco', 'San Francisco', 'Kalifornien', 'USA', 'US', 37.75, -122.5),
  city('mexico-city', 'Mexiko-Stadt', 'Ciudad de México', 'Mexiko', 'MX', 19.5, -99.25),
  city('havana', 'Havanna', 'La Habana', 'Kuba', 'CU', 23, -82.5),
  city('bogota', 'Bogotá', 'Bogotá D. C.', 'Kolumbien', 'CO', 4.75, -74),
  city('lima', 'Lima', 'Lima', 'Peru', 'PE', -12, -77),
  city('rio', 'Rio de Janeiro', 'Rio de Janeiro', 'Brasilien', 'BR', -23, -43.25),
  city('buenos-aires', 'Buenos Aires', 'Buenos Aires', 'Argentinien', 'AR', -34.5, -58.5),
];

export const DEFAULT_PLACE = PLACES[0];

const ENGLISH_PLACE_LABELS: Record<string, { name?: string; region?: string; country: string }> = {
  berlin: { country: 'Germany' },
  hamburg: { country: 'Germany' },
  munich: { name: 'Munich', region: 'Bavaria', country: 'Germany' },
  cologne: { name: 'Cologne', region: 'North Rhine-Westphalia', country: 'Germany' },
  vienna: { name: 'Vienna', country: 'Austria' },
  zurich: { name: 'Zurich', country: 'Switzerland' },
  paris: { country: 'France' },
  london: { country: 'United Kingdom' },
  oslo: { country: 'Norway' },
  reykjavik: { region: 'Capital Region', country: 'Iceland' },
  lisbon: { name: 'Lisbon', region: 'Lisbon', country: 'Portugal' },
  rome: { name: 'Rome', region: 'Lazio', country: 'Italy' },
  athens: { name: 'Athens', region: 'Attica', country: 'Greece' },
  istanbul: { region: 'Marmara Region', country: 'Türkiye' },
  cairo: { name: 'Cairo', region: 'Cairo', country: 'Egypt' },
  'cape-town': { name: 'Cape Town', region: 'Western Cape', country: 'South Africa' },
  nairobi: { country: 'Kenya' },
  lagos: { country: 'Nigeria' },
  tokyo: { name: 'Tokyo', region: 'Tokyo', country: 'Japan' },
  seoul: { country: 'South Korea' },
  beijing: { name: 'Beijing', region: 'Beijing', country: 'China' },
  delhi: { country: 'India' },
  singapore: { name: 'Singapore', region: 'Singapore', country: 'Singapore' },
  jakarta: { country: 'Indonesia' },
  sydney: { country: 'Australia' },
  auckland: { country: 'New Zealand' },
  honolulu: { country: 'USA' },
  vancouver: { country: 'Canada' },
  'new-york': { country: 'USA' },
  'san-francisco': { region: 'California', country: 'USA' },
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
    if (original) return {
      ...place,
      name: original.name,
      region: original.region,
      country: original.country,
      countryCode: original.countryCode,
      type: original.type,
    };
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
      region: english.region ?? original.region,
      country: english.country,
      countryCode: original.countryCode,
      type: original.type,
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
    `${place.name} ${place.region ?? ''} ${place.country} ${localizePlace(place, 'en').name} ${localizePlace(place, 'en').region ?? ''} ${localizePlace(place, 'en').country}`
      .toLocaleLowerCase(language)
      .includes(normalized),
  ).slice(0, 6).map((place) => localizePlace(place, language));
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
