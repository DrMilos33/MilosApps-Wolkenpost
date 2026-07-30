import {
  fetchWindField,
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
