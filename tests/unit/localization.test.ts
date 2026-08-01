import { copy } from '../../src/copy';
import { localizePlace, PLACES, searchPlaces } from '../../src/data/places';

function dictionaryShape(value: unknown): unknown {
  if (typeof value === 'function') return 'function';
  if (Array.isArray(value)) return value.map(dictionaryShape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, entry]) => [key, dictionaryShape(entry)]),
    );
  }
  return typeof value;
}

describe('complete app localization', () => {
  it('keeps the German and English dictionaries structurally identical', () => {
    expect(dictionaryShape(copy.en)).toEqual(dictionaryShape(copy.de));
  });

  it('localizes known places and lets either spelling find them', () => {
    expect(searchPlaces('Tokyo', 'en')[0]).toMatchObject({
      id: 'tokyo',
      name: 'Tokyo',
      country: 'Japan',
    });
    expect(searchPlaces('Tokio', 'en')[0]).toMatchObject({ id: 'tokyo', name: 'Tokyo' });
    expect(searchPlaces('Munich', 'de')[0]).toMatchObject({ id: 'munich', name: 'München' });
  });

  it('preserves coordinates while translating saved and nearby places', () => {
    const berlin = PLACES.find((place) => place.id === 'berlin')!;
    expect(localizePlace({ ...berlin, id: 'near-berlin-52.5-13.5' }, 'en')).toEqual({
      ...berlin,
      id: 'near-berlin-52.5-13.5',
      country: 'Germany',
    });
    expect(localizePlace(
      { id: 'map-10-20', name: 'Punkt auf der Karte', country: '10° / 20°', latitude: 10, longitude: 20 },
      'en',
      copy.en.map,
    )).toMatchObject({ name: 'Point on the map', latitude: 10, longitude: 20 });
  });
});
