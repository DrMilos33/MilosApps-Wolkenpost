import { geoEquirectangular, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import worldData from 'world-atlas/countries-110m.json';
import type { Coordinate, DrawingStroke, RouteHighlight, RoutePoint } from '../types';
import { clamp, projectCoordinate, routeSegments } from './geometry';

type WorldTopology = Topology<{
  countries: GeometryCollection;
  land: GeometryCollection;
}>;

const topology = worldData as unknown as WorldTopology;
const countriesObject = topology.objects.countries;
const COUNTRIES = feature(topology, countriesObject) as unknown as GeoPermissibleObjects;
const COUNTRY_BORDERS = mesh(
  topology,
  countriesObject,
  (left, right) => left !== right,
) as unknown as GeoPermissibleObjects;

export const COUNTRY_COUNT = countriesObject.geometries.length;

export interface WorldPalette {
  oceanTop: string;
  oceanBottom: string;
  land: string;
  coast: string;
  countryBorder: string;
  grid: string;
  route: string;
  routeHalo: string;
  lensBackground: string;
  comparisonRoute: string;
  comparisonHalo: string;
}

export const WORLD_PALETTES: Record<'light' | 'dark', WorldPalette> = {
  light: {
    oceanTop: '#dff5ee',
    oceanBottom: '#b8dfe0',
    land: '#fff5d8',
    coast: '#619887',
    countryBorder: 'rgba(53, 117, 99, 0.48)',
    grid: 'rgba(38, 102, 85, 0.16)',
    route: '#d75f45',
    routeHalo: 'rgba(255, 255, 255, 0.82)',
    lensBackground: '#fffdf6',
    comparisonRoute: '#236c85',
    comparisonHalo: 'rgba(255, 255, 255, 0.82)',
  },
  dark: {
    oceanTop: '#173f42',
    oceanBottom: '#102c35',
    land: '#435b4f',
    coast: '#86b49f',
    countryBorder: 'rgba(183, 222, 205, 0.42)',
    grid: 'rgba(205, 235, 220, 0.12)',
    route: '#ff9b73',
    routeHalo: 'rgba(13, 35, 39, 0.9)',
    lensBackground: '#16383c',
    comparisonRoute: '#7dd8ee',
    comparisonHalo: 'rgba(13, 35, 39, 0.9)',
  },
};

export function drawWorldBase(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: WorldPalette,
): void {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, palette.oceanTop);
  gradient.addColorStop(1, palette.oceanBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = palette.grid;
  context.lineWidth = 1;
  for (let longitude = -150; longitude <= 150; longitude += 30) {
    const x = projectCoordinate({ latitude: 0, longitude }, width, height).x;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const y = projectCoordinate({ latitude, longitude: 0 }, width, height).y;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const projection = geoEquirectangular()
    .translate([180, 90])
    .scale(180 / Math.PI)
    .precision(0.35);
  const path = geoPath(projection, context);
  context.save();
  context.scale(width / 360, height / 180);
  context.beginPath();
  path(COUNTRIES);
  context.fillStyle = palette.land;
  context.fill();
  context.strokeStyle = palette.coast;
  context.lineWidth = Math.max(0.45, 360 / Math.max(width, 720));
  context.stroke();

  context.beginPath();
  path(COUNTRY_BORDERS);
  context.strokeStyle = palette.countryBorder;
  context.lineWidth = Math.max(0.28, 260 / Math.max(width, 760));
  context.stroke();
  context.restore();
}

export function drawRouteHighlights(
  context: CanvasRenderingContext2D,
  highlights: RouteHighlight[],
  progress: number,
  width: number,
  height: number,
  palette: WorldPalette,
): void {
  highlights.forEach((highlight, index) => {
    if (highlight.progress > progress + 0.01) return;
    const marker = projectCoordinate(highlight, width, height);
    const radius = Math.max(8, Math.min(12, width / 90));
    context.fillStyle = palette.routeHalo;
    context.beginPath();
    context.arc(marker.x, marker.y, radius + 3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = highlight.kind === 'landmark' ? palette.route : palette.comparisonRoute;
    context.beginPath();
    context.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = highlight.kind === 'landmark' ? '#fffaf0' : '#ffffff';
    context.font = `700 ${Math.max(10, Math.min(13, width / 72))}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(index + 1), marker.x, marker.y + 0.5);
  });
}

export function drawRoute(
  context: CanvasRenderingContext2D,
  points: RoutePoint[],
  width: number,
  height: number,
  palette: WorldPalette,
  progress = 1,
  options: {
    route?: string;
    halo?: string;
    drawStart?: boolean;
    drawTarget?: boolean;
  } = {},
): Coordinate {
  const visibleCount = Math.max(1, Math.ceil(points.length * Math.min(1, Math.max(0, progress))));
  const visible = points.slice(0, visibleCount);
  const segments = routeSegments(visible, width, height);

  const renderPath = (strokeStyle: string, lineWidth: number) => {
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const segment of segments) {
      if (segment.length < 2) continue;
      context.beginPath();
      segment.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.stroke();
    }
  };

  const routeColor = options.route ?? palette.route;
  const haloColor = options.halo ?? palette.routeHalo;
  renderPath(haloColor, Math.max(5, width / 120));
  renderPath(routeColor, Math.max(2.5, width / 260));

  const first = projectCoordinate(points[0], width, height);
  if (options.drawStart !== false) {
    context.fillStyle = haloColor;
    context.beginPath();
    context.arc(first.x, first.y, Math.max(6, width / 130), 0, Math.PI * 2);
    context.fill();
    context.fillStyle = routeColor;
    context.beginPath();
    context.arc(first.x, first.y, Math.max(3.5, width / 220), 0, Math.PI * 2);
    context.fill();
  }

  if (options.drawTarget !== false) {
    const target = projectCoordinate(points.at(-1) ?? points[0], width, height);
    const radius = Math.max(5, width / 160);
    context.save();
    context.translate(target.x, target.y);
    context.rotate(Math.PI / 4);
    context.fillStyle = haloColor;
    context.fillRect(-radius - 2, -radius - 2, (radius + 2) * 2, (radius + 2) * 2);
    context.fillStyle = routeColor;
    context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.restore();
  }

  return visible.at(-1) ?? points[0];
}

export function drawWindArrow(
  context: CanvasRenderingContext2D,
  coordinate: Coordinate,
  bearing: number,
  width: number,
  height: number,
  color: string,
): void {
  const center = projectCoordinate(coordinate, width, height);
  const size = Math.max(14, Math.min(22, width / 24));
  context.save();
  context.translate(center.x, center.y);
  context.rotate((bearing * Math.PI) / 180);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(2, width / 280);
  context.beginPath();
  context.moveTo(0, size * 0.85);
  context.lineTo(0, -size * 0.75);
  context.stroke();
  context.beginPath();
  context.moveTo(0, -size);
  context.lineTo(-size * 0.36, -size * 0.48);
  context.lineTo(size * 0.36, -size * 0.48);
  context.closePath();
  context.fill();
  context.restore();
}

function longitudeOffset(longitude: number, origin: number): number {
  return ((((longitude - origin) + 540) % 360) - 180);
}

export function drawRouteLens(
  context: CanvasRenderingContext2D,
  routes: Array<{ points: RoutePoint[]; color: string; halo: string }>,
  progress: number,
  width: number,
  height: number,
  palette: WorldPalette,
  label: string,
): void {
  const usableRoutes = routes.filter((route) => route.points.length > 1);
  if (!usableRoutes.length) return;

  const origin = usableRoutes[0].points[0].longitude;
  const routePoints = usableRoutes.flatMap((route) => route.points);
  const longitudes = routePoints.map((point) => longitudeOffset(point.longitude, origin));
  const latitudes = routePoints.map((point) => point.latitude);
  const longitudeCenter = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const latitudeCenter = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const longitudeSpan = Math.max(0.6, Math.max(...longitudes) - Math.min(...longitudes));
  const latitudeSpan = Math.max(0.6, Math.max(...latitudes) - Math.min(...latitudes));

  const lensWidth = Math.min(width - 20, Math.max(150, width * 0.47));
  const lensHeight = Math.min(height - 20, Math.max(92, height * 0.42));
  const routeStart = projectCoordinate(usableRoutes[0].points[0], width, height);
  const left = routeStart.x > width / 2 ? 10 : width - lensWidth - 10;
  const top = routeStart.y > height / 2 ? 10 : height - lensHeight - 10;
  const titleHeight = 24;
  const padding = 10;
  const plotWidth = lensWidth - padding * 2;
  const plotHeight = lensHeight - titleHeight - padding;
  const scale = Math.min(plotWidth / (longitudeSpan * 1.2), plotHeight / (latitudeSpan * 1.2));
  const project = (point: Coordinate) => ({
    x: left + lensWidth / 2 + (longitudeOffset(point.longitude, origin) - longitudeCenter) * scale,
    y: top + titleHeight + plotHeight / 2 - (point.latitude - latitudeCenter) * scale,
  });

  context.save();
  context.fillStyle = palette.lensBackground;
  context.strokeStyle = palette.coast;
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(left, top, lensWidth, lensHeight, 12);
  context.fill();
  context.stroke();
  context.beginPath();
  context.rect(left + 1, top + 1, lensWidth - 2, lensHeight - 2);
  context.clip();

  context.strokeStyle = palette.grid;
  context.lineWidth = 1;
  for (let column = 1; column < 4; column += 1) {
    const x = left + (lensWidth * column) / 4;
    context.beginPath();
    context.moveTo(x, top + titleHeight);
    context.lineTo(x, top + lensHeight);
    context.stroke();
  }
  for (let row = 1; row < 3; row += 1) {
    const y = top + titleHeight + (plotHeight * row) / 3;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(left + lensWidth, y);
    context.stroke();
  }

  context.fillStyle = palette.coast;
  context.font = `700 ${Math.max(10, Math.min(12, width / 44))}px system-ui, sans-serif`;
  context.fillText(label, left + padding, top + 16, lensWidth - padding * 2);

  usableRoutes.forEach((route) => {
    const visibleCount = Math.max(1, Math.ceil(route.points.length * clamp(progress, 0, 1)));
    const visible = route.points.slice(0, visibleCount);
    const paint = (color: string, lineWidth: number) => {
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.beginPath();
      visible.forEach((point, index) => {
        const projected = project(point);
        if (index === 0) context.moveTo(projected.x, projected.y);
        else context.lineTo(projected.x, projected.y);
      });
      context.stroke();
    };
    paint(route.halo, 6);
    paint(route.color, 3);

    const start = project(route.points[0]);
    context.fillStyle = route.color;
    context.beginPath();
    context.arc(start.x, start.y, 4, 0, Math.PI * 2);
    context.fill();

    const target = project(route.points.at(-1) ?? route.points[0]);
    context.save();
    context.translate(target.x, target.y);
    context.rotate(Math.PI / 4);
    context.fillRect(-4, -4, 8, 8);
    context.restore();

    const current = visible.at(-1) ?? route.points[0];
    const currentPosition = project(current);
    const currentBearing = current.bearing * Math.PI / 180;
    context.save();
    context.translate(currentPosition.x, currentPosition.y);
    context.rotate(currentBearing);
    context.strokeStyle = route.color;
    context.fillStyle = route.color;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 7);
    context.lineTo(0, -7);
    context.stroke();
    context.beginPath();
    context.moveTo(0, -10);
    context.lineTo(-4, -4);
    context.lineTo(4, -4);
    context.closePath();
    context.fill();
    context.restore();
  });
  context.restore();
}

export function drawDrawing(
  context: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
  coordinate: Coordinate,
  width: number,
  height: number,
  options: { size?: number; fill?: string; halo?: string } = {},
): void {
  const center = projectCoordinate(coordinate, width, height);
  const size = options.size ?? Math.max(34, width / 19);
  const left = center.x - size / 2;
  const top = center.y - size / 2;

  const render = (color: string, lineWidth: number) => {
    context.strokeStyle = color;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const stroke of strokes) {
      if (!stroke.points.length) continue;
      context.beginPath();
      stroke.points.forEach((point, index) => {
        const x = left + point.x * size;
        const y = top + point.y * size;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.lineWidth = lineWidth;
      context.stroke();
    }
  };

  render(options.halo ?? 'rgba(20, 52, 44, 0.75)', Math.max(5, size / 10));
  render(options.fill ?? '#fffaf0', Math.max(2.5, size / 19));
}
