import type { Coordinate, ObjectType, WindField, WindNode, WindVector } from '../types';
import { clamp, wrapLongitude } from './geometry';
import { OBJECT_PROFILES } from './simulation';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_ATTRIBUTION_URL = 'https://open-meteo.com/';
export const DEMO_SNAPSHOT = '2026-07-30T00:00:00.000Z';

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  hourly?: Record<string, Array<string | number | null>>;
}

export class WindRequestError extends Error {
  constructor(
    message: string,
    public readonly kind: 'offline' | 'timeout' | 'network' | 'invalid',
  ) {
    super(message);
  }
}

export function meteorologicalWindVector(speedMs: number, directionDegrees: number): WindVector {
  const direction = (directionDegrees * Math.PI) / 180;
  return {
    east: -speedMs * Math.sin(direction),
    north: -speedMs * Math.cos(direction),
  };
}

function gridAround(start: Coordinate): Coordinate[] {
  const latitudeOffsets = [-8, 0, 8];
  const longitudeSpan = Math.min(
    28,
    10 / Math.max(0.35, Math.cos((start.latitude * Math.PI) / 180)),
  );
  const longitudeOffsets = [-longitudeSpan, 0, longitudeSpan];
  const seen = new Set<string>();
  const grid: Coordinate[] = [];

  for (const latitudeOffset of latitudeOffsets) {
    for (const longitudeOffset of longitudeOffsets) {
      const coordinate = {
        latitude: clamp(start.latitude + latitudeOffset, -85, 85),
        longitude: wrapLongitude(start.longitude + longitudeOffset),
      };
      const key = `${coordinate.latitude.toFixed(2)},${coordinate.longitude.toFixed(2)}`;
      if (!seen.has(key)) {
        seen.add(key);
        grid.push(coordinate);
      }
    }
  }
  return grid;
}

function variableNames(objectType: ObjectType): { speed: string; direction: string; level: string } {
  const level = OBJECT_PROFILES[objectType].level;
  return {
    speed: `wind_speed_${level}`,
    direction: `wind_direction_${level}`,
    level,
  };
}

function parseNode(
  response: OpenMeteoResponse,
  speedVariable: string,
  directionVariable: string,
): WindNode {
  const times = response.hourly?.time;
  const speeds = response.hourly?.[speedVariable];
  const directions = response.hourly?.[directionVariable];
  if (!times || !speeds || !directions || times.length !== speeds.length || times.length !== directions.length) {
    throw new WindRequestError('Die Windantwort ist unvollständig.', 'invalid');
  }

  const nodeTimes: number[] = [];
  const vectors: WindVector[] = [];
  times.forEach((value, index) => {
    const time = typeof value === 'string' ? Date.parse(`${value}Z`) : Number.NaN;
    const speed = speeds[index];
    const direction = directions[index];
    if (Number.isFinite(time) && typeof speed === 'number' && typeof direction === 'number') {
      nodeTimes.push(time);
      vectors.push(meteorologicalWindVector(clamp(speed, 0, 80), direction));
    }
  });

  if (nodeTimes.length < 2) {
    throw new WindRequestError('Die Windantwort enthält zu wenige gültige Stunden.', 'invalid');
  }

  return {
    latitude: response.latitude,
    longitude: response.longitude,
    times: nodeTimes,
    vectors,
  };
}

export async function fetchWindField(
  start: Coordinate,
  objectType: ObjectType,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<WindField> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new WindRequestError('Das Gerät ist offline.', 'offline');
  }

  const grid = gridAround(start);
  const variables = variableNames(objectType);
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set('latitude', grid.map(({ latitude }) => latitude.toFixed(2)).join(','));
  url.searchParams.set('longitude', grid.map(({ longitude }) => longitude.toFixed(2)).join(','));
  url.searchParams.set('hourly', `${variables.speed},${variables.direction}`);
  url.searchParams.set('wind_speed_unit', 'ms');
  url.searchParams.set('forecast_hours', '36');
  url.searchParams.set('timezone', 'GMT');
  url.searchParams.set('models', 'gfs_global');

  const timeoutController = new AbortController();
  const timeoutMs = options.timeoutMs ?? 8000;
  const timeout = window.setTimeout(() => timeoutController.abort('timeout'), timeoutMs);
  const abortFromParent = () => timeoutController.abort('cancelled');
  options.signal?.addEventListener('abort', abortFromParent, { once: true });

  try {
    const response = await fetch(url, {
      signal: timeoutController.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new WindRequestError(`Winddienst antwortet mit ${response.status}.`, 'network');
    const body = (await response.json()) as OpenMeteoResponse | OpenMeteoResponse[];
    const responses = Array.isArray(body) ? body : [body];
    if (responses.length !== grid.length) {
      throw new WindRequestError('Der Winddienst lieferte nicht alle Messpunkte.', 'invalid');
    }
    const nodes = responses.map((entry) => parseNode(entry, variables.speed, variables.direction));
    const forecastStart = new Date(Math.min(...nodes.flatMap((node) => node.times))).toISOString();
    return {
      nodes,
      source: {
        kind: 'live',
        label: 'Open‑Meteo',
        model: `NOAA GFS global · ${variables.level}`,
        fetchedAt: new Date().toISOString(),
        forecastStart,
        attributionUrl: OPEN_METEO_ATTRIBUTION_URL,
      },
    };
  } catch (error) {
    if (error instanceof WindRequestError) throw error;
    if (timeoutController.signal.aborted) {
      const cancelled = options.signal?.aborted;
      throw new WindRequestError(
        cancelled ? 'Der Abruf wurde abgebrochen.' : 'Der Winddienst hat nicht rechtzeitig geantwortet.',
        cancelled ? 'network' : 'timeout',
      );
    }
    throw new WindRequestError('Der Winddienst ist gerade nicht erreichbar.', 'network');
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromParent);
  }
}

export function createDemoWindField(start: Coordinate, objectType: ObjectType): WindField {
  const profile = OBJECT_PROFILES[objectType];
  const firstTime = Date.parse(DEMO_SNAPSHOT);
  const times = Array.from({ length: 37 }, (_, index) => firstTime + index * 60 * 60 * 1000);
  const nodes = gridAround(start).map<WindNode>((coordinate, nodeIndex) => ({
    ...coordinate,
    times,
    vectors: times.map((_, timeIndex) => {
      const latitudeWave = Math.sin(((coordinate.latitude + timeIndex * 2) * Math.PI) / 90);
      const longitudeWave = Math.cos(((coordinate.longitude - timeIndex * 3) * Math.PI) / 120);
      const altitudeFactor = profile.level === '850hPa' ? 1.6 : profile.level === '925hPa' ? 1.25 : 0.8;
      return {
        east: (7 + nodeIndex * 0.35 + longitudeWave * 3) * altitudeFactor,
        north: (latitudeWave * 4 - 1.5) * altitudeFactor,
      };
    }),
  }));

  return {
    nodes,
    source: {
      kind: 'demo',
      label: 'Demo‑Wind',
      model: `synthetisches Testfeld · ${profile.level}`,
      fetchedAt: DEMO_SNAPSHOT,
      forecastStart: DEMO_SNAPSHOT,
    },
  };
}
