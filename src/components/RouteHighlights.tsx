import type { RouteHighlight } from '../types';

interface RouteHighlightsText {
  kicker: string;
  heading: string;
  empty: string;
  landmark: string;
  city: string;
  near: (distance: number) => string;
  time: (hours: number) => string;
  boundary: string;
}

interface RouteHighlightsProps {
  highlights: RouteHighlight[];
  text: RouteHighlightsText;
}

export function RouteHighlights({ highlights, text }: RouteHighlightsProps) {
  return (
    <section className="route-highlights" aria-labelledby="route-highlights-heading" data-testid="route-highlights">
      <div>
        <p className="step-kicker">{text.kicker}</p>
        <h3 id="route-highlights-heading">{text.heading}</h3>
      </div>
      {highlights.length ? (
        <ol>
          {highlights.map((highlight, index) => (
            <li key={`${highlight.kind}-${highlight.id}`}>
              <span className="highlight-index" aria-hidden="true">{index + 1}</span>
              <span>
                <small>{highlight.kind === 'landmark' ? text.landmark : text.city}</small>
                <strong>{highlight.name}</strong>
                <span>{text.near(highlight.distanceKm)} · {text.time(highlight.elapsedHours)}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : <p className="route-highlights-empty">{text.empty}</p>}
      <p className="route-highlights-boundary">{text.boundary}</p>
    </section>
  );
}
