import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type { DrawingPoint, DrawingStroke } from '../types';
import { clamp } from '../lib/geometry';

interface DrawingCanvasProps {
  strokes: DrawingStroke[];
  onChange: (strokes: DrawingStroke[]) => void;
  onUndo: () => void;
  disabled?: boolean;
}

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: DrawingStroke,
  width: number,
  height: number,
  color: string,
): void {
  if (!stroke.points.length) return;
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    context.beginPath();
    context.arc(point.x * width, point.y * height, 4 + point.pressure * 3, 0, Math.PI * 2);
    context.fill();
    return;
  }

  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const point = stroke.points[index];
    context.lineWidth = 3 + ((previous.pressure + point.pressure) / 2) * 7;
    context.beginPath();
    context.moveTo(previous.x * width, previous.y * height);
    context.lineTo(point.x * width, point.y * height);
    context.stroke();
  }
}

export function DrawingCanvas({
  strokes,
  onChange,
  onUndo,
  disabled = false,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: 1, height: 1 });
  const activePointerRef = useRef<number | null>(null);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);
  const frameRef = useRef<number | null>(null);
  const [keyboardCursor, setKeyboardCursor] = useState({ x: 0.5, y: 0.5 });
  const keyboardDrawingRef = useRef(false);
  const [drawingMode, setDrawingMode] = useState<'idle' | 'pointer' | 'keyboard'>('idle');
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const redraw = useCallback(() => {
    frameRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height } = sizeRef.current;
    context.clearRect(0, 0, width, height);

    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#fffdf7');
    background.addColorStop(1, '#eaf7f2');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.fillStyle = 'rgba(70, 101, 92, 0.10)';
    for (let x = 24; x < width; x += 24) {
      for (let y = 24; y < height; y += 24) {
        context.beginPath();
        context.arc(x, y, 1, 0, Math.PI * 2);
        context.fill();
      }
    }

    strokesRef.current.forEach((stroke, index) => {
      const colors = ['#1f6658', '#cf654a', '#5b7198', '#8b5d8e'];
      drawStroke(context, stroke, width, height, colors[index % colors.length]);
    });
    if (currentStrokeRef.current) {
      drawStroke(context, currentStrokeRef.current, width, height, '#d75f45');
    }

    const cursorX = keyboardCursor.x * width;
    const cursorY = keyboardCursor.y * height;
    context.strokeStyle = keyboardDrawingRef.current ? '#d75f45' : '#173f35';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cursorX, cursorY, 8, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(cursorX - 12, cursorY);
    context.lineTo(cursorX + 12, cursorY);
    context.moveTo(cursorX, cursorY - 12);
    context.lineTo(cursorX, cursorY + 12);
    context.stroke();
  }, [keyboardCursor]);

  const scheduleRedraw = useCallback(() => {
    if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(redraw);
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
      const context = canvas.getContext('2d');
      context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      sizeRef.current = { width: bounds.width, height: bounds.height };
      redraw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => scheduleRedraw(), [strokes, scheduleRedraw]);
  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  const pointFromPointer = (event: PointerEvent<HTMLCanvasElement>): DrawingPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
      pressure: event.pressure > 0 ? event.pressure : event.pointerType === 'mouse' ? 0.5 : 0.35,
    };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    activePointerRef.current = event.pointerId;
    currentStrokeRef.current = {
      id: `stroke-${Date.now()}-${event.pointerId}`,
      points: [pointFromPointer(event)],
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some synthetic, cancelled or already-released pointers cannot be captured.
      // The stroke still remains scoped by its pointer id and can finish safely.
    }
    setDrawingMode('pointer');
    scheduleRedraw();
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== event.pointerId || !currentStrokeRef.current) return;
    event.preventDefault();
    const samples = typeof event.nativeEvent.getCoalescedEvents === 'function'
      ? event.nativeEvent.getCoalescedEvents()
      : [event.nativeEvent];
    const bounds = event.currentTarget.getBoundingClientRect();
    for (const sample of samples) {
      const point: DrawingPoint = {
        x: clamp((sample.clientX - bounds.left) / bounds.width, 0, 1),
        y: clamp((sample.clientY - bounds.top) / bounds.height, 0, 1),
        pressure: sample.pressure > 0 ? sample.pressure : sample.pointerType === 'mouse' ? 0.5 : 0.35,
      };
      const previous = currentStrokeRef.current.points.at(-1);
      if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 0.002) {
        currentStrokeRef.current.points.push(point);
      }
    }
    scheduleRedraw();
  };

  const finishPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== event.pointerId || !currentStrokeRef.current) return;
    event.preventDefault();
    const completed = currentStrokeRef.current;
    if (completed.points.length === 1) {
      const point = completed.points[0];
      completed.points.push({ ...point, x: clamp(point.x + 0.002, 0, 1) });
    }
    currentStrokeRef.current = null;
    activePointerRef.current = null;
    setDrawingMode('idle');
    onChange([...strokesRef.current, completed].slice(-80));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // A platform may release capture between the guard and this call.
      }
    }
    scheduleRedraw();
  };

  const cancelPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    currentStrokeRef.current = null;
    activePointerRef.current = null;
    setDrawingMode('idle');
    scheduleRedraw();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const step = event.shiftKey ? 0.05 : 0.02;
    const movement = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[event.key] as [number, number] | undefined;

    if (movement) {
      event.preventDefault();
      const next = {
        x: clamp(keyboardCursor.x + movement[0], 0.02, 0.98),
        y: clamp(keyboardCursor.y + movement[1], 0.03, 0.97),
      };
      setKeyboardCursor(next);
      if (keyboardDrawingRef.current && currentStrokeRef.current) {
        currentStrokeRef.current.points.push({ ...next, pressure: 0.5 });
      }
      scheduleRedraw();
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!keyboardDrawingRef.current) {
        keyboardDrawingRef.current = true;
        currentStrokeRef.current = {
          id: `keyboard-${Date.now()}`,
          points: [{ ...keyboardCursor, pressure: 0.5 }],
        };
        setDrawingMode('keyboard');
      } else if (currentStrokeRef.current) {
        const completed = currentStrokeRef.current;
        keyboardDrawingRef.current = false;
        currentStrokeRef.current = null;
        setDrawingMode('idle');
        onChange([...strokesRef.current, completed].slice(-80));
      }
      scheduleRedraw();
    } else if (event.key === 'Escape' && keyboardDrawingRef.current) {
      event.preventDefault();
      keyboardDrawingRef.current = false;
      currentStrokeRef.current = null;
      setDrawingMode('idle');
      scheduleRedraw();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'z') {
      event.preventDefault();
      onUndo();
    }
  };

  return (
    <div className="drawing-board">
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        aria-label="Zeichenfläche. Mit Maus, Touch oder Stift zeichnen. Tastatur: Leertaste startet und beendet einen Strich, Pfeiltasten bewegen den Zeichenstift."
        aria-describedby="drawing-help"
        data-testid="drawing-canvas"
        data-stroke-count={strokes.length}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={cancelPointer}
        onLostPointerCapture={(event) => {
          if (activePointerRef.current === event.pointerId) cancelPointer(event);
        }}
        onKeyDown={onKeyDown}
        tabIndex={disabled ? -1 : 0}
      />
      <p className="drawing-mode" aria-live="polite">
        {drawingMode === 'keyboard'
          ? 'Tastaturstrich aktiv · Pfeiltasten bewegen · Leertaste beendet · Escape verwirft'
          : drawingMode === 'pointer'
            ? 'Strich wird gezeichnet'
            : 'Bereit zum Zeichnen'}
      </p>
      <p id="drawing-help" className="sr-only">
        Striche bleiben nur auf diesem Gerät. Mit Steuerung Z oder der Rückgängig-Taste wird der letzte Strich entfernt.
      </p>
    </div>
  );
}
