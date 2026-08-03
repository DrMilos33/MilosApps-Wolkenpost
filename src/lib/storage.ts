import { DEFAULT_PLACE } from '../data/places';
import type {
  MotionPreference,
  ObjectType,
  StoredState,
  ThemePreference,
  TravelPassport,
  WindBoost,
} from '../types';

const STORAGE_KEY = 'milosapps.cloud-post.state';
const OBJECT_TYPES: ObjectType[] = ['cloud', 'balloon', 'seed', 'paper-plane'];
const MOTION_VALUES: MotionPreference[] = ['system', 'full', 'reduced'];
const THEME_VALUES: ThemePreference[] = ['system', 'light', 'dark'];
const WIND_BOOST_VALUES: WindBoost[] = [1, 4, 10];

function storedPassport(value: unknown): TravelPassport {
  const passport = value && typeof value === 'object'
    ? value as Partial<TravelPassport>
    : {};
  return {
    countries: Array.isArray(passport.countries)
      ? [...new Set(passport.countries
          .filter((entry): entry is string => typeof entry === 'string' && /^[A-Z]{2}$/.test(entry)))]
          .slice(0, 80)
      : [],
    landmarks: Array.isArray(passport.landmarks)
      ? [...new Set(passport.landmarks
          .filter((entry): entry is string => typeof entry === 'string' && /^[a-z0-9-]+$/.test(entry)))]
          .slice(0, 120)
      : [],
    flights: typeof passport.flights === 'number' && Number.isFinite(passport.flights)
      ? Math.max(0, Math.min(9999, Math.floor(passport.flights)))
      : 0,
  };
}

export const DEFAULT_STATE: StoredState = {
  version: 1,
  drawing: [],
  objectType: 'cloud',
  lastStart: DEFAULT_PLACE,
  motion: 'system',
  theme: 'system',
  soundEnabled: false,
  windBoost: 1,
  travelPassport: storedPassport(null),
};

export function loadState(storage: Pick<Storage, 'getItem'> = localStorage): StoredState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (parsed.version !== 1) return structuredClone(DEFAULT_STATE);

    return {
      version: 1,
      drawing: Array.isArray(parsed.drawing)
        ? parsed.drawing
            .filter((stroke) => stroke && Array.isArray(stroke.points))
            .slice(-80)
            .map((stroke) => ({
              id: String(stroke.id),
              points: stroke.points
                .filter((point) =>
                  [point?.x, point?.y, point?.pressure].every(
                    (value) => typeof value === 'number' && Number.isFinite(value),
                  ),
                )
                .slice(0, 2000),
            }))
            .filter((stroke) => stroke.points.length > 0)
        : [],
      objectType: OBJECT_TYPES.includes(parsed.objectType as ObjectType)
        ? (parsed.objectType as ObjectType)
        : DEFAULT_STATE.objectType,
      lastStart: parsed.lastStart
        && typeof parsed.lastStart.latitude === 'number'
        && typeof parsed.lastStart.longitude === 'number'
        ? {
            id: String(parsed.lastStart.id ?? 'saved'),
            name: String(parsed.lastStart.name ?? 'Letzter Start'),
            region: String(parsed.lastStart.region ?? ''),
            country: String(parsed.lastStart.country ?? 'lokal gespeichert'),
            countryCode: String(parsed.lastStart.countryCode ?? ''),
            type: String(parsed.lastStart.type ?? 'saved'),
            latitude: Math.max(-85, Math.min(85, parsed.lastStart.latitude)),
            longitude: Math.max(-180, Math.min(180, parsed.lastStart.longitude)),
          }
        : DEFAULT_STATE.lastStart,
      motion: MOTION_VALUES.includes(parsed.motion as MotionPreference)
        ? (parsed.motion as MotionPreference)
        : DEFAULT_STATE.motion,
      theme: THEME_VALUES.includes(parsed.theme as ThemePreference)
        ? (parsed.theme as ThemePreference)
        : DEFAULT_STATE.theme,
      soundEnabled: parsed.soundEnabled === true,
      windBoost: WIND_BOOST_VALUES.includes(parsed.windBoost as WindBoost)
        ? (parsed.windBoost as WindBoost)
        : DEFAULT_STATE.windBoost,
      travelPassport: storedPassport(parsed.travelPassport),
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(
  state: StoredState,
  storage: Pick<Storage, 'setItem'> = localStorage,
): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(STORAGE_KEY);
}

export { STORAGE_KEY };
