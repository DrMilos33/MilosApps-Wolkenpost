import type { ObjectType, WindLevel, WindReading } from '../types';
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
}: WindScoutProps) {
  const selectedLevel = OBJECT_PROFILES[objectType].level;
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
      <p>{text.description}</p>

      {status === 'ready' && readings.length > 0 ? (
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
    </section>
  );
}
