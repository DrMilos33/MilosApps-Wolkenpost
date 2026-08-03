import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type {
  Coordinate,
  DrawingStroke,
  MapLandmark,
  MotionPreference,
  RouteHighlight,
  RouteResult,
  ThemePreference,
  WindReading,
} from '../types';
import {
  clamp,
  coordinateFromViewProjection,
  coordinatesFitViewport,
  coordinateVisibleInViewport,
  projectCoordinateInView,
  wrapLongitude,
  WORLD_VIEWPORT,
  type MapViewport,
} from '../lib/geometry';
import {
  countryViewportForCoordinate,
  COUNTRY_COUNT,
  drawDrawing,
  drawMapLandmarks,
  drawRoute,
  drawRouteHighlights,
  drawRouteLens,
  drawWindArrow,
  drawWindField,
  drawWorldBase,
  WORLD_PALETTES,
} from '../lib/world-renderer';

interface WorldMapText {
  zoomIn: string;
  zoomOut: string;
  countryView: string;
  worldView: string;
  zoomLevel: (zoom: number) => string;
  dragHint: string;
  followFlight: string;
  fitRoute: string;
  discoveries: string;
  momentKicker: string;
  momentNear: (distance: number) => string;
  momentTime: (hours: number) => string;
}

interface WorldMapProps {
  selected: Coordinate;
  result: RouteResult | null;
  comparisonResult?: RouteResult | null;
  highlights?: RouteHighlight[];
  drawing: DrawingStroke[];
  windReading?: WindReading;
  landmarks?: MapLandmark[];
  motion: MotionPreference;
  theme: ThemePreference;
  onSelect: (coordinate: Coordinate) => void;
  label: string;
  routeLensLabel: string;
  text: WorldMapText;
  replayToken?: number;
  onProgress?: (progress: number) => void;
}

type ViewMode = 'world' | 'country' | 'custom' | 'route';
type MapView = MapViewport & { mode: ViewMode };

interface PointerSession {
  id: number;
  startX: number;
  startY: number;
  mode: 'figure' | 'map';
  moved: boolean;
  lastCoordinate: Coordinate;
}

const INITIAL_VIEW: MapView = { ...WORLD_VIEWPORT, mode: 'world' };

function sameView(a: MapView, b: MapView): boolean {
  return a.mode === b.mode
    && Math.abs(a.zoom - b.zoom) < 0.01
    && Math.abs(a.center.latitude - b.center.latitude) < 0.01
    && Math.abs(a.center.longitude - b.center.longitude) < 0.01;
}

