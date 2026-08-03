import { copy, type SupportedLanguage } from '../copy';
import { localizePlace, nearestPlace } from '../data/places';
import { OBJECT_PROFILES } from '../lib/simulation';
import type { RouteResult } from '../types';

interface FlightReadoutProps {
  primary: RouteResult;
  comparison?: RouteResult | null;
  progress: number;
  language: SupportedLanguage;
  startLabel: string;
}

function pointAtProgress(result: RouteResult, progress: number) {
  const index = Math.max(0, Math.min(
    result.points.length - 1,
    Math.ceil(result.points.length * progress) - 1,
  ));
  return result.points[index];
}

function levelLabel(
  level: keyof Pick<typeof copy.de.flightSpace, 'level10m' | 'level925hPa' | 'level850hPa'>,
  language: SupportedLanguage,
): string {
  return copy[language].flightSpace[level];
}

function compassLabel(bearing: number, language: SupportedLanguage): string {
  const labels = copy[language].flightSpace.compass;
  return labels[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}

export function FlightReadout({
  primary,
  comparison,
  progress,
  language,
  startLabel,
}: FlightReadoutProps) {
  const text = copy[language];
  const rows = [primary, comparison].filter((item): item is RouteResult => Boolean(item));

  return (
    <div className="flight-readout" data-testid="flight-readout" aria-label={text.flightSpace.heading}>
      {rows.map((route, index) => {
        const point = pointAtProgress(route, progress);
        const place = localizePlace(nearestPlace(point), language, text.map);
        const profile = OBJECT_PROFILES[route.objectType];
        const levelKey = profile.level === '10m'
          ? 'level10m'
          : profile.level === '925hPa'
            ? 'level925hPa'
            : 'level850hPa';
        const elapsed = route.durationHours * progress;
        return (
          <article
            key={`${route.objectType}-${index}`}
            className={`flight-readout-row ${index === 1 ? 'is-comparison' : ''}`}
            data-flight-profile={route.objectType}
          >
            <header>
              <span className="route-swatch" aria-hidden="true" />
              <span>
                <small>{index === 0 ? text.flightSpace.firstFlight : text.flightSpace.comparisonFlight}</small>
                <strong>{text.objectTypes[route.objectType].label}</strong>
              </span>
            </header>
            <dl>
              <div>
                <dt>{text.flightSpace.start}</dt>
                <dd>{startLabel}</dd>
              </div>
              <div>
                <dt>{text.flightSpace.current}</dt>
                <dd>{text.result.near(place.name)}</dd>
              </div>
              <div>
                <dt>{text.flightSpace.target}</dt>
                <dd>{text.result.near(localizePlace(nearestPlace(route.points.at(-1) ?? route.points[0]), language, text.map).name)}</dd>
              </div>
              <div>
                <dt>{text.flightSpace.wind}</dt>
                <dd>{text.flightSpace.windValue(point.speed, compassLabel(point.bearing, language))}</dd>
              </div>
              <div>
                <dt>{text.flightSpace.altitude}</dt>
                <dd>{levelLabel(levelKey, language)}</dd>
              </div>
              <div>
                <dt>{text.flightSpace.time}</dt>
                <dd>{text.flightSpace.elapsed(elapsed)}</dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}
