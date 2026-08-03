import {
  createDemoWindSnapshot,
  fetchWindField,
  fetchWindSnapshot,
  meteorologicalWindVector,
  WindRequestError,
} from '../../src/lib/wind';

function apiNode(latitude: number, longitude: number) {
  return {
    latitude,
    longitude,
    hourly: {
      time: ['2026-07-30T00:00', '2026-07-30T01:00'],
      wind_speed_850hPa: [10, 12],
      wind_direction_850hPa: [270, 180],
      wind_speed_925hPa: [7, 8],
      wind_direction_925hPa: [210, 200],
      wind_speed_10m: [4, 5],
      wind_direction_10m: [120, 130],
    },
  };
}

describe('wind data', () => {
  it('converts meteorological direction-from values to travel vectors', () => {
    const fromWest = meteorologicalWindVector(10, 270);
    expect(fromWest.east).toBeCloseTo(10, 8);
    expect(fromWest.north).toBeCloseTo(0, 8);
    const fromNorth = meteorologicalWindVector(10, 0);
    expect(fromNorth.east).toBeCloseTo(0, 8);
    expect(fromNorth.north).toBeCloseTo(-10, 8);
  });

  it('loads and validates a bundled multi-location response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      const latitudes = url.searchParams.get('latitude')!.split(',').map(Number);
      const longitudes = url.searchParams.get('longitude')!.split(',').map(Number);
      return new Response(JSON.stringify(latitudes.map((latitude, index) =>
        apiNode(latitude, longitudes[index]),
      )), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const field = await fetchWindField({ latitude: 52.5, longitude: 13.5 }, 'cloud');
    expect(field.nodes).toHaveLength(9);
    expect(field.source.kind).toBe('live');
    expect(field.source.model).toContain('850hPa');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain('models=gfs_global');
  });

  it('fails honestly when the API response is incomplete', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(apiNode(52.5, 13.5)), { status: 200 }),
    );
    await expect(fetchWindField({ latitude: 52.5, longitude: 13.5 }, 'cloud'))
      .rejects.toMatchObject({ kind: 'invalid' });
  });

  it('loads all comparison levels in one reproducible snapshot', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      const latitudes = url.searchParams.get('latitude')!.split(',').map(Number);
      const longitudes = url.searchParams.get('longitude')!.split(',').map(Number);
      return new Response(JSON.stringify(latitudes.map((latitude, index) =>
        apiNode(latitude, longitudes[index]),
      )), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const snapshot = await fetchWindSnapshot({ latitude: 52.5, longitude: 13.5 });
    expect(Object.keys(snapshot.fields).sort()).toEqual(['10m', '850hPa', '925hPa']);
    expect(snapshot.fields['10m'].source.forecastStart)
      .toBe(snapshot.fields['850hPa'].source.forecastStart);
    expect(snapshot.fields['925hPa'].source.fetchedAt)
      .toBe(snapshot.fields['850hPa'].source.fetchedAt);
    expect(fetchMock).toHaveBeenCalledOnce();
    const requested = new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('hourly');
    expect(requested).toContain('wind_speed_10m');
    expect(requested).toContain('wind_speed_925hPa');
    expect(requested).toContain('wind_speed_850hPa');
  });

  it('keeps every demo profile on one immutable data time', () => {
    const snapshot = createDemoWindSnapshot({ latitude: 52.5, longitude: 13.5 });
    const dataTimes = Object.values(snapshot.fields).map((field) => field.source.forecastStart);
    expect(new Set(dataTimes)).toEqual(new Set(['2026-07-30T00:00:00.000Z']));
  });

  it('distinguishes a timeout from a generic network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    await expect(fetchWindField(
      { latitude: 52.5, longitude: 13.5 },
      'cloud',
      { timeoutMs: 20 },
    )).rejects.toMatchObject({ kind: 'timeout' });
  });
});
