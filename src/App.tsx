import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DrawingCanvas } from './components/DrawingCanvas';
import { FlightReadout } from './components/FlightReadout';
import { OutlinePicker } from './components/OutlinePicker';
import { RouteHighlights } from './components/RouteHighlights';
import { WindScout } from './components/WindScout';
import { WorldMap } from './components/WorldMap';
import { copy, type SupportedLanguage } from './copy';
import { drawingPreset, drawingPresets } from './data/drawing-presets';
import {
  coarseCoordinate,
  DEFAULT_PLACE,
  localizePlace,
  nearestPlace,
  searchPlaces,
} from './data/places';
import { createResultImage, downloadFile } from './lib/export';
import { haversineKm, roundedCoordinateLabel } from './lib/geometry';
import { routeHighlights } from './lib/route-highlights';
import { OBJECT_PROFILES, simulateRoute } from './lib/simulation';
import {
  clearState,
  DEFAULT_STATE,
  loadState,
  saveState,
  STORAGE_KEY,
} from './lib/storage';
import {
  createDemoWindSnapshot,
  fetchWindSnapshot,
  OPEN_METEO_ATTRIBUTION_URL,
  WindRequestError,
} from './lib/wind';
import { windReadings } from './lib/wind-insight';
import type {
  MilosPlaceResult,
  MilosPlaceSearchElement,
  MilosShareButtonElement,
} from './milos-app-essentials';
import type {
  Coordinate,
  DrawingStroke,
  MotionPreference,
  ObjectType,
  Place,
  RouteResult,
  ThemePreference,
  WindBoost,
  WindSnapshot,
} from './types';

declare global {
  var milosAppEssentials: {
    ready(): void;
  } | undefined;
}

type FlightStatus = 'idle' | 'loading' | 'result' | 'error';
type WindPreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AppProps {
  initialLanguage: SupportedLanguage;
}

function appShareUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}

function placeContext(place: Place): string {
  return [place.region, place.country].filter(Boolean).join(' · ');
}

function coordinateKey(coordinate: Coordinate): string {
  const coarse = coarseCoordinate(coordinate);
  return `${coarse.latitude.toFixed(2)},${coarse.longitude.toFixed(2)}`;
}

function essentialsPlace(place: Place): MilosPlaceResult {
  return {
    id: place.id,
    name: place.name,
    region: place.region ?? '',
    country: place.country,
    countryCode: place.countryCode ?? '',
    latitude: place.latitude,
    longitude: place.longitude,
    type: place.type ?? 'place',
    ...(place.timeZone ? { timeZone: place.timeZone } : {}),
  };
}

function isFirstVisit(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return true;
  }
}

function namedPlace(coordinate: Coordinate, language: SupportedLanguage): Place {
  const coarse = coarseCoordinate(coordinate);
  const nearest = nearestPlace(coarse);
  if (haversineKm(coarse, nearest) < 160) {
    return localizePlace({
      id: `near-${nearest.id}-${coarse.latitude}-${coarse.longitude}`,
      name: nearest.name,
      country: nearest.country,
      ...coarse,
    }, language, copy[language].map);
  }
  return {
    id: `map-${coarse.latitude}-${coarse.longitude}`,
    name: copy[language].map.point,
    country: roundedCoordinateLabel(coarse),
    ...coarse,
  };
}

function routeEndLabel(result: RouteResult, language: SupportedLanguage): string {
  const end = result.points.at(-1) ?? result.points[0];
  const place = localizePlace(nearestPlace(end), language, copy[language].map);
  return copy[language].result.near(place.name);
}

function defaultComparisonType(primary: ObjectType): ObjectType {
  if (primary === 'cloud') return 'seed';
  if (primary === 'balloon') return 'paper-plane';
  return 'cloud';
}

function playWindTone(): void {
  const AudioContextClass = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const audio = new AudioContextClass();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(174, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(246, audio.currentTime + 1.2);
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.035, audio.currentTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 1.35);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 1.4);
  oscillator.addEventListener('ended', () => audio.close());
}

function qaTimeout(): number {
  const qaWindow = window as typeof window & { __WOLKENPOST_QA_TIMEOUT__?: number };
  const requested = qaWindow.__WOLKENPOST_QA_TIMEOUT__;
  return navigator.webdriver && typeof requested === 'number'
    ? Math.max(50, Math.min(8000, requested))
    : 8000;
}

