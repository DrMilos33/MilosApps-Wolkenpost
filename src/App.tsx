import { useEffect, useMemo, useRef, useState } from 'react';
import { DrawingCanvas } from './components/DrawingCanvas';
import { WorldMap } from './components/WorldMap';
import { copy } from './copy';
import { drawingPreset } from './data/drawing-presets';
import {
  coarseCoordinate,
  DEFAULT_PLACE,
  nearestPlace,
  searchPlaces,
} from './data/places';
import { createResultImage, downloadFile } from './lib/export';
import { haversineKm, roundedCoordinateLabel } from './lib/geometry';
import { simulateRoute } from './lib/simulation';
import {
  clearState,
  DEFAULT_STATE,
  loadState,
  saveState,
  STORAGE_KEY,
} from './lib/storage';
import {
  createDemoWindField,
  fetchWindField,
  OPEN_METEO_ATTRIBUTION_URL,
  WindRequestError,
} from './lib/wind';
import type {
  Coordinate,
  DrawingStroke,
  MotionPreference,
  ObjectType,
  Place,
  RouteResult,
  ThemePreference,
} from './types';

type FlightStatus = 'idle' | 'loading' | 'result' | 'error';
type LocationStatus = 'idle' | 'loading' | 'error';

const text = copy.de;
const OFFLINE_SESSION_KEY = 'milosapps.cloud-post.offline-session';

