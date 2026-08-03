import {
  DEFAULT_STATE,
  loadState,
  saveState,
  STORAGE_KEY,
} from '../../src/lib/storage';

describe('local state', () => {
  it('returns safe defaults for corrupt JSON', () => {
    const storage = { getItem: () => '{not-json' };
    expect(loadState(storage)).toEqual(DEFAULT_STATE);
  });

  it('sanitizes unknown enum values and invalid drawing points', () => {
    const storage = {
      getItem: () => JSON.stringify({
        version: 1,
        objectType: 'spaceship',
        motion: 'lots',
        theme: 'neon',
        drawing: [{
          id: 'one',
          points: [
            { x: 0.2, y: 0.3, pressure: 0.5 },
            { x: 'bad', y: 0.3, pressure: 0.5 },
          ],
        }],
      }),
    };
    const result = loadState(storage);
    expect(result.objectType).toBe('cloud');
    expect(result.motion).toBe('system');
    expect(result.theme).toBe('system');
    expect(result.windBoost).toBe(1);
    expect(result.drawing[0].points).toHaveLength(1);
  });

  it('keeps only supported playful wind multipliers', () => {
    const stored = (windBoost: number) => ({
      getItem: () => JSON.stringify({ version: 1, windBoost }),
    });
    expect(loadState(stored(1.5)).windBoost).toBe(1.5);
    expect(loadState(stored(99)).windBoost).toBe(1);
  });

  it('reports storage quota failures without throwing', () => {
    const storage = {
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };
    expect(saveState(DEFAULT_STATE, storage)).toBe(false);
  });

  it('writes the versioned key', () => {
    expect(saveState(DEFAULT_STATE)).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').version).toBe(1);
  });
});
