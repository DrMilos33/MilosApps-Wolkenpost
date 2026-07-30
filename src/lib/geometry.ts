import type { Coordinate } from '../types';

const EARTH_RADIUS_KM = 6371.0088;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function wrapLongitude(longitude: number): number {
  const wrapped = ((longitude + 180) % 360 + 360) % 360 - 180;
  return wrapped === -180 && longitude > 0 ? 180 : wrapped;
}

export function haversineKm(a: Coordinate, b: Coordinate): number {
  const latitudeDelta = (b.latitude - a.latitude) * DEG_TO_RAD;
  const longitudeDelta = (b.longitude - a.longitude) * DEG_TO_RAD;
  const latitudeA = a.latitude * DEG_TO_RAD;
  const latitudeB = b.latitude * DEG_TO_RAD;
  const sinLat = Math.sin(latitudeDelta / 2);
  const sinLon = Math.sin(longitudeDelta / 2);
  const value = sinLat * sinLat + Math.cos(latitudeA) * Math.cos(latitudeB) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(value)));
}

export function destinationPoint(
  origin: Coordinate,
  distanceKm: number,
  bearingDegrees: number,
): Coordinate {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return { ...origin };

  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearing = bearingDegrees * DEG_TO_RAD;
  const latitude = origin.latitude * DEG_TO_RAD;
  const longitude = origin.longitude * DEG_TO_RAD;

  const destinationLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance)
      + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const destinationLongitude = longitude + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
    Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(destinationLatitude),
  );

  return {
    latitude: clamp(destinationLatitude * RAD_TO_DEG, -89.999, 89.999),
    longitude: wrapLongitude(destinationLongitude * RAD_TO_DEG),
  };
}

export function vectorBearing(east: number, north: number): number {
  return (Math.atan2(east, north) * RAD_TO_DEG + 360) % 360;
}

export function projectCoordinate(
  coordinate: Coordinate,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: ((wrapLongitude(coordinate.longitude) + 180) / 360) * width,
    y: ((90 - clamp(coordinate.latitude, -90, 90)) / 180) * height,
  };
}

export function coordinateFromProjection(
  x: number,
  y: number,
  width: number,
  height: number,
): Coordinate {
  return {
    latitude: clamp(90 - (y / height) * 180, -85, 85),
    longitude: wrapLongitude((x / width) * 360 - 180),
  };
}

export function routeSegments<T extends Coordinate>(
  points: T[],
  width: number,
  height: number,
): Array<Array<{ x: number; y: number; source: T }>> {
  const segments: Array<Array<{ x: number; y: number; source: T }>> = [];
  let current: Array<{ x: number; y: number; source: T }> = [];

  for (const point of points) {
    const projected = { ...projectCoordinate(point, width, height), source: point };
    const previous = current.at(-1);
    if (previous && Math.abs(projected.x - previous.x) > width / 2) {
      if (current.length) segments.push(current);
      current = [projected];
    } else {
      current.push(projected);
    }
  }

  if (current.length) segments.push(current);
  return segments;
}

export function roundedCoordinateLabel(coordinate: Coordinate): string {
  const latitude = Math.abs(coordinate.latitude).toFixed(1);
  const longitude = Math.abs(coordinate.longitude).toFixed(1);
  return `${latitude}° ${coordinate.latitude >= 0 ? 'N' : 'S'}, ${longitude}° ${coordinate.longitude >= 0 ? 'O' : 'W'}`;
}
