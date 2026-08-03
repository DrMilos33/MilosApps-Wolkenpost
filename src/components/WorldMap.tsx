import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type {
  Coordinate,
  DrawingStroke,
  MotionPreference,
  RouteHighlight,
  RouteResult,
  ThemePreference,
} from '../types';
import {
  clamp,
  coordinateFromProjection,
  projectCoordinate,
  wrapLongitude,
} from '../lib/geometry';
import {
  drawDrawing,
  drawRoute,
  drawRouteHighlights,
  drawRouteLens,
  drawWindArrow,
  drawWorldBase,
  WORLD_PALETTES,
  COUNTRY_COUNT,
} from '../lib/world-renderer';

interface WorldMapProps {
  selected: Coordinate;
  result: RouteResult | null;
  comparisonResult?: RouteResult | null;
  highlights?: RouteHighlight[];
  drawing: DrawingStroke[];
  motion: MotionPreference;
  theme: ThemePreference;
  onSelect: (coordinate: Coordinate) => void;
  label: string;
  routeLensLabel: string;
  replayToken?: number;
  onProgress?: (progress: number) => void;
}

export function WorldMap({
  selected,
  result,
  comparisonResult = null,
  highlights = [],
  drawing,
  motion,
  theme,
  onSelect,
  label,
  routeLensLabel,
  replayToken = 0,
  onProgress,
}: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: 1, height: 1 });
  const progressRef = useRef(1);
  const frameRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const lastReportedProgressRef = useRef(-1);
  const [reportedProgress, setReportedProgress] = useState(1);
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isDark = theme === 'dark' || (theme === 'system' && systemDark.matches);
  const reduced = motion === 'reduced' || (motion === 'system' && systemReduced.matches);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height } = sizeRef.current;
    const palette = WORLD_PALETTES[isDark ? 'dark' : 'light'];
    context.clearRect(0, 0, width, height);
    drawWorldBase(context, width, height, palette);

    let objectPosition = selected;
    if (result) {
      objectPosition = drawRoute(context, result.points, width, height, palette, progressRef.current);
      const primaryIndex = Math.max(0, Math.min(
        result.points.length - 1,
        Math.ceil(result.points.length * progressRef.current) - 1,
      ));
      const primaryPoint = result.points[primaryIndex];
      drawWindArrow(context, objectPosition, primaryPoint.bearing, width, height, palette.route);
      if (comparisonResult) {
        const comparisonPosition = drawRoute(
          context,
          comparisonResult.points,
          width,
          height,
          palette,
          progressRef.current,
          {
            route: palette.comparisonRoute,
            halo: palette.comparisonHalo,
            drawStart: false,
          },
        );
        const comparisonIndex = Math.max(0, Math.min(
          comparisonResult.points.length - 1,
          Math.ceil(comparisonResult.points.length * progressRef.current) - 1,
        ));
        const comparisonPoint = comparisonResult.points[comparisonIndex];
        drawWindArrow(
          context,
          comparisonPosition,
          comparisonPoint.bearing,
          width,
          height,
          palette.comparisonRoute,
        );
        const marker = projectCoordinate(comparisonPosition, width, height);
        context.fillStyle = palette.comparisonHalo;
        context.beginPath();
        context.arc(marker.x, marker.y, Math.max(7, width / 95), 0, Math.PI * 2);
        context.fill();
        context.fillStyle = palette.comparisonRoute;
        context.beginPath();
        context.arc(marker.x, marker.y, Math.max(4, width / 180), 0, Math.PI * 2);
        context.fill();
      }
      drawRouteHighlights(
        context,
        highlights,
        progressRef.current,
        width,
        height,
        palette,
      );
      drawRouteLens(
        context,
        [
          { points: result.points, color: palette.route, halo: palette.routeHalo },
          ...(comparisonResult
            ? [{
                points: comparisonResult.points,
                color: palette.comparisonRoute,
                halo: palette.comparisonHalo,
              }]
            : []),
        ],
        progressRef.current,
        width,
        height,
        palette,
        routeLensLabel,
      );
    } else {
      const marker = projectCoordinate(selected, width, height);
      context.fillStyle = palette.routeHalo;
      context.beginPath();
      context.arc(marker.x, marker.y, Math.max(7, width / 95), 0, Math.PI * 2);
      context.fill();
      context.fillStyle = palette.route;
      context.beginPath();
      context.arc(marker.x, marker.y, Math.max(4, width / 180), 0, Math.PI * 2);
      context.fill();
    }

    if (drawing.length) drawDrawing(context, drawing, objectPosition, width, height);
  }, [comparisonResult, drawing, highlights, isDark, result, routeLensLabel, selected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
      canvas.getContext('2d')?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      sizeRef.current = { width: bounds.width, height: bounds.height };
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, [render]);

  useEffect(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    progressRef.current = reduced || !result ? 1 : 0;
    lastReportedProgressRef.current = progressRef.current;
    setReportedProgress(progressRef.current);
    onProgress?.(progressRef.current);
    if (reduced || !result) {
      render();
      return;
    }

    const startedAt = performance.now();
    const duration = Math.min(6800, Math.max(3200, result.points.length * 70));
    const tick = (time: number) => {
      progressRef.current = clamp((time - startedAt) / duration, 0, 1);
      render();
      if (
        progressRef.current === 1
        || progressRef.current - lastReportedProgressRef.current >= 0.04
      ) {
        lastReportedProgressRef.current = progressRef.current;
        setReportedProgress(progressRef.current);
        onProgress?.(progressRef.current);
      }
      if (progressRef.current < 1) frameRef.current = window.requestAnimationFrame(tick);
    };
    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [comparisonResult, onProgress, reduced, render, replayToken, result]);

  useEffect(() => {
    const rerender = () => render();
    systemDark.addEventListener('change', rerender);
    systemReduced.addEventListener('change', rerender);
    return () => {
      systemDark.removeEventListener('change', rerender);
      systemReduced.removeEventListener('change', rerender);
    };
  }, [render, systemDark, systemReduced]);

  const coordinateFromPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return coordinateFromProjection(
      event.clientX - bounds.left,
      event.clientY - bounds.top,
      bounds.width,
      bounds.height,
    );
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
    onSelect(coordinateFromPointer(event));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const step = event.shiftKey ? 5 : 1;
    const next = { ...selected };
    if (event.key === 'ArrowLeft') next.longitude = wrapLongitude(next.longitude - step);
    else if (event.key === 'ArrowRight') next.longitude = wrapLongitude(next.longitude + step);
    else if (event.key === 'ArrowUp') next.latitude = clamp(next.latitude + step, -85, 85);
    else if (event.key === 'ArrowDown') next.latitude = clamp(next.latitude - step, -85, 85);
    else return;
    event.preventDefault();
    onSelect(next);
  };

  return (
    <canvas
      ref={canvasRef}
      className="world-map"
      data-testid="world-map"
      data-motion={reduced ? 'reduced' : 'full'}
      data-route-count={result ? (comparisonResult ? '2' : '1') : '0'}
      data-route-lens={result ? 'visible' : 'hidden'}
      data-country-detail="natural-earth-110m"
      data-country-count={COUNTRY_COUNT}
      data-highlight-count={highlights.length}
      data-progress={reportedProgress.toFixed(2)}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        pointerStartRef.current = null;
      }}
      onKeyDown={onKeyDown}
      tabIndex={0}
    />
  );
}
