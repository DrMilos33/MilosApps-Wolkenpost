import type {
  Coordinate,
  ObjectType,
  WindField,
  WindLevel,
  WindNode,
  WindSnapshot,
  WindVector,
} from '../types';
import { clamp, wrapLongitude } from './geometry';
import { OBJECT_PROFILES } from './simulation';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_ATTRIBUTION_URL = 'https://open-meteo.com/';
export const DEMO_SNAPSHOT = '2026-07-30T00:00:00.000Z';

const WIND_LEVELS: WindLevel[] = ['10m', '925hPa', '850hPa'];

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

function variableNames(level: WindLevel): { speed: string; direction: string; level: WindLevel } {
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

async function requestWindSnapshot(
  start: Coordinate,
  options: { signal?: AbortSignal; timeoutMs?: number },
): Promise<WindSnapshot> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new WindRequestError('Das Gerät ist offline.', 'offline');
  }

  const grid = gridAround(start);
  const variables = WIND_LEVELS.map(variableNames);
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set('latitude', grid.map(({ latitude }) => latitude.toFixed(2)).join(','));
  url.searchParams.set('longitude', grid.map(({ longitude }) => longitude.toFixed(2)).join(','));
  url.searchParams.set('hourly', variables.flatMap(({ speed, direction }) => [speed, direction]).join(','));
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

    const parsed = Object.fromEntries(variables.map(({ level, speed, direction }) => [
      level,
      responses.map((entry) => parseNode(entry, speed, direction)),
    ])) as Record<WindLevel, WindNode[]>;
    const fetchedAt = new Date().toISOString();
    const forecastStart = new Date(Math.min(
      ...Object.values(parsed).flatMap((nodes) => nodes.flatMap((node) => node.times)),
    )).toISOString();
    const fields = Object.fromEntries(variables.map(({ level }) => [
      level,
      {
        nodes: parsed[level],
        source: {
          kind: 'live' as const,
          label: 'Open‑Meteo',
          model: `NOAA GFS global · ${level}`,
          fetchedAt,
          forecastStart,
          attributionUrl: OPEN_METEO_ATTRIBUTION_URL,
        },
      },
    ])) as Record<WindLevel, WindField>;
    return { fields, fetchedAt, forecastStart };
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

export function fetchWindSnapshot(
  start: Coordinate,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<WindSnapshot> {
  return requestWindSnapshot(start, options);
}

export async function fetchWindField(
  start: Coordinate,
  objectType: ObjectType,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<WindField> {
  const snapshot = await requestWindSnapshot(start, options);
  return snapshot.fields[OBJECT_PROFILES[objectType].level];
}

export function createDemoWindSnapshot(start: Coordinate): WindSnapshot {
  const firstTime = Date.parse(DEMO_SNAPSHOT);
  const times = Array.from({ length: 37 }, (_, index) => firstTime + index * 60 * 60 * 1000);
  const fields = Object.fromEntries(WIND_LEVELS.map((level) => {
    const altitudeFactor = level === '850hPa' ? 1.6 : level === '925hPa' ? 1.25 : 0.8;
    const nodes = gridAround(start).map<WindNode>((coordinate, nodeIndex) => ({
      ...coordinate,
      times,
      vectors: times.map((_, timeIndex) => {
        const latitudeWave = Math.sin(((coordinate.latitude + timeIndex * 2) * Math.PI) / 90);
        const longitudeWave = Math.cos(((coordinate.longitude - timeIndex * 3) * Math.PI) / 120);
        return {
          east: (7 + nodeIndex * 0.35 + longitudeWave * 3) * altitudeFactor,
          north: (latitudeWave * 4 - 1.5) * altitudeFactor,
        };
      }),
    }));
    return [level, {
      nodes,
      source: {
        kind: 'demo' as const,
        label: 'Demo‑Wind',
        model: `synthetisches Testfeld · ${level}`,
        fetchedAt: DEMO_SNAPSHOT,
        forecastStart: DEMO_SNAPSHOT,
      },
    }];
  })) as Record<WindLevel, WindField>;
  return {
    fields,
    fetchedAt: DEMO_SNAPSHOT,
    forecastStart: DEMO_SNAPSHOT,
  };
}

export function createDemoWindField(start: Coordinate, objectType: ObjectType): WindField {
  return createDemoWindSnapshot(start).fields[OBJECT_PROFILES[objectType].level];
}
