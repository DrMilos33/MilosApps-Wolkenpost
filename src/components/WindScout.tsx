import type { ObjectType, WindBoost, WindLevel, WindReading } from '../types';
import { OBJECT_PROFILES } from '../lib/simulation';

type PreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

interface WindScoutText {
  kicker: string;
  heading: string;
  description: string;
  check: string;
  refresh: string;
  loading: string;
  cancel: string;
  selectedProfile: string;
  dataTime: string;
  level10m: string;
  level925hPa: string;
  level850hPa: string;
  strength: Record<WindReading['strength'], string>;
  compass: readonly string[];
  windValue: (speed: number, direction: string) => string;
  boostLegend: string;
  boostDescription: string;
  boostReal: string;
  boostJourney: string;
  boostAdventure: string;
  moreLevels: string;
  estimatedRange: (distance: number) => string;
}

interface WindScoutProps {
  status: PreviewStatus;
  readings: WindReading[];
  objectType: ObjectType;
  dataTime?: string;
  locale: string;
  text: WindScoutText;
  error?: string;
  onCheck: () => void;
  onCancel: () => void;
  windBoost: WindBoost;
  onWindBoostChange: (boost: WindBoost) => void;
  estimatedDistanceKm?: number;
}

function compassIndex(bearing: number): number {
  return Math.round((((bearing % 360) + 360) % 360) / 45) % 8;
}

function levelLabel(level: WindLevel, text: WindScoutText): string {
  if (level === '10m') return text.level10m;
  if (level === '925hPa') return text.level925hPa;
  return text.level850hPa;
}

function speedBand(speedKmh: number): number {
  return Math.max(1, Math.min(5, Math.ceil(speedKmh / 15)));
}

export function WindScout({
  status,
  readings,
  objectType,
  dataTime,
  locale,
  text,
  error,
  onCheck,
  onCancel,
  windBoost,
  onWindBoostChange,
  estimatedDistanceKm,
}: WindScoutProps) {
  const selectedLevel = OBJECT_PROFILES[objectType].level;
  const selectedReading = readings.find((reading) => reading.level === selectedLevel);
  const selectedDirection = selectedReading
    ? text.compass[compassIndex(selectedReading.bearing)]
    : text.compass[0];
  return (
    <section className="wind-scout" aria-labelledby="wind-scout-heading" data-testid="wind-scout">
      <div className="wind-scout-heading">
        <div>
          <p className="step-kicker">{text.kicker}</p>
          <h3 id="wind-scout-heading">{text.heading}</h3>
        </div>
        <span className="wind-compass" aria-hidden="true">
          <span data-bearing-sector={readings.length ? compassIndex(readings.find((reading) => reading.level === selectedLevel)?.bearing ?? 0) : 0}>➤</span>
        </span>
      </div>
      {status !== 'ready' && <p className="wind-scout-description">{text.description}</p>}

      {status === 'ready' && readings.length > 0 && selectedReading ? (
        <>
          <div className="wind-primary-reading" data-wind-level={selectedReading.level}>
            <span className="wind-compass is-large" aria-hidden="true">
              <span data-bearing-sector={compassIndex(selectedReading.bearing)}>{'\u27a4'}</span>
            </span>
            <span>
              <small>{levelLabel(selectedReading.level, text)} · {text.selectedProfile}</small>
              <strong>{text.windValue(selectedReading.speedKmh, selectedDirection)}</strong>
              <span>{text.strength[selectedReading.strength]}</span>
            </span>
          </div>
          <details className="wind-more-levels">
            <summary>{text.moreLevels}</summary>
            <p className="wind-detail-copy">{text.description}</p>
            <div className="wind-readings" role="list">
              {readings.map((reading) => {
                const direction = text.compass[compassIndex(reading.bearing)];
                const selected = reading.level === selectedLevel;
                return (
                  <article
                    key={reading.level}
                    role="listitem"
                    className={selected ? 'is-selected' : ''}
                    data-wind-level={reading.level}
                  >
                    <header>
                      <span>{levelLabel(reading.level, text)}</span>
                      {selected && <small>{text.selectedProfile}</small>}
                    </header>
                    <div className="wind-meter" aria-hidden="true">
                      <span data-wind-band={speedBand(reading.speedKmh)} />
                    </div>
                    <strong>{text.windValue(reading.speedKmh, direction)}</strong>
                    <small>{text.strength[reading.strength]}</small>
                  </article>
                );
              })}
            </div>
          </details>
        </>
      ) : status === 'loading' || status === 'error' ? (
        <div className={`wind-scout-state ${status === 'error' ? 'is-error' : ''}`} role={status === 'error' ? 'alert' : 'status'}>
          {status === 'loading' ? text.loading : error}
        </div>
      ) : null}

      <div className="wind-scout-actions" data-milos-actions>
        {status === 'loading' ? (
          <button type="button" className="text-button" onClick={onCancel}>{text.cancel}</button>
        ) : (
          <button type="button" className="secondary-button" onClick={onCheck}>
            {status === 'ready' ? text.refresh : text.check}
          </button>
        )}
        {status === 'ready' && dataTime && (
          <span>
            {text.dataTime}: {' '}
            <strong>{new Date(dataTime).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC</strong>
          </span>
        )}
      </div>

      <fieldset className="wind-boost" data-testid="wind-boost">
        <legend>{text.boostLegend}</legend>
        <p>{text.boostDescription}</p>
        <div className="wind-boost-options" role="radiogroup" aria-label={text.boostLegend}>
          {([
            [1, text.boostReal],
            [4, text.boostJourney],
            [10, text.boostAdventure],
          ] as const).map(([boost, label]) => (
            <button
              key={boost}
              type="button"
              role="radio"
              aria-checked={windBoost === boost}
              className={windBoost === boost ? 'is-selected' : ''}
              onClick={() => onWindBoostChange(boost)}
            >
              <strong>{'\u00d7'}{boost.toLocaleString(locale)}</strong>
              <span>{label}</span>
            </button>
          ))}
        </div>
        {estimatedDistanceKm !== undefined && (
          <output className="range-preview" data-testid="range-preview">
            {text.estimatedRange(estimatedDistanceKm)}
          </output>
        )}
      </fieldset>
    </section>
  );
}