function namedPlace(coordinate: Coordinate): Place {
  const coarse = coarseCoordinate(coordinate);
  const nearest = nearestPlace(coarse);
  if (haversineKm(coarse, nearest) < 160) {
    return {
      id: `near-${nearest.id}-${coarse.latitude}-${coarse.longitude}`,
      name: nearest.name,
      country: nearest.country,
      ...coarse,
    };
  }
  return {
    id: `map-${coarse.latitude}-${coarse.longitude}`,
    name: 'Punkt auf der Karte',
    country: roundedCoordinateLabel(coarse),
    ...coarse,
  };
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

export default function App() {
  const initial = useMemo(() => loadState(), []);
  const firstVisit = useMemo(() => localStorage.getItem(STORAGE_KEY) === null, []);
  const [objectType, setObjectType] = useState<ObjectType>(initial.objectType);
  const [strokes, setStrokes] = useState<DrawingStroke[]>(
    firstVisit ? drawingPreset(initial.objectType, 'welcome') : initial.drawing,
  );
  const [start, setStart] = useState<Place>(initial.lastStart ?? DEFAULT_PLACE);
  const [motion, setMotion] = useState<MotionPreference>(initial.motion);
  const [theme, setTheme] = useState<ThemePreference>(initial.theme);
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled);
  const [query, setQuery] = useState('');
  const [flightStatus, setFlightStatus] = useState<FlightStatus>('idle');
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [errorKind, setErrorKind] = useState<WindRequestError['kind']>('network');
  const [result, setResult] = useState<RouteResult | null>(null);
  const [online, setOnline] = useState(
    navigator.onLine && sessionStorage.getItem(OFFLINE_SESSION_KEY) !== '1',
  );
  const [announcement, setAnnouncement] = useState('Wolkenpost ist bereit.');
  const [storageWarning, setStorageWarning] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  const matchingPlaces = useMemo(() => searchPlaces(query), [query]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onOnline = () => {
      sessionStorage.removeItem(OFFLINE_SESSION_KEY);
      setOnline(true);
      setAnnouncement('Verbindung wieder da. Live-Wind kann erneut geladen werden.');
    };
    const onOffline = () => {
      sessionStorage.setItem(OFFLINE_SESSION_KEY, '1');
      setOnline(false);
      setAnnouncement('Offline. Deine Zeichnung bleibt auf diesem Gerät.');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

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
      });
      setStorageWarning(!saved);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [motion, objectType, soundEnabled, start, strokes, theme]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const changeObjectType = (next: ObjectType) => {
    setObjectType(next);
    setResult(null);
    setFlightStatus('idle');
    setAnnouncement(`${text.objectTypes[next].label} ausgewählt.`);
  };

  const selectStart = (place: Place) => {
    setStart(place);
    setResult(null);
    setFlightStatus('idle');
    setQuery('');
    setAnnouncement(`Startpunkt ${place.name} gewählt.`);
  };

  const selectMapCoordinate = (coordinate: Coordinate) => selectStart(namedPlace(coordinate));

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setAnnouncement('Ortung wird von diesem Browser nicht unterstützt. Die Ortsuche bleibt verfügbar.');
      return;
    }
    setLocationStatus('loading');
    setAnnouncement('Der Browser fragt nach deiner Erlaubnis für den Standort.');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectStart(namedPlace({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocationStatus('idle');
      },
      (error) => {
        setLocationStatus('error');
        const message = error.code === error.PERMISSION_DENIED
          ? 'Ortung wurde nicht erlaubt. Das ist völlig okay – suche einen Ort oder tippe auf die Karte.'
          : error.code === error.TIMEOUT
            ? 'Die Ortung hat zu lange gebraucht. Suche stattdessen einen Ort oder versuche es erneut.'
            : 'Der Standort war nicht verfügbar. Ortssuche und Karte funktionieren weiterhin.';
        setAnnouncement(message);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  };

  const applyResult = (nextResult: RouteResult) => {
    setResult(nextResult);
    setFlightStatus('result');
    setAnnouncement(
      `Die Route ist fertig: ${Math.round(nextResult.distanceKm)} Kilometer bis ${nextResult.endLabel}.`,
    );
    window.setTimeout(() => resultHeadingRef.current?.focus(), 50);
  };

  const startLiveFlight = async () => {
    if (!strokes.length || flightStatus === 'loading') return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFlightStatus('loading');
    setResult(null);
    setAnnouncement('Live-Wind wird geladen. Deine Zeichnung bleibt bedienbar.');
    if (soundEnabled) playWindTone();
    try {
      const field = await fetchWindField(start, objectType, {
        signal: controller.signal,
        timeoutMs: qaTimeout(),
      });
      if (abortRef.current !== controller) return;
      applyResult(simulateRoute(start, start.name, objectType, field));
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
    setAnnouncement('Windabruf abgebrochen. Deine Zeichnung und dein Startpunkt sind erhalten.');
  };

  const startDemoFlight = () => {
    if (!strokes.length) return;
    if (soundEnabled) playWindTone();
    const field = createDemoWindField(start, objectType);
    applyResult(simulateRoute(start, start.name, objectType, field));
  };

  const saveImage = async () => {
    if (!result || exporting) return;
    setExporting(true);
    try {
      const file = await createResultImage(result, strokes);
      downloadFile(file);
      setAnnouncement('Ergebnisgrafik gespeichert. Sie enthält keine exakten Startkoordinaten.');
    } catch {
      setAnnouncement('Die Ergebnisgrafik konnte in diesem Browser nicht gespeichert werden.');
    } finally {
      setExporting(false);
    }
  };

  const shareImage = async () => {
    if (!result || exporting) return;
    setExporting(true);
    try {
      const file = await createResultImage(result, strokes);
      const shareData = {
        title: 'Meine Wolkenpost',
        text: `Meine Wolkenpost reiste ${Math.round(result.distanceKm)} km ${result.endLabel}.`,
        files: [file],
      };
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        setAnnouncement('Wolkenpost wurde an die ausgewählte App übergeben.');
      } else {
        downloadFile(file);
        setAnnouncement('Teilen wird hier nicht unterstützt; die Ergebnisgrafik wurde gespeichert.');
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        setAnnouncement('Teilen war nicht möglich. Du kannst das Bild stattdessen speichern.');
      }
    } finally {
      setExporting(false);
    }
  };

  const resetLocalData = () => {
    clearState();
    abortRef.current?.abort();
    setObjectType(DEFAULT_STATE.objectType);
    setStrokes([]);
    setStart(DEFAULT_STATE.lastStart);
    setMotion(DEFAULT_STATE.motion);
    setTheme(DEFAULT_STATE.theme);
    setSoundEnabled(DEFAULT_STATE.soundEnabled);
    setResult(null);
    setFlightStatus('idle');
    setResetArmed(false);
    setAnnouncement('Lokale Wolkenpost-Daten wurden von diesem Gerät gelöscht.');
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Zum Inhalt</a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Wolkenpost Start">
          <span className="brand-mark" aria-hidden="true">☁</span>
          <span>Wolkenpost</span>
        </a>
        <span
          className={`connection-pill ${online ? '' : 'is-offline'}`}
          data-testid="connection-status"
        >
          <span className="connection-dot" aria-hidden="true" />
          {online ? 'bereit' : 'offline'}
        </span>
      </header>

      <main id="main">
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Zeichnen · Wind lesen · Staunen</p>
            <h1>Schick deine Zeichnung auf eine Reise mit dem Wind.</h1>
            <p className="hero-lead">
              Keine Anmeldung, keine Galerie, keine fremden Bilder. Nur dein kleines Flugobjekt,
              echte Winddaten und eine eigene stilisierte Welt.
            </p>
            <a className="primary-link" href="#zeichnen">Jetzt loszeichnen <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-orbit" aria-hidden="true">
            <span className="hero-cloud">☁</span>
            <span className="hero-trail" />
          </div>
        </section>

        <div className="journey-layout">
          <section className="step-card drawing-step" id="zeichnen" aria-labelledby="drawing-heading">
            <div className="step-heading">
              <span className="step-number" aria-hidden="true">1</span>
              <div>
                <p className="step-kicker">Dein Reisender</p>
                <h2 id="drawing-heading">Was fliegt heute?</h2>
              </div>
            </div>

            <div className="object-picker" role="radiogroup" aria-label="Flugobjekt">
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

            <DrawingCanvas
              strokes={strokes}
              onChange={(next) => {
                setStrokes(next);
                setResult(null);
                setFlightStatus('idle');
                setAnnouncement(`${next.length} Strich${next.length === 1 ? '' : 'e'} gespeichert.`);
              }}
              onUndo={() => {
                setStrokes((current) => current.slice(0, -1));
                setResult(null);
                setFlightStatus('idle');
                setAnnouncement('Letzten Strich zurückgenommen.');
              }}
            />
            <div className="drawing-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setStrokes((current) => [...current, ...drawingPreset(objectType)].slice(-80));
                  setResult(null);
                  setFlightStatus('idle');
                  setAnnouncement(`${text.objectTypes[objectType].label}-Umriss ergänzt.`);
                }}
              >
                Umriss ergänzen
              </button>
              <button
                className="text-button"
                type="button"
                disabled={!strokes.length}
                onClick={() => {
                  setStrokes((current) => current.slice(0, -1));
                  setResult(null);
                  setFlightStatus('idle');
                }}
              >
                Rückgängig
              </button>
              <button
                className="text-button"
                type="button"
                disabled={!strokes.length}
                onClick={() => {
                  setStrokes([]);
                  setResult(null);
                  setFlightStatus('idle');
                  setAnnouncement('Zeichenfläche geleert.');
                }}
              >
                Leeren
              </button>
            </div>
          </section>

          <section className="step-card map-step" aria-labelledby="map-heading">
            <div className="step-heading">
              <span className="step-number" aria-hidden="true">2</span>
              <div>
                <p className="step-kicker">Der Startpunkt</p>
                <h2 id="map-heading">Wo geht die Reise los?</h2>
              </div>
            </div>

            <WorldMap
              selected={start}
              result={result}
              drawing={strokes}
              motion={motion}
              theme={theme}
              onSelect={selectMapCoordinate}
            />

            <div className="selected-place" aria-live="polite">
              <span className="place-pin" aria-hidden="true">●</span>
              <span>
                <small>Gewählter Start</small>
                <strong>{start.name}</strong>
                <span>{start.country}</span>
              </span>
            </div>

            <div className="place-tools">
              <label className="search-field">
                <span>Ort suchen</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="z. B. Berlin oder Tokio"
                  autoComplete="off"
                />
              </label>
              <button
                className="location-button"
                type="button"
                onClick={locateMe}
                disabled={locationStatus === 'loading'}
              >
                {locationStatus === 'loading' ? 'Ortung läuft …' : 'Meinen Ort verwenden'}
              </button>
            </div>
            {query && (
              <ul className="place-results" aria-label="Ortsvorschläge">
                {matchingPlaces.length ? matchingPlaces.map((place) => (
                  <li key={place.id}>
                    <button type="button" onClick={() => selectStart(place)}>
                      <strong>{place.name}</strong>
                      <span>{place.country}</span>
                    </button>
                  </li>
                )) : (
                  <li className="no-results">Kein Treffer – tippe stattdessen auf die Karte.</li>
                )}
              </ul>
            )}

            <details className="coordinate-controls">
              <summary>Startpunkt mit Tastatur fein einstellen</summary>
              <div>
                <label>
                  Breitengrad <output>{start.latitude.toFixed(0)}°</output>
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
                  Längengrad <output>{start.longitude.toFixed(0)}°</output>
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
          </section>
        </div>

        <section className="launch-panel" aria-labelledby="launch-heading">
          <div>
            <p className="step-kicker">Bereit?</p>
            <h2 id="launch-heading">Lass den Wind entscheiden.</h2>
            <p>
              Wolkenpost lädt neun grobe Windpunkte rund um deinen Start und berechnet die Route
              auf diesem Gerät. Das ist eine spielerische Modellroute, keine Navigation.
            </p>
          </div>
          {flightStatus === 'loading' ? (
            <div className="loading-actions" role="status">
              <span className="wind-loader" aria-hidden="true" />
              <span>Live-Wind wird gelesen …</span>
              <button type="button" className="text-button on-dark" onClick={cancelFlight}>Abbrechen</button>
            </div>
          ) : (
            <button
              className="launch-button"
              type="button"
              onClick={startLiveFlight}
              disabled={!strokes.length}
            >
              <span>Flug mit Live-Wind starten</span>
              <span aria-hidden="true">→</span>
            </button>
          )}
          {!strokes.length && <p className="launch-hint">Zeichne zuerst einen Strich oder ergänze einen Umriss.</p>}
        </section>

        {flightStatus === 'error' && (
          <section className="state-panel error-panel" role="alert" aria-labelledby="wind-error-heading">
            <div className="state-symbol" aria-hidden="true">↯</div>
            <div>
              <p className="step-kicker">Live-Wind fehlt</p>
              <h2 id="wind-error-heading">{text.windErrors[errorKind]}</h2>
              <p>
                Demo-Wind ist ein festes, synthetisches Testfeld vom 30. Juli 2026.
                Es wird niemals als echte Messung dargestellt.
              </p>
              <div className="state-actions">
                <button className="primary-button" type="button" onClick={startLiveFlight}>
                  Live-Wind erneut versuchen
                </button>
                <button className="secondary-button" type="button" onClick={startDemoFlight}>
                  Bewusst mit Demo-Wind starten
                </button>
              </div>
            </div>
          </section>
        )}

        {result && (
          <section className="result-section" aria-labelledby="result-heading">
            <div className="result-heading-row">
              <div>
                <p className="eyebrow">
                  {result.source.kind === 'live' ? 'Live-Windroute' : 'Demo-Windroute'}
                </p>
                <h2 id="result-heading" ref={resultHeadingRef} tabIndex={-1}>
                  Angekommen {result.endLabel}.
                </h2>
                <p>Von {result.startLabel}, ohne genaue Koordinaten in der Ergebnisgrafik.</p>
              </div>
              <span className={`source-badge ${result.source.kind === 'demo' ? 'is-demo' : ''}`}>
                {result.source.kind === 'live' ? 'echte Modelldaten' : 'synthetischer Demo-Wind'}
              </span>
            </div>
            <div className="result-metrics">
              <article>
                <small>Strecke</small>
                <strong>{Math.round(result.distanceKm).toLocaleString('de-DE')} km</strong>
              </article>
              <article>
                <small>Flugzeit</small>
                <strong>{result.durationHours.toLocaleString('de-DE')} h</strong>
              </article>
              <article>
                <small>Ø Windreise</small>
                <strong>{Math.round(result.averageSpeedKmh)} km/h</strong>
              </article>
              <article>
                <small>Spitze</small>
                <strong>{Math.round(result.maxSpeedKmh)} km/h</strong>
              </article>
            </div>
            <div className="result-source">
              <div>
                <span>Datenstand</span>
                <strong>
                  {new Date(result.source.forecastStart).toLocaleString('de-DE', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'UTC',
                  })} UTC
                </strong>
              </div>
              <div>
                <span>Quelle / Modell</span>
                <strong>{result.source.label} · {result.source.model}</strong>
              </div>
            </div>
            <div className="result-actions">
              <button className="primary-button" type="button" onClick={saveImage} disabled={exporting}>
                {exporting ? 'Grafik wird erstellt …' : 'Ergebnisbild speichern'}
              </button>
              <button className="secondary-button" type="button" onClick={shareImage} disabled={exporting}>
                Teilen
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setResult(null);
                  setFlightStatus('idle');
                  document.getElementById('zeichnen')?.scrollIntoView({ behavior: motion === 'reduced' ? 'auto' : 'smooth' });
                }}
              >
                Noch eine Reise
              </button>
            </div>
          </section>
        )}

        <section className="settings-section" aria-labelledby="settings-heading">
          <div>
            <p className="step-kicker">Auf diesem Gerät</p>
            <h2 id="settings-heading">Ruhig, privat, anpassbar.</h2>
            <p>Zeichnung, Einstellungen und grober letzter Start bleiben nur im lokalen Browser.</p>
          </div>
          <div className="settings-grid">
            <label>
              Darstellung
              <select value={theme} onChange={(event) => setTheme(event.target.value as ThemePreference)}>
                <option value="system">Wie das Gerät</option>
                <option value="light">Hell</option>
                <option value="dark">Dunkel</option>
              </select>
            </label>
            <label>
              Bewegung
              <select value={motion} onChange={(event) => setMotion(event.target.value as MotionPreference)}>
                <option value="system">Wie das Gerät</option>
                <option value="full">Route animieren</option>
                <option value="reduced">Route sofort zeigen</option>
              </select>
            </label>
            <label className="switch-label">
              <span>
                Leiser Startton
                <small>Aus, bis du ihn bewusst einschaltest</small>
              </span>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(event) => setSoundEnabled(event.target.checked)}
              />
            </label>
          </div>
          <div className="reset-row">
            {!resetArmed ? (
              <button className="text-button danger" type="button" onClick={() => setResetArmed(true)}>
                Lokale Daten löschen
              </button>
            ) : (
              <div className="reset-confirm" role="group" aria-label="Lokale Daten wirklich löschen">
                <span>Zeichnung und Einstellungen wirklich löschen?</span>
                <button className="danger-button" type="button" onClick={resetLocalData}>Ja, löschen</button>
                <button className="text-button" type="button" onClick={() => setResetArmed(false)}>Abbrechen</button>
              </div>
            )}
          </div>
          {storageWarning && (
            <p className="storage-warning" role="alert">
              Dieser Browser konnte lokale Änderungen nicht speichern. Die aktuelle Sitzung funktioniert weiter.
            </p>
          )}
        </section>
      </main>

      <footer>
        <div>
          <strong>Wolkenpost</strong>
          <span>Eine eigenständige öffentliche MilosApp · keine Anmeldung</span>
        </div>
        <div className="footer-links">
          <a href={OPEN_METEO_ATTRIBUTION_URL} target="_blank" rel="noreferrer">
            Winddaten: Open‑Meteo · CC BY 4.0
          </a>
          <span>Weltbild und Gestaltung: eigenes Werk</span>
          <span>Keine Navigation oder Wetterwarnung</span>
        </div>
      </footer>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </div>
  );
}
