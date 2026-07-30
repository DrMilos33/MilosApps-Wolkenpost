import type { Coordinate, DrawingStroke, RoutePoint } from '../types';
import { projectCoordinate, routeSegments } from './geometry';

type Polygon = Array<[number, number]>;

// Deliberately simplified, hand-authored silhouettes: no external map tiles or geodata.
const LANDMASSES: Polygon[] = [
  [
    [-168, 71], [-151, 70], [-141, 60], [-132, 55], [-124, 48], [-123, 38], [-117, 32],
    [-106, 23], [-97, 19], [-88, 21], [-82, 25], [-81, 31], [-76, 35], [-70, 42],
    [-61, 47], [-57, 53], [-65, 61], [-80, 66], [-97, 72], [-117, 74], [-139, 73],
  ],
  [
    [-81, 12], [-75, 8], [-70, -4], [-65, -13], [-61, -21], [-56, -30], [-58, -39],
    [-64, -50], [-71, -55], [-75, -44], [-73, -33], [-78, -18], [-80, -3],
  ],
  [
    [-52, 82], [-28, 83], [-20, 76], [-30, 66], [-44, 61], [-55, 68], [-60, 76],
  ],
  [
    [-10, 36], [-10, 43], [0, 48], [14, 56], [31, 61], [47, 67], [66, 72],
    [91, 76], [117, 73], [142, 65], [160, 58], [174, 51], [164, 44], [145, 42],
    [131, 34], [122, 24], [113, 20], [105, 11], [97, 7], [89, 20], [78, 24],
    [70, 23], [62, 30], [51, 27], [43, 13], [35, 5], [34, -10], [28, -22],
    [20, -35], [10, -34], [1, -25], [-5, -8], [-13, 5], [-17, 18], [-10, 36],
  ],
  [
    [113, -22], [121, -17], [134, -13], [145, -18], [153, -28], [151, -37],
    [140, -43], [127, -39], [116, -33],
  ],
  [
    [47, -13], [51, -16], [50, -25], [46, -26], [44, -18],
  ],
  [
    [130, 32], [135, 34], [141, 40], [145, 44], [142, 31], [137, 29],
  ],
  [
    [-180, -68], [-150, -73], [-110, -71], [-70, -75], [-30, -72], [10, -76],
    [55, -72], [95, -75], [140, -70], [180, -72], [180, -90], [-180, -90],
  ],
];

export interface WorldPalette {
  oceanTop: string;
  oceanBottom: string;
  land: string;
  coast: string;
  grid: string;
  route: string;
  routeHalo: string;
}

export const WORLD_PALETTES: Record<'light' | 'dark', WorldPalette> = {
  light: {
    oceanTop: '#dff5ee',
    oceanBottom: '#b8dfe0',
    land: '#fff5d8',
    coast: '#619887',
    grid: 'rgba(38, 102, 85, 0.16)',
    route: '#d75f45',
    routeHalo: 'rgba(255, 255, 255, 0.82)',
  },
  dark: {
    oceanTop: '#173f42',
    oceanBottom: '#102c35',
    land: '#435b4f',
    coast: '#86b49f',
    grid: 'rgba(205, 235, 220, 0.12)',
    route: '#ff9b73',
    routeHalo: 'rgba(13, 35, 39, 0.9)',
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

  context.fillStyle = palette.land;
  context.strokeStyle = palette.coast;
  context.lineWidth = Math.max(1, width / 900);
  for (const polygon of LANDMASSES) {
    context.beginPath();
    polygon.forEach(([longitude, latitude], index) => {
      const point = projectCoordinate({ latitude, longitude }, width, height);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.fill();
    context.stroke();
  }
}

export function drawRoute(
  context: CanvasRenderingContext2D,
  points: RoutePoint[],
  width: number,
  height: number,
  palette: WorldPalette,
  progress = 1,
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

  renderPath(palette.routeHalo, Math.max(5, width / 120));
  renderPath(palette.route, Math.max(2.5, width / 260));

  const first = projectCoordinate(points[0], width, height);
  context.fillStyle = palette.routeHalo;
  context.beginPath();
  context.arc(first.x, first.y, Math.max(6, width / 130), 0, Math.PI * 2);
  context.fill();
  context.fillStyle = palette.route;
  context.beginPath();
  context.arc(first.x, first.y, Math.max(3.5, width / 220), 0, Math.PI * 2);
  context.fill();

  return visible.at(-1) ?? points[0];
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
