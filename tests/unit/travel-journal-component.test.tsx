import { renderToStaticMarkup } from 'react-dom/server';
import { TravelJournal } from '../../src/components/TravelJournal';
import { copy } from '../../src/copy';
import type { RouteHighlight, RouteResult } from '../../src/types';

const result = {
  points: [
    { latitude: 49, longitude: 2.25, time: 0, speed: 10, bearing: 0 },
    { latitude: 48.858, longitude: 2.294, time: 3_600_000, speed: 10, bearing: 0 },
  ],
  distanceKm: 42,
  durationHours: 1,
  averageSpeedKmh: 42,
  maxSpeedKmh: 52,
  source: { kind: 'demo', label: 'demo', model: 'fixed', fetchedAt: '', forecastStart: '' },
  objectType: 'cloud',
  startLabel: 'Paris',
  endLabel: 'Paris',
  windBoost: 1,
} satisfies RouteResult;

const highlight = {
  id: 'eiffel-tower', kind: 'landmark', name: 'Eiffelturm', latitude: 48.858,
  longitude: 2.294, distanceKm: 10, elapsedHours: 1, progress: 0.8,
} satisfies RouteHighlight;

describe('TravelJournal', () => {
  it('uses the licensed local photo and a transparent drawing overlay', () => {
    const html = renderToStaticMarkup(
      <TravelJournal
        result={result}
        comparisonResult={null}
        highlights={[highlight]}
        strokes={[{ id: 'one', points: [
          { x: 0.2, y: 0.3, pressure: 0.5 },
          { x: 0.8, y: 0.7, pressure: 0.5 },
        ] }]}
        passport={{ countries: ['FR'], landmarks: ['eiffel-tower'], flights: 1 }}
        language="de"
        locale="de-DE"
        text={copy.de.travelJournal}
      />,
    );
    expect(html).toContain('landmarks/eiffel-tower.jpg');
    expect(html).toContain('Foto: Edisonblus · CC BY-SA 3.0');
    expect(html).toContain('class="travel-photo-drawing"');
    expect(html).toContain('Eiffelturm');
  });
});
