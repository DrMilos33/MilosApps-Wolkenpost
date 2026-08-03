export type ObjectType = 'cloud' | 'balloon' | 'seed' | 'paper-plane';
export type WindBoost = 1 | 1.5 | 2;
export type MotionPreference = 'system' | 'full' | 'reduced';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Place extends Coordinate {
  id: string;
  name: string;
  region?: string;
  country: string;
  countryCode?: string;
  type?: string;
  timeZone?: string;
}

export interface DrawingPoint {
  x: number;
  y: number;
  pressure: number;
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
}

export interface WindVector {
  east: number;
  north: number;
}

export interface WindNode extends Coordinate {
  times: number[];
  vectors: WindVector[];
}

export interface WindSource {
  kind: 'live' | 'demo';
  label: string;
  model: string;
  fetchedAt: string;
  forecastStart: string;
  attributionUrl?: string;
}

export interface WindField {
  nodes: WindNode[];
  source: WindSource;
}

export interface RoutePoint extends Coordinate {
  time: number;
  speed: number;
  bearing: number;
}

export interface RouteResult {
  points: RoutePoint[];
  distanceKm: number;
  durationHours: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  source: WindSource;
  objectType: ObjectType;
  startLabel: string;
  endLabel: string;
  windBoost: WindBoost;
}

export interface RouteHighlight extends Coordinate {
  id: string;
  kind: 'landmark' | 'city';
  name: string;
  distanceKm: number;
  elapsedHours: number;
  progress: number;
}

export interface WindReading {
  level: WindLevel;
  speedKmh: number;
  bearing: number;
  strength: 'calm' | 'light' | 'lively' | 'strong' | 'very-strong';
}

export type WindLevel = '10m' | '925hPa' | '850hPa';

export interface WindSnapshot {
  fields: Record<WindLevel, WindField>;
  fetchedAt: string;
  forecastStart: string;
}

export interface StoredState {
  version: 1;
  drawing: DrawingStroke[];
  objectType: ObjectType;
  lastStart: Place;
  motion: MotionPreference;
  theme: ThemePreference;
  soundEnabled: boolean;
  windBoost: WindBoost;
}
