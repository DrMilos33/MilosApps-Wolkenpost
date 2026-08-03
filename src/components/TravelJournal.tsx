import { LANDMARKS } from '../data/landmarks';
import { LANDMARK_MEDIA } from '../data/landmark-media';
import { dailyMission, journeyEvent, missionComplete } from '../lib/travel-journal';
import type { SupportedLanguage } from '../copy';
import type { DrawingStroke, RouteHighlight, RouteResult, TravelPassport } from '../types';

interface TravelJournalText {
  kicker: string;
  heading: string;
  description: string;
  photoKicker: string;
  photoHeading: (landmark: string) => string;
  photoEmpty: string;
  photoBoundary: string;
  photoCredit: (author: string, license: string) => string;
  passportKicker: string;
  passportHeading: string;
  flights: (count: number) => string;
  countries: string;
  landmarks: string;
  noStamps: string;
  missionKicker: string;
  missionHeading: string;
  missionDone: string;
  missionOpen: string;
  missions: Record<'adventure' | 'landmark' | 'comparison', { title: string; task: string }>;
  eventKicker: string;
  eventHeading: string;
  events: Record<'postcard' | 'gust' | 'glider', { title: string; description: string }>;
}

interface TravelJournalProps {
  result: RouteResult;
  comparisonResult: RouteResult | null;
  highlights: RouteHighlight[];
  strokes: DrawingStroke[];
  passport: TravelPassport;
  language: SupportedLanguage;
  locale: string;
  text: TravelJournalText;
}

function drawingPath(stroke: DrawingStroke): string {
  return stroke.points.map((point) => `${point.x * 100},${point.y * 100}`).join(' ');
}

export function TravelJournal({
  result,
  comparisonResult,
  highlights,
  strokes,
  passport,
  language,
  locale,
  text,
}: TravelJournalProps) {
  const mediaHighlight = highlights.find((highlight) =>
    LANDMARK_MEDIA.some((media) => media.landmarkId === highlight.id));
  const media = mediaHighlight
    ? LANDMARK_MEDIA.find((entry) => entry.landmarkId === mediaHighlight.id)
    : undefined;
  const missionId = dailyMission();
  const completed = missionComplete(missionId, result, highlights, Boolean(comparisonResult));
  const eventId = journeyEvent(result, highlights);
  const displayNames = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([locale], { type: 'region' })
    : null;
  const countryNames = passport.countries.map((code) => displayNames?.of(code) ?? code);
  const landmarkNames = passport.landmarks.map((id) =>
    LANDMARKS.find((landmark) => landmark.id === id)?.name[language] ?? id);

  return (
    <section className="travel-journal" aria-labelledby="travel-journal-heading" data-testid="travel-journal">
      <header className="travel-journal-heading">
        <div>
          <p className="step-kicker">{text.kicker}</p>
          <h3 id="travel-journal-heading">{text.heading}</h3>
        </div>
        <p>{text.description}</p>
      </header>

      <div className="travel-journal-grid">
        <article className="travel-photo">
          <p className="step-kicker">{text.photoKicker}</p>
          {media && mediaHighlight ? (
            <>
              <h4>{text.photoHeading(mediaHighlight.name)}</h4>
              <figure>
                <img
                  src={`${import.meta.env.BASE_URL}${media.imagePath}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <svg className="travel-photo-drawing" viewBox="0 0 100 100" aria-label={mediaHighlight.name}>
                  {strokes.map((stroke) => (
                    <polyline key={stroke.id} points={drawingPath(stroke)} />
                  ))}
                </svg>
                <figcaption>
                  <span>{text.photoBoundary}</span>
                  <a href={media.sourceUrl} target="_blank" rel="noreferrer">
                    {text.photoCredit(media.author, media.license)}
                  </a>
                </figcaption>
              </figure>
            </>
          ) : (
            <div className="travel-photo-empty">
              <span aria-hidden="true">◇</span>
              <p>{text.photoEmpty}</p>
            </div>
          )}
        </article>

        <div className="travel-journal-details">
          <section className="journey-event" aria-labelledby="journey-event-heading">
            <div>
              <p className="step-kicker">{text.eventKicker}</p>
              <h4 id="journey-event-heading">{text.eventHeading}</h4>
            </div>
            <strong>{text.events[eventId].title}</strong>
            <p>{text.events[eventId].description}</p>
          </section>

          <section className={`daily-mission ${completed ? 'is-complete' : ''}`} aria-labelledby="daily-mission-heading">
            <div>
              <p className="step-kicker">{text.missionKicker}</p>
              <h4 id="daily-mission-heading">{text.missionHeading}</h4>
            </div>
            <strong>{text.missions[missionId].title}</strong>
            <p>{text.missions[missionId].task}</p>
            <span role="status">{completed ? text.missionDone : text.missionOpen}</span>
          </section>

          <section className="travel-passport" aria-labelledby="travel-passport-heading">
            <div>
              <p className="step-kicker">{text.passportKicker}</p>
              <h4 id="travel-passport-heading">{text.passportHeading}</h4>
            </div>
            <strong>{text.flights(passport.flights)}</strong>
            {countryNames.length || landmarkNames.length ? (
              <dl>
                <div>
                  <dt>{text.countries}</dt>
                  <dd>{countryNames.join(' · ') || '—'}</dd>
                </div>
                <div>
                  <dt>{text.landmarks}</dt>
                  <dd>{landmarkNames.join(' · ') || '—'}</dd>
                </div>
              </dl>
            ) : <p>{text.noStamps}</p>}
          </section>
        </div>
      </div>
    </section>
  );
}
