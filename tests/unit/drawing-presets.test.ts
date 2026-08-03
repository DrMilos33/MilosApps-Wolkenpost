import { DRAWING_PRESETS, drawingPreset } from '../../src/data/drawing-presets';
import type { ObjectType } from '../../src/types';

describe('drawing outline presets', () => {
  it('offers three distinct, usable outlines for every flight object', () => {
    for (const type of Object.keys(DRAWING_PRESETS) as ObjectType[]) {
      expect(DRAWING_PRESETS[type]).toHaveLength(3);
      expect(new Set(DRAWING_PRESETS[type].map((preset) => preset.id)).size).toBe(3);
      expect(DRAWING_PRESETS[type].every((preset) =>
        preset.strokes.length > 0 && preset.strokes.every((stroke) => stroke.points.length >= 2),
      )).toBe(true);
    }
  });

  it('clones a selected outline so later drawing never mutates the catalogue', () => {
    const first = drawingPreset('balloon', 'striped', 'test');
    const second = drawingPreset('balloon', 'striped', 'test-again');
    first[0].points[0].x = 99;

    expect(first.map((stroke) => stroke.id)).toEqual([
      'test-striped-1',
      'test-striped-2',
      'test-striped-3',
      'test-striped-4',
    ]);
    expect(second[0].points[0].x).not.toBe(99);
  });
});
