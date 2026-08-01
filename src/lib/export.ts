import type { DrawingStroke, RouteResult } from '../types';
import { copy, type SupportedLanguage } from '../copy';
import { drawDrawing, drawRoute, drawWorldBase, WORLD_PALETTES } from './world-renderer';

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Die Ergebnisgrafik konnte nicht erzeugt werden.'));
    }, 'image/png');
  });
}

export async function createResultImage(
  result: RouteResult,
  drawing: DrawingStroke[],
  language: SupportedLanguage = 'de',
): Promise<File> {
  const text = copy[language];
  const locale = language === 'de' ? 'de-DE' : 'en-GB';
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Grafikexport wird von diesem Browser nicht unterstützt.');

  context.fillStyle = '#f7fbf8';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#173f35';
  context.font = '700 72px Georgia, serif';
  context.fillText(text.export.title, 90, 100);
  context.font = '32px system-ui, sans-serif';
  context.fillStyle = '#46655c';
  context.fillText(`${result.startLabel} → ${result.endLabel}`, 92, 152);

  context.save();
  context.translate(80, 205);
  drawWorldBase(context, 1440, 640, WORLD_PALETTES.light);
  const end = drawRoute(context, result.points, 1440, 640, WORLD_PALETTES.light);
  drawDrawing(context, drawing, end, 1440, 640, { size: 90 });
  context.restore();

  context.fillStyle = '#173f35';
  context.font = '600 33px system-ui, sans-serif';
  context.fillText(`${Math.round(result.distanceKm).toLocaleString(locale)} km`, 90, 912);
  context.fillText(`${result.durationHours.toLocaleString(locale)} ${text.export.hours}`, 410, 912);
  context.fillText(`Ø ${Math.round(result.averageSpeedKmh)} km/h`, 760, 912);
  context.font = '24px system-ui, sans-serif';
  context.fillStyle = '#5d746d';
  const source = result.source.kind === 'live'
    ? text.export.liveSource(result.source.label, result.source.model)
    : text.export.demoSource;
  context.fillText(source, 90, 962);
  context.textAlign = 'right';
  context.fillText(text.export.disclaimer, 1510, 962);

  const blob = await canvasBlob(canvas);
  const date = new Date(result.source.forecastStart).toISOString().slice(0, 10);
  return new File([blob], `wolkenpost-${date}.png`, { type: 'image/png' });
}

export function downloadFile(file: File): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(file);
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
