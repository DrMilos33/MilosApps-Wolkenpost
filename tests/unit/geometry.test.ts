import {
  coordinateFromProjection,
  coordinateFromViewProjection,
  coordinatesFitViewport,
  coordinateVisibleInViewport,
  destinationPoint,
  haversineKm,
  projectCoordinate,
  projectCoordinateInView,
  routeSegments,
  wrapLongitude,
} from '../../src/lib/geometry';

describe('geography helpers', () => {
  it('wraps longitude across the date line', () => {
    expect(wrapLongitude(181)).toBe(-179);
    expect(wrapLongitude(-181)).toBe(179);
    expect(wrapLongitude(540)).toBe(180);
  });

  it('advances safely near a pole', () => {
    const result = destinationPoint({ latitude: 89.8, longitude: 20 }, 500, 0);
    expect(result.latitude).toBeLessThanOrEqual(89.999);
    expect(result.latitude).toBeGreaterThan(-90);
    expect(result.longitude).toBeGreaterThanOrEqual(-180);
    expect(result.longitude).toBeLessThanOrEqual(180);
    expect(haversineKm({ latitude: 89.8, longitude: 20 }, result)).toBeCloseTo(500, 4);
  });

  it('breaks a rendered route at the date line instead of drawing across the map', () => {
    const segments = routeSegments([
      { latitude: 5, longitude: 179 },
      { latitude: 5, longitude: -179 },
      { latitude: 6, longitude: -177 },
    ], 1000, 500);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toHaveLength(1);
    expect(segments[1]).toHaveLength(2);
  });

  it('round-trips the world projection', () => {
    const original = { latitude: 52.5, longitude: 13.5 };
    const projected = projectCoordinate(original, 1200, 600);
    const restored = coordinateFromProjection(projected.x, projected.y, 1200, 600);
    expect(restored).toEqual(original);
  });

  it('round-trips a zoomed country viewport', () => {
    const viewport = { center: { latitude: 51, longitude: 10 }, zoom: 12 };
    const original = { latitude: 52.5, longitude: 13.5 };
    const projected = projectCoordinateInView(original, 1200, 600, viewport);
    const restored = coordinateFromViewProjection(projected.x, projected.y, 1200, 600, viewport);
    expect(restored.latitude).toBeCloseTo(original.latitude, 10);
    expect(restored.longitude).toBeCloseTo(original.longitude, 10);
  });

  it('expands a close view until the travelled route is visible', () => {
    const close = { center: { latitude: 52.5, longitude: 13.5 }, zoom: 14 };
    const destination = { latitude: 35, longitude: 50 };
    expect(coordinateVisibleInViewport(destination, 1000, 500, close)).toBe(false);
    const expanded = coordinatesFitViewport([
      close.center,
      destination,
    ], close.zoom, 0.66);
    expect(expanded.zoom).toBeLessThan(close.zoom);
    expect(coordinateVisibleInViewport(destination, 1000, 500, expanded)).toBe(true);
  });
});