export default function App({ initialLanguage: language }: AppProps) {
  const text = copy[language];
  const locale = language === 'de' ? 'de-DE' : 'en-GB';
  const initial = useMemo(() => loadState(), []);
  const firstVisit = useMemo(isFirstVisit, []);
  const [objectType, setObjectType] = useState<ObjectType>(initial.objectType);
  const [strokes, setStrokes] = useState<DrawingStroke[]>(
    firstVisit ? drawingPreset(initial.objectType, undefined, 'welcome') : initial.drawing,
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    firstVisit ? drawingPresets(initial.objectType)[0].id : null,
  );
  const [start, setStart] = useState<Place>(() =>
    localizePlace(initial.lastStart ?? DEFAULT_PLACE, language, text.map));
  const [motion, setMotion] = useState<MotionPreference>(initial.motion);
  const [theme, setTheme] = useState<ThemePreference>(initial.theme);
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled);
  const [windBoost, setWindBoost] = useState<WindBoost>(initial.windBoost);
  const [flightStatus, setFlightStatus] = useState<FlightStatus>('idle');
  const [errorKind, setErrorKind] = useState<WindRequestError['kind']>('network');
  const [result, setResult] = useState<RouteResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<RouteResult | null>(null);
  const [comparisonObjectType, setComparisonObjectType] = useState<ObjectType>(
    defaultComparisonType(initial.objectType),
  );
  const [windSnapshot, setWindSnapshot] = useState<WindSnapshot | null>(null);
  const [windPreviewSnapshot, setWindPreviewSnapshot] = useState<WindSnapshot | null>(null);
  const [windPreviewKey, setWindPreviewKey] = useState<string | null>(null);
  const [windPreviewStatus, setWindPreviewStatus] = useState<WindPreviewStatus>('idle');
  const [windPreviewErrorKind, setWindPreviewErrorKind] = useState<WindRequestError['kind']>('network');
  const [flightProgress, setFlightProgress] = useState(1);
  const [replayToken, setReplayToken] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [announcement, setAnnouncement] = useState<string>(text.announcements.ready);
  const [storageWarning, setStorageWarning] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const previewTimerRef = useRef<number | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const flightSpaceRef = useRef<HTMLDivElement>(null);
  const placeSearchRef = useRef<MilosPlaceSearchElement>(null);
  const shareRef = useRef<MilosShareButtonElement>(null);
  const reportFlightProgress = useCallback((progress: number) => {
    setFlightProgress(progress);
  }, []);

  useEffect(() => {
    let active = true;
    const markReady = () => {
      if (active && globalThis.milosAppEssentials) {
        globalThis.milosAppEssentials.ready();
      }
    };

    if (globalThis.milosAppEssentials) {
      markReady();
    } else {
      void customElements.whenDefined('milos-share-button').then(markReady);
    }

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.title = text.documentTitle;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute('content', text.metaDescription);
  }, [language, text.documentTitle, text.metaDescription]);

  useEffect(() => {
    setStart((current) => localizePlace(current, language, text.map));
    setAnnouncement(text.announcements.ready);
  }, [language, text.announcements.ready, text.map]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      setAnnouncement(text.announcements.connectionRestored);
    };
    const onOffline = () => {
      setOnline(false);
      setAnnouncement(text.announcements.offline);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [text.announcements.connectionRestored, text.announcements.offline]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const saved = saveState({
        version: 1,
        drawing: strokes,
        objectType,
        lastStart: start,
        motion,
        theme,
        soundEnabled,
        windBoost,
      });
      setStorageWarning(!saved);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [motion, objectType, soundEnabled, start, strokes, theme, windBoost]);

  useEffect(() => () => {
    abortRef.current?.abort();
    previewAbortRef.current?.abort();
    if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current);
  }, []);

  const clearFlightResult = () => {
    setResult(null);
    setComparisonResult(null);
    setWindSnapshot(null);
    setFlightProgress(1);
    setFlightStatus('idle');
  };

  const clearWindPreview = () => {
    previewAbortRef.current?.abort();
    previewAbortRef.current = null;
    setWindPreviewSnapshot(null);
    setWindPreviewKey(null);
    setWindPreviewStatus('idle');
  };

  const changeObjectType = (next: ObjectType) => {
    setObjectType(next);
    setSelectedPresetId(null);
    setComparisonObjectType(defaultComparisonType(next));
    clearFlightResult();
    setAnnouncement(text.announcements.objectSelected(text.objectTypes[next].label));
  };

  const selectStart = (place: Place) => {
    setStart(place);
    clearFlightResult();
    clearWindPreview();
    setAnnouncement(text.announcements.startSelected(place.name));
    if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current);
    if (navigator.onLine) {
      previewTimerRef.current = window.setTimeout(() => {
        previewTimerRef.current = null;
        void inspectWind(place);
      }, 420);
    }
  };

  const selectMapCoordinate = (coordinate: Coordinate) =>
    selectStart(namedPlace(coordinate, language));

  useEffect(() => {
    let cancelled = false;
    let element: MilosPlaceSearchElement | null = null;
    const onPlaceChange = (event: Event) => {
      selectStart((event as CustomEvent<MilosPlaceResult>).detail);
    };

    void customElements.whenDefined('milos-place-search').then(() => {
      if (cancelled || !placeSearchRef.current) return;
      element = placeSearchRef.current;
      element.setSearchProvider(({ query: placeQuery, locale: requestedLocale, signal }) => {
        if (signal.aborted) throw new DOMException('cancelled', 'AbortError');
        return searchPlaces(placeQuery, requestedLocale).map(essentialsPlace);
      });
      element.setLocateProvider(({ locale: requestedLocale }) => new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          setAnnouncement(copy[requestedLocale].announcements.geolocationUnsupported);
          reject(new DOMException('unsupported', 'NotSupportedError'));
          return;
        }
        setAnnouncement(copy[requestedLocale].announcements.geolocationPrompt);
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(essentialsPlace(namedPlace({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }, requestedLocale))),
          (error) => {
            const message = error.code === error.PERMISSION_DENIED
              ? copy[requestedLocale].announcements.geolocationDenied
              : error.code === error.TIMEOUT
                ? copy[requestedLocale].announcements.geolocationTimeout
                : copy[requestedLocale].announcements.geolocationUnavailable;
            setAnnouncement(message);
            reject(error);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
        );
      }));
      element.addEventListener('milosapps:placechange', onPlaceChange);
    });

    return () => {
      cancelled = true;
      element?.removeEventListener('milosapps:placechange', onPlaceChange);
    };
  }, [language]);

  const applyResult = (nextResult: RouteResult, snapshot: WindSnapshot) => {
    const endLabel = routeEndLabel(nextResult, language);
    setWindSnapshot(snapshot);
    setResult(nextResult);
    setComparisonResult(null);
    setComparisonObjectType(defaultComparisonType(nextResult.objectType));
    setFlightStatus('result');
    setAnnouncement(
      text.announcements.routeReady(Math.round(nextResult.distanceKm), endLabel),
    );
    window.setTimeout(() => {
      flightSpaceRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
      resultHeadingRef.current?.focus({ preventScroll: true });
    }, 50);
  };

  async function inspectWind(place: Place = start) {
    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;
    setWindPreviewStatus('loading');
    setWindPreviewSnapshot(null);
    setAnnouncement(text.windScout.loading);
    try {
      const snapshot = await fetchWindSnapshot(place, {
        signal: controller.signal,
        timeoutMs: qaTimeout(),
      });
      if (previewAbortRef.current !== controller) return;
      setWindPreviewSnapshot(snapshot);
      setWindPreviewKey(coordinateKey(place));
      setWindPreviewStatus('ready');
      setAnnouncement(text.announcements.windPreviewReady(place.name));
    } catch (error) {
      if (previewAbortRef.current !== controller) return;
      const requestError = error instanceof WindRequestError
        ? error
        : new WindRequestError('Unbekannter Fehler beim Windabruf.', 'network');
      setWindPreviewErrorKind(requestError.kind);
      setWindPreviewStatus('error');
      setAnnouncement(text.windErrors[requestError.kind]);
    } finally {
      if (previewAbortRef.current === controller) previewAbortRef.current = null;
    }
  }

  const cancelWindPreview = () => {
    previewAbortRef.current?.abort();
    previewAbortRef.current = null;
    setWindPreviewStatus('idle');
    setAnnouncement(text.announcements.windPreviewCancelled);
  };

  const startLiveFlight = async () => {
    if (!strokes.length || flightStatus === 'loading') return;
    previewAbortRef.current?.abort();
    previewAbortRef.current = null;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFlightStatus('loading');
    setResult(null);
    setComparisonResult(null);
    setWindSnapshot(null);
    setAnnouncement(text.announcements.liveLoading);
    if (soundEnabled) playWindTone();
    try {
      const preparedSnapshot = windPreviewStatus === 'ready'
        && windPreviewSnapshot
        && windPreviewKey === coordinateKey(start)
        ? windPreviewSnapshot
        : null;
      const snapshot = preparedSnapshot ?? await fetchWindSnapshot(start, {
          signal: controller.signal,
          timeoutMs: qaTimeout(),
        });
      if (abortRef.current !== controller) return;
      applyResult(
        simulateRoute(start, start.name, objectType, snapshot.fields[OBJECT_PROFILES[objectType].level], windBoost),
        snapshot,
      );
    } catch (error) {
      if (abortRef.current !== controller) return;
      const requestError = error instanceof WindRequestError
        ? error
        : new WindRequestError('Unbekannter Fehler beim Windabruf.', 'network');
      setErrorKind(requestError.kind);
      setFlightStatus('error');
      setAnnouncement(text.windErrors[requestError.kind]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const cancelFlight = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setFlightStatus('idle');
    setAnnouncement(text.announcements.windCancelled);
  };

  const startDemoFlight = () => {
    if (!strokes.length) return;
    if (soundEnabled) playWindTone();
    const snapshot = createDemoWindSnapshot(start);
    applyResult(
      simulateRoute(start, start.name, objectType, snapshot.fields[OBJECT_PROFILES[objectType].level], windBoost),
      snapshot,
    );
  };

  const startComparisonFlight = () => {
    if (!result || !windSnapshot || comparisonObjectType === result.objectType) return;
    const field = windSnapshot.fields[OBJECT_PROFILES[comparisonObjectType].level];
    const next = simulateRoute(start, start.name, comparisonObjectType, field, windBoost);
    setComparisonResult(next);
    setReplayToken((current) => current + 1);
    setAnnouncement(text.announcements.comparisonReady(
      text.objectTypes[comparisonObjectType].label,
      Math.round(next.distanceKm),
    ));
  };

  const saveImage = async () => {
    if (!result || exporting) return;
    setExporting(true);
    try {
      const file = await createResultImage(
        { ...result, endLabel: routeEndLabel(result, language) },
        strokes,
        language,
      );
      downloadFile(file);
      setAnnouncement(text.announcements.imageSaved);
    } catch {
      setAnnouncement(text.announcements.imageFailed);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    let element: MilosShareButtonElement | null = null;
    const onComplete = (event: Event) => {
      const method = (event as CustomEvent<{ method?: string }>).detail?.method;
      if (method === 'clipboard') setAnnouncement(text.announcements.shareCopied);
    };
    const onError = () => setAnnouncement(text.announcements.shareFailed);

    void customElements.whenDefined('milos-share-button').then(() => {
      if (cancelled || !shareRef.current) return;
      element = shareRef.current;
      element.setPayloadProvider(async () => {
        setExporting(true);
        try {
          const endLabel = routeEndLabel(result, language);
          const file = await createResultImage({ ...result, endLabel }, strokes, language);
          return {
            title: text.share.title,
            text: text.share.text(Math.round(result.distanceKm), endLabel),
            url: appShareUrl(),
            files: [file],
          };
        } finally {
          setExporting(false);
        }
      });
      element.addEventListener('milosapps:sharecomplete', onComplete);
      element.addEventListener('milosapps:shareerror', onError);
    });

    return () => {
      cancelled = true;
      element?.removeEventListener('milosapps:sharecomplete', onComplete);
      element?.removeEventListener('milosapps:shareerror', onError);
    };
  }, [language, result, strokes, text.announcements.shareCopied, text.announcements.shareFailed, text.share]);

  const resetLocalData = () => {
    clearState();
    abortRef.current?.abort();
    previewAbortRef.current?.abort();
    setObjectType(DEFAULT_STATE.objectType);
    setStrokes([]);
    setSelectedPresetId(null);
    setStart(localizePlace(DEFAULT_STATE.lastStart, language, text.map));
    setMotion(DEFAULT_STATE.motion);
    setTheme(DEFAULT_STATE.theme);
    setSoundEnabled(DEFAULT_STATE.soundEnabled);
    setWindBoost(DEFAULT_STATE.windBoost);
    setResult(null);
    setComparisonResult(null);
    setWindSnapshot(null);
    setWindPreviewSnapshot(null);
    setWindPreviewKey(null);
    setWindPreviewStatus('idle');
    setComparisonObjectType(defaultComparisonType(DEFAULT_STATE.objectType));
    setFlightProgress(1);
    setFlightStatus('idle');
    setResetArmed(false);
    setAnnouncement(text.announcements.dataDeleted);
  };

  const profileLevelText = (type: ObjectType): string => {
    const level = OBJECT_PROFILES[type].level;
    if (level === '10m') return text.flightSpace.level10m;
    if (level === '925hPa') return text.flightSpace.level925hPa;
    return text.flightSpace.level850hPa;
  };

  const comparisonDistance = result && comparisonResult
    ? Math.abs(Math.round(comparisonResult.distanceKm - result.distanceKm))
    : 0;
  const activeRouteHighlights = useMemo(
    () => routeHighlights(result, language, text.map),
    [language, result, text.map],
  );
  const activeWindReadings = useMemo(
    () => windReadings(windPreviewSnapshot, start),
    [start, windPreviewSnapshot],
  );
  const selectedWindReading = activeWindReadings.find(
    (reading) => reading.level === OBJECT_PROFILES[objectType].level,
  );

  return (
    <div
      className="app-content"
      data-milos-layout="compact"
      data-milos-profile="guided-flow"
      data-milos-app-key="cloud-post"
    >
        <section className="hero" id="top" data-milos-intro>
          <div className="hero-copy" data-milos-intro-copy>
            <div className="hero-status-row">
            <p className="eyebrow" data-milos-eyebrow>{text.hero.eyebrow}</p>
              <span
                className={`connection-pill ${online ? '' : 'is-offline'}`}
                data-testid="connection-status"
              >
                <span className="connection-dot" aria-hidden="true" />
                {online ? text.shell.ready : text.shell.offline}
              </span>
            </div>
            <h1>{text.hero.heading}</h1>
            <p className="hero-lead" data-milos-lead>{text.hero.lead}</p>
          </div>
          <div className="hero-orbit" data-milos-intro-icon aria-hidden="true">
            <span className="hero-cloud">☁</span>
            <span className="hero-trail" />
          </div>
        </section>

        <div className="journey-layout" data-milos-primary-work data-milos-panel>
          <section className="step-card drawing-step" id="zeichnen" aria-labelledby="drawing-heading">
            <div className="step-heading" data-milos-step>
              <span className="step-number" aria-hidden="true" data-milos-step-index>1</span>
              <div>
                <p className="step-kicker">{text.drawing.kicker}</p>
                <h2 id="drawing-heading">{text.drawing.heading}</h2>
              </div>
            </div>

            <div className="object-picker" role="radiogroup" aria-label={text.drawing.groupLabel}>
              {(Object.keys(text.objectTypes) as ObjectType[]).map((type) => (
                <button
                  key={type}
                  className={`object-option ${objectType === type ? 'is-selected' : ''}`}
                  role="radio"
                  aria-checked={objectType === type}
                  onClick={() => changeObjectType(type)}
                  type="button"
                >
                  <span className={`object-symbol object-${type}`} aria-hidden="true">
                    {type === 'cloud' ? '☁' : type === 'balloon' ? '◉' : type === 'seed' ? '❧' : '➤'}
                  </span>
                  <span>
                    <strong>{text.objectTypes[type].label}</strong>
                    <small>{text.objectTypes[type].hint}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="outline-selector">
              <div>
                <strong>{text.drawing.outlinesHeading}</strong>
                <span>{text.drawing.outlinesHint}</span>
              </div>
              <OutlinePicker
                presets={drawingPresets(objectType)}
                labels={text.drawing.outlineLabels[objectType]}
                groupLabel={text.drawing.outlinesGroup}
                selectedId={selectedPresetId}
                onSelect={(preset) => {
                  const outlineIndex = drawingPresets(objectType).findIndex((entry) => entry.id === preset.id);
                  setStrokes(drawingPreset(objectType, preset.id));
                  setSelectedPresetId(preset.id);
                  clearFlightResult();
                  setAnnouncement(text.announcements.outlineSelected(
                    text.drawing.outlineLabels[objectType][outlineIndex],
                  ));
                }}
              />
            </div>

            <DrawingCanvas
              strokes={strokes}
              labels={text.drawing}
              onChange={(next) => {
                setStrokes(next);
                setSelectedPresetId(null);
                clearFlightResult();
                setAnnouncement(text.announcements.strokesSaved(next.length));
              }}
              onUndo={() => {
                setStrokes((current) => current.slice(0, -1));
                setSelectedPresetId(null);
                clearFlightResult();
                setAnnouncement(text.announcements.strokeUndone);
              }}
            />
            <div className="drawing-actions" data-milos-actions>
              <button
                className="text-button"
                type="button"
                disabled={!strokes.length}
                onClick={() => {
                  setStrokes((current) => current.slice(0, -1));
                  setSelectedPresetId(null);
                  clearFlightResult();
                }}
              >
                {text.drawing.undo}
              </button>
              <button
                className="text-button"
                type="button"
                disabled={!strokes.length}
                onClick={() => {
                  setStrokes([]);
                  setSelectedPresetId(null);
                  clearFlightResult();
                  setAnnouncement(text.announcements.canvasCleared);
                }}
              >
                {text.drawing.clear}
              </button>
            </div>
          </section>

          <section className="step-card map-step" aria-labelledby="map-heading">
            <div className="step-heading" data-milos-step>
              <span className="step-number" aria-hidden="true" data-milos-step-index>2</span>
              <div>
                <p className="step-kicker">{text.map.kicker}</p>
                <h2 id="map-heading">{text.map.heading}</h2>
                <p className="map-detail">{text.map.detail}</p>
              </div>
            </div>

            <div className="flight-space" ref={flightSpaceRef} data-testid="flight-space">
              <WorldMap
                selected={start}
                result={result}
                comparisonResult={comparisonResult}
                highlights={activeRouteHighlights}
                drawing={strokes}
                windReading={selectedWindReading}
                motion={motion}
                theme={theme}
                onSelect={selectMapCoordinate}
                label={text.map.canvasLabel}
                routeLensLabel={text.flightSpace.routeLens}
                text={text.map}
                replayToken={replayToken}
                onProgress={reportFlightProgress}
              />

              {result && (
                <section className="result-section" aria-labelledby="result-heading" data-milos-result>
                  <div className="flight-space-heading">
                    <div>
                      <p className="step-kicker">{text.flightSpace.kicker}</p>
                      <h2 id="result-heading" ref={resultHeadingRef} tabIndex={-1}>
                        {text.result.arrived(routeEndLabel(result, language))}
                      </h2>
                    </div>
                    <span className={`source-badge ${result.source.kind === 'demo' ? 'is-demo' : ''}`}>
                      {result.source.kind === 'live' ? text.result.liveData : text.result.demoData}
                    </span>
                  </div>
                  <p className="model-boundary">{text.flightSpace.modelBoundary}</p>
                  {result.windBoost > 1 && (
                    <p className="play-wind-result" data-testid="play-wind-result">
                      {text.flightSpace.boostActive(result.windBoost)}
                    </p>
                  )}

                  <FlightReadout
                    primary={result}
                    comparison={comparisonResult}
                    progress={flightProgress}
                    language={language}
                    startLabel={start.name}
                  />

                  <RouteHighlights
                    highlights={activeRouteHighlights}
                    text={text.routeHighlights}
                  />

                  <div className="flight-toolbar" data-milos-actions>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => setReplayToken((current) => current + 1)}
                    >
                      {comparisonResult ? text.comparison.replayBoth : text.flightSpace.replay}
                    </button>
                    <span>
                      {text.comparison.sameSnapshot}: {' '}
                      <strong>
                        {new Date(result.source.forecastStart).toLocaleString(locale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: 'UTC',
                        })} UTC
                      </strong>
                    </span>
                  </div>

                  <section className="comparison-lab" aria-labelledby="comparison-heading">
                    <div>
                      <p className="step-kicker">{text.comparison.kicker}</p>
                      <h3 id="comparison-heading">{text.comparison.heading}</h3>
                      <p>{text.comparison.description}</p>
                    </div>
                    <div className="comparison-controls">
                      <label>
                        {text.comparison.select}
                        <select
                          value={comparisonObjectType}
                          onChange={(event) => {
                            setComparisonObjectType(event.target.value as ObjectType);
                            setComparisonResult(null);
                          }}
                        >
                          {(Object.keys(text.objectTypes) as ObjectType[])
                            .filter((type) => type !== result.objectType)
                            .map((type) => (
                              <option key={type} value={type}>{text.objectTypes[type].label}</option>
                            ))}
                        </select>
                      </label>
                      <div className="comparison-prediction">
                        <small>{text.comparison.prediction}</small>
                        <strong>{text.objectTypes[comparisonObjectType].label}</strong>
                        <span>
                          {text.comparison.predictionLead} {profileLevelText(comparisonObjectType)}, {' '}
                          {OBJECT_PROFILES[comparisonObjectType].hours.toLocaleString(locale)} h.
                        </span>
                      </div>
                      <button className="primary-button" type="button" onClick={startComparisonFlight}>
                        {text.comparison.compare}
                      </button>
                    </div>
                    {comparisonResult && (
                      <div className="comparison-outcome" role="status">
                        <small>{text.comparison.outcome}</small>
                        <strong>
                          {text.comparison.distanceDifference(
                            text.objectTypes[comparisonResult.objectType].label,
                            comparisonDistance,
                            comparisonResult.distanceKm >= result.distanceKm
                              ? text.comparison.farther
                              : text.comparison.shorter,
                          )}
                        </strong>
                        <span>{text.comparison.cause}</span>
                      </div>
                    )}
                  </section>

                  <div className="result-metrics">
                    <article>
                      <small>{text.result.distance}</small>
                      <strong>{Math.round(result.distanceKm).toLocaleString(locale)} km</strong>
                    </article>
                    <article>
                      <small>{text.result.duration}</small>
                      <strong>{result.durationHours.toLocaleString(locale)} h</strong>
                    </article>
                    <article>
                      <small>{text.result.average}</small>
                      <strong>{Math.round(result.averageSpeedKmh)} km/h</strong>
                    </article>
                    <article>
                      <small>{text.result.maximum}</small>
                      <strong>{Math.round(result.maxSpeedKmh)} km/h</strong>
                    </article>
                  </div>
                  <div className="result-source">
                    <div>
                      <span>{text.result.source}</span>
                      <strong>
                        {result.source.kind === 'demo'
                          ? (language === 'de'
                              ? `${result.source.label} · ${result.source.model}`
                              : 'Demo wind · synthetic test field')
                          : `${result.source.label} · ${result.source.model}`}
                      </strong>
                    </div>
                    <div>
                      <span>{text.result.from(start.name)}</span>
                      <strong>{routeEndLabel(result, language)}</strong>
                    </div>
                  </div>
                  <div className="result-actions" data-milos-actions>
                    <button className="primary-button" type="button" onClick={saveImage} disabled={exporting}>
                      {exporting ? text.result.exporting : text.result.save}
                    </button>
                    <milos-share-button ref={shareRef} primary="" />
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => {
                        clearFlightResult();
                        document.getElementById('zeichnen')?.scrollIntoView({ behavior: motion === 'reduced' ? 'auto' : 'smooth' });
                      }}
                    >
                      {text.result.again}
                    </button>
                  </div>
                </section>
              )}
            </div>

            <div className="map-planning-grid">
              <div className="location-planner">
                <div className="selected-place" aria-live="polite">
                  <span className="place-pin" aria-hidden="true">●</span>
                  <span>
                    <small>{text.map.selected}</small>
                    <strong>{start.name}</strong>
                    <span>{placeContext(start)}</span>
                  </span>
                </div>

                <div className="place-tools">
                  <milos-place-search
                    key={language}
                    ref={placeSearchRef}
                    label-de={copy.de.map.search}
                    label-en={copy.en.map.search}
                    placeholder-de={copy.de.map.placeholder}
                    placeholder-en={copy.en.map.placeholder}
                  />
                </div>

                <details className="coordinate-controls">
                  <summary>{text.map.fineTune}</summary>
                  <div>
                    <label>
                      {text.map.latitude} <output>{start.latitude.toFixed(0)}°</output>
                      <input
                        type="range"
                        min="-85"
                        max="85"
                        step="1"
                        value={start.latitude}
                        onChange={(event) => selectMapCoordinate({
                          latitude: Number(event.target.value),
                          longitude: start.longitude,
                        })}
                      />
                    </label>
                    <label>
                      {text.map.longitude} <output>{start.longitude.toFixed(0)}°</output>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={start.longitude}
                        onChange={(event) => selectMapCoordinate({
                          latitude: start.latitude,
                          longitude: Number(event.target.value),
                        })}
                      />
                    </label>
                  </div>
                </details>
              </div>

              <WindScout
                status={windPreviewStatus}
                readings={activeWindReadings}
                objectType={objectType}
                dataTime={windPreviewSnapshot?.forecastStart}
                locale={locale}
                text={text.windScout}
                error={windPreviewStatus === 'error' ? text.windErrors[windPreviewErrorKind] : undefined}
                onCheck={() => void inspectWind(start)}
                onCancel={cancelWindPreview}
                windBoost={windBoost}
                onWindBoostChange={(next) => {
                  setWindBoost(next);
                  clearFlightResult();
                }}
              />
            </div>
          </section>
        </div>

        <section className="launch-panel" aria-labelledby="launch-heading" data-milos-command-dock>
          <div>
            <p className="step-kicker">{text.launch.kicker}</p>
            <h2 id="launch-heading">{text.launch.heading}</h2>
            <p>{text.launch.description}</p>
          </div>
          {flightStatus === 'loading' ? (
            <div className="loading-actions" role="status">
              <span className="wind-loader" aria-hidden="true" />
              <span>{text.launch.loading}</span>
              <button type="button" className="text-button on-dark" onClick={cancelFlight}>
                {text.launch.cancel}
              </button>
            </div>
          ) : (
            <button
              className="launch-button"
              type="button"
              onClick={startLiveFlight}
              disabled={!strokes.length}
            >
              <span>{text.launch.start}</span>
              <span aria-hidden="true">→</span>
            </button>
          )}
          {!strokes.length && <p className="launch-hint">{text.launch.missingDrawing}</p>}
        </section>

        {flightStatus === 'error' && (
          <section className="state-panel error-panel" role="alert" aria-labelledby="wind-error-heading" data-milos-result>
            <div className="state-symbol" aria-hidden="true">↯</div>
            <div>
              <p className="step-kicker">{text.errorPanel.kicker}</p>
              <h2 id="wind-error-heading">{text.windErrors[errorKind]}</h2>
              <p>{text.errorPanel.demoExplanation}</p>
              <div className="state-actions">
                <button className="primary-button" type="button" onClick={startLiveFlight}>
                  {text.errorPanel.retry}
                </button>
                <button className="secondary-button" type="button" onClick={startDemoFlight}>
                  {text.errorPanel.demo}
                </button>
              </div>
            </div>
          </section>
        )}

        <details className="settings-disclosure" data-milos-secondary>
          <summary>{text.settings.summary}</summary>
          <section className="settings-section" aria-labelledby="settings-heading" data-milos-settings>
          <div data-milos-settings-intro>
            <p className="step-kicker">{text.settings.kicker}</p>
            <h2 id="settings-heading">{text.settings.heading}</h2>
            <p>{text.settings.description}</p>
          </div>
          <div className="settings-grid" data-milos-settings-controls>
            <label data-milos-settings-control>
              {text.settings.theme}
              <select value={theme} onChange={(event) => setTheme(event.target.value as ThemePreference)}>
                <option value="system">{text.settings.themeSystem}</option>
                <option value="light">{text.settings.themeLight}</option>
                <option value="dark">{text.settings.themeDark}</option>
              </select>
            </label>
            <label data-milos-settings-control>
              {text.settings.motion}
              <select value={motion} onChange={(event) => setMotion(event.target.value as MotionPreference)}>
                <option value="system">{text.settings.motionSystem}</option>
                <option value="full">{text.settings.motionFull}</option>
                <option value="reduced">{text.settings.motionReduced}</option>
              </select>
            </label>
            <label className="switch-label" data-milos-settings-control>
              <span>
                {text.settings.sound}
                <small>{text.settings.soundHint}</small>
              </span>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(event) => setSoundEnabled(event.target.checked)}
              />
            </label>
            <div className="reset-row" data-milos-settings-danger>
              {!resetArmed ? (
                <button className="text-button danger" type="button" onClick={() => setResetArmed(true)}>
                  {text.settings.delete}
                </button>
              ) : (
                <div className="reset-confirm" role="group" aria-label={text.settings.deleteGroup}>
                  <span>{text.settings.deleteQuestion}</span>
                  <button className="danger-button" type="button" onClick={resetLocalData}>
                    {text.settings.deleteConfirm}
                  </button>
                  <button className="text-button" type="button" onClick={() => setResetArmed(false)}>
                    {text.settings.cancel}
                  </button>
                </div>
              )}
            </div>
          </div>
          {storageWarning && (
            <p className="storage-warning" role="alert">
              {text.settings.storageWarning}
            </p>
          )}
          </section>
        </details>

        <aside className="credits-bar" aria-label={text.footer.credits}>
          <a href="https://dev.milos-apps.de/datenschutz" data-milos-privacy-info>
            {text.footer.privacy}
          </a>
          <a href={OPEN_METEO_ATTRIBUTION_URL} target="_blank" rel="noreferrer">
            {text.footer.wind}
          </a>
          <span>{text.footer.ownWork}</span>
          <span>{text.footer.disclaimer}</span>
        </aside>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </div>
  );
}