export function WorldMap({
  selected,
  result,
  comparisonResult = null,
  highlights = [],
  drawing,
  windReading,
  landmarks = [],
  motion,
  theme,
  onSelect,
  label,
  routeLensLabel,
  text,
  replayToken = 0,
  onProgress,
}: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: 1, height: 1 });
  const progressRef = useRef(1);
  const frameRef = useRef<number | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const pointerRef = useRef<PointerSession | null>(null);
  const dragCoordinateRef = useRef<Coordinate | null>(null);
  const lastReportedProgressRef = useRef(-1);
  const [reportedProgress, setReportedProgress] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [mapView, setMapView] = useState<MapView>(INITIAL_VIEW);
  const viewRef = useRef<MapView>(INITIAL_VIEW);
  const [following, setFollowing] = useState(false);
  const followingRef = useRef(false);
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isDark = theme === 'dark' || (theme === 'system' && systemDark.matches);
  const reduced = motion === 'reduced' || (motion === 'system' && systemReduced.matches);

  const commitView = useCallback((next: MapView) => {
    viewRef.current = next;
    setMapView((current) => sameView(current, next) ? current : next);
  }, []);

  const commitFollowing = useCallback((next: boolean) => {
    followingRef.current = next;
    setFollowing(next);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height } = sizeRef.current;
    const palette = WORLD_PALETTES[isDark ? 'dark' : 'light'];
    let viewport = viewRef.current;
    let objectPosition = dragCoordinateRef.current ?? selected;

    if (result) {
      const visibleCount = Math.max(1, Math.ceil(result.points.length * progressRef.current));
      const visiblePoints = result.points.slice(0, visibleCount);
      objectPosition = visiblePoints.at(-1) ?? result.points[0];
      if (followingRef.current) {
        const fitted = coordinatesFitViewport(visiblePoints, 8, 0.58);
        const next: MapView = { ...fitted, mode: 'route' };
        viewRef.current = next;
        viewport = next;
      } else if (!coordinateVisibleInViewport(objectPosition, width, height, viewport)) {
        const expanded = coordinatesFitViewport(visiblePoints, viewport.zoom, 0.66);
        const next: MapView = {
          ...expanded,
          zoom: Math.min(viewport.zoom, expanded.zoom),
          mode: viewport.mode,
        };
        viewport = next;
        commitView(next);
      }
    }

    context.clearRect(0, 0, width, height);
    drawWorldBase(context, width, height, palette, viewport);

    if (!result && viewport.zoom >= 2) {
      const visibleLandmarks = landmarks.filter((landmark) =>
        coordinateVisibleInViewport(landmark, width, height, viewport, 0.04));
      drawMapLandmarks(context, visibleLandmarks, width, height, palette, viewport);
    }

    if (windReading && !result) {
      drawWindField(
        context,
        dragCoordinateRef.current ?? selected,
        windReading.bearing,
        windReading.speedKmh,
        width,
        height,
        palette,
        viewport,
      );
    }

    if (result) {
      objectPosition = drawRoute(
        context,
        result.points,
        width,
        height,
        palette,
        progressRef.current,
        {},
        viewport,
      );
      const primaryIndex = Math.max(0, Math.min(
        result.points.length - 1,
        Math.ceil(result.points.length * progressRef.current) - 1,
      ));
      const primaryPoint = result.points[primaryIndex];
      drawWindArrow(
        context,
        objectPosition,
        primaryPoint.bearing,
        width,
        height,
        palette.route,
        viewport,
      );
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
          viewport,
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
          viewport,
        );
        const marker = projectCoordinateInView(comparisonPosition, width, height, viewport);
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
        viewport,
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
        viewport,
      );
    } else {
      const markerCoordinate = dragCoordinateRef.current ?? selected;
      const marker = projectCoordinateInView(markerCoordinate, width, height, viewport);
      context.fillStyle = palette.routeHalo;
      context.beginPath();
      context.arc(marker.x, marker.y, Math.max(9, width / 90), 0, Math.PI * 2);
      context.fill();
      context.fillStyle = palette.route;
      context.beginPath();
      context.arc(marker.x, marker.y, Math.max(4.5, width / 170), 0, Math.PI * 2);
      context.fill();
    }

    if (drawing.length) {
      drawDrawing(context, drawing, objectPosition, width, height, {}, viewport);
    }
  }, [
    commitView,
    comparisonResult,
    drawing,
    highlights,
    isDark,
    landmarks,
    result,
    routeLensLabel,
    selected,
    windReading,
  ]);

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
    render();
  }, [mapView, render]);

  useEffect(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    commitFollowing(Boolean(result));
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
        setMapView(viewRef.current);
        onProgress?.(progressRef.current);
      }
      if (progressRef.current < 1) frameRef.current = window.requestAnimationFrame(tick);
    };
    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [commitFollowing, comparisonResult, onProgress, reduced, render, replayToken, result]);

  useEffect(() => {
    const rerender = () => render();
    systemDark.addEventListener('change', rerender);
    systemReduced.addEventListener('change', rerender);
    return () => {
      systemDark.removeEventListener('change', rerender);
      systemReduced.removeEventListener('change', rerender);
    };
  }, [render, systemDark, systemReduced]);

  const coordinateFromClient = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return selected;
    const bounds = canvas.getBoundingClientRect();
    return coordinateFromViewProjection(
      clientX - bounds.left,
      clientY - bounds.top,
      bounds.width,
      bounds.height,
      viewRef.current,
    );
  }, [selected]);

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const marker = projectCoordinateInView(selected, bounds.width, bounds.height, viewRef.current);
    const localX = event.clientX - bounds.left;
    const localY = event.clientY - bounds.top;
    const figureHit = !result && drawing.length > 0
      && Math.hypot(localX - marker.x, localY - marker.y) <= 38;
    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      mode: figureHit ? 'figure' : 'map',
      moved: false,
      lastCoordinate: selected,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (figureHit) event.preventDefault();
  };

  useEffect(() => {
    const move = (event: globalThis.PointerEvent) => {
      const session = pointerRef.current;
      if (!session || session.id !== event.pointerId || session.mode !== 'figure') return;
      const moved = Math.hypot(event.clientX - session.startX, event.clientY - session.startY) > 5;
      if (!moved && !session.moved) return;
      event.preventDefault();
      session.moved = true;
      session.lastCoordinate = coordinateFromClient(event.clientX, event.clientY);
      dragCoordinateRef.current = session.lastCoordinate;
      setDragging(true);
      if (dragFrameRef.current === null) {
        dragFrameRef.current = window.requestAnimationFrame(() => {
          dragFrameRef.current = null;
          render();
        });
      }
    };

    const finish = (event: globalThis.PointerEvent, cancelled: boolean) => {
      const session = pointerRef.current;
      if (!session || session.id !== event.pointerId) return;
      pointerRef.current = null;
      const canvas = canvasRef.current;
      if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      const draggedCoordinate = session.lastCoordinate;
      dragCoordinateRef.current = null;
      setDragging(false);
      render();
      if (cancelled) return;
      if (session.mode === 'figure' && session.moved) {
        onSelect(draggedCoordinate);
      } else if (session.mode === 'map' && Math.hypot(
        event.clientX - session.startX,
        event.clientY - session.startY,
      ) <= 8) {
        onSelect(coordinateFromClient(event.clientX, event.clientY));
      }
    };

    const up = (event: globalThis.PointerEvent) => finish(event, false);
    const cancel = (event: globalThis.PointerEvent) => finish(event, true);
    window.addEventListener('pointermove', move, { capture: true, passive: false });
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', cancel, true);
    return () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', cancel, true);
      if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current);
      pointerRef.current = null;
      dragCoordinateRef.current = null;
    };
  }, [coordinateFromClient, onSelect, render]);

  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const step = event.shiftKey ? 5 : 1;
    const next = { ...selected };
    if (event.key === 'ArrowLeft') next.longitude = wrapLongitude(next.longitude - step);
    else if (event.key === 'ArrowRight') next.longitude = wrapLongitude(next.longitude + step);
    else if (event.key === 'ArrowUp') next.latitude = clamp(next.latitude + step, -85, 85);
    else if (event.key === 'ArrowDown') next.latitude = clamp(next.latitude - step, -85, 85);
    else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      commitFollowing(false);
      commitView({ center: selected, zoom: clamp(mapView.zoom * 1.35, 1, 16), mode: 'custom' });
      return;
    } else if (event.key === '-') {
      event.preventDefault();
      commitFollowing(false);
      commitView({ center: selected, zoom: clamp(mapView.zoom / 1.35, 1, 16), mode: 'custom' });
      return;
    } else if (event.key === 'Home') {
      event.preventDefault();
      commitFollowing(false);
      commitView(INITIAL_VIEW);
      return;
    } else return;
    event.preventDefault();
    onSelect(next);
  };

  const changeZoom = (factor: number) => {
    commitFollowing(false);
    commitView({
      center: selected,
      zoom: clamp(mapView.zoom * factor, 1, 16),
      mode: 'custom',
    });
  };

  const visibleLandmarks = !result && mapView.zoom >= 2
    ? landmarks.filter((landmark) =>
        coordinateVisibleInViewport(landmark, 1000, 500, mapView, 0.04)).slice(0, 5)
    : [];
  const activeMoment = result
    ? highlights.filter((highlight) => highlight.progress <= reportedProgress + 0.01).at(-1)
    : undefined;

  return (
    <div className="world-map-stage" data-testid="world-map-stage">
      <div className="map-view-toolbar" aria-label={text.dragHint} data-milos-actions>
        <button type="button" aria-label={text.zoomOut} onClick={() => changeZoom(1 / 1.35)}>{'\u2212'}</button>
        <output aria-live="polite">{text.zoomLevel(mapView.zoom)}</output>
        <button type="button" aria-label={text.zoomIn} onClick={() => changeZoom(1.35)}>+</button>
        <button
          type="button"
          className={mapView.mode === 'country' ? 'is-active' : ''}
          aria-pressed={mapView.mode === 'country'}
          onClick={() => {
            commitFollowing(false);
            const country = countryViewportForCoordinate(selected);
            commitView({ ...country, mode: 'country' });
          }}
        >
          {text.countryView}
        </button>
        <button
          type="button"
          className={mapView.mode === 'world' ? 'is-active' : ''}
          aria-pressed={mapView.mode === 'world'}
          onClick={() => {
            commitFollowing(false);
            commitView(INITIAL_VIEW);
          }}
        >
          {text.worldView}
        </button>
        {result && (
          <>
            <button
              type="button"
              className={following ? 'is-active' : ''}
              aria-pressed={following}
              onClick={() => commitFollowing(!following)}
            >
              {text.followFlight}
            </button>
            <button
              type="button"
              onClick={() => {
                commitFollowing(false);
                commitView({ ...coordinatesFitViewport(result.points, 8, 0.68), mode: 'route' });
              }}
            >
              {text.fitRoute}
            </button>
          </>
        )}
      </div>
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
        data-map-zoom={mapView.zoom.toFixed(2)}
        data-view-mode={mapView.mode}
        data-auto-fit={result ? 'enabled' : 'idle'}
        data-drag-state={dragging ? 'dragging' : 'idle'}
        data-wind-overlay={windReading ? 'visible' : 'hidden'}
        data-follow-flight={following ? 'true' : 'false'}
        data-visible-landmark-count={visibleLandmarks.length}
        data-selected-key={`${selected.latitude.toFixed(3)},${selected.longitude.toFixed(3)}`}
        data-selected-latitude={selected.latitude.toFixed(3)}
        data-selected-longitude={selected.longitude.toFixed(3)}
        aria-label={`${label} ${text.dragHint}`}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        tabIndex={0}
      />
      {visibleLandmarks.length > 0 && (
        <div className="map-landmark-strip" data-testid="map-landmark-strip">
          <small>{text.discoveries}</small>
          <ul>
            {visibleLandmarks.map((landmark) => <li key={landmark.id}>{landmark.name}</li>)}
          </ul>
        </div>
      )}
      {activeMoment && (
        <div className="flight-moment" role="status" data-testid="flight-moment">
          <small>{text.momentKicker}</small>
          <strong>{activeMoment.name}</strong>
          <span>{text.momentNear(activeMoment.distanceKm)} · {text.momentTime(activeMoment.elapsedHours)}</span>
        </div>
      )}
    </div>
  );
}
