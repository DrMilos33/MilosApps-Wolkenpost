import type { DrawingPreset } from '../data/drawing-presets';

interface OutlinePickerProps {
  presets: DrawingPreset[];
  labels: readonly string[];
  groupLabel: string;
  selectedId: string | null;
  onSelect: (preset: DrawingPreset) => void;
}

function pathData(preset: DrawingPreset): string[] {
  return preset.strokes.map((stroke) => stroke.points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * 100} ${point.y * 100}`)
    .join(' '));
}

export function OutlinePicker({
  presets,
  labels,
  groupLabel,
  selectedId,
  onSelect,
}: OutlinePickerProps) {
  return (
    <div className="outline-picker" role="radiogroup" aria-label={groupLabel}>
      {presets.map((preset, index) => (
        <button
          key={preset.id}
          className={`outline-option ${selectedId === preset.id ? 'is-selected' : ''}`}
          type="button"
          role="radio"
          aria-checked={selectedId === preset.id}
          onClick={() => onSelect(preset)}
          data-outline-id={preset.id}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            {pathData(preset).map((path, pathIndex) => (
              <path key={`${preset.id}-${pathIndex}`} d={path} />
            ))}
          </svg>
          <span>{labels[index]}</span>
        </button>
      ))}
    </div>
  );
}
