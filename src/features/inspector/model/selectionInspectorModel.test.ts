import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from '../../../types';
import type { Point, Shape, ShapeStyle } from '../../../types';
import { buildSelectionInspectorModel } from './selectionInspectorModel';

interface ShapeFixture {
  id: string;
  type: Shape['type'];
  bounds?: Shape['bounds'];
  style?: ShapeStyle;
  parentId?: string;
  center?: Point;
  radius?: number;
  start?: Point;
  end?: Point;
  points?: Point[];
  src?: string;
  originalWidth?: number;
  originalHeight?: number;
  isBase64?: boolean;
  duration?: number;
  isPlaying?: boolean;
  waveformData?: number[];
  loop?: boolean;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  url?: string;
  embedType?: 'youtube' | 'website';
  embedSrc?: string;
}

function createShape(shape: ShapeFixture): Shape {
  const baseShape = {
    bounds: shape.bounds ?? { x: 0, y: 0, width: 100, height: 100 },
    style: shape.style ?? { ...DEFAULT_STYLE },
    createdAt: 1,
    updatedAt: 1,
    parentId: shape.parentId,
  };

  switch (shape.type) {
    case 'rectangle':
      return { ...baseShape, id: shape.id, type: 'rectangle' };
    case 'circle':
      return {
        ...baseShape,
        id: shape.id,
        type: 'circle',
        center: shape.center ?? { x: 50, y: 50 },
        radius: shape.radius ?? 50,
      };
    case 'line':
      return {
        ...baseShape,
        id: shape.id,
        type: 'line',
        start: shape.start ?? { x: 0, y: 0 },
        end: shape.end ?? { x: 100, y: 100 },
      };
    case 'arrow':
      return {
        ...baseShape,
        id: shape.id,
        type: 'arrow',
        start: shape.start ?? { x: 0, y: 0 },
        end: shape.end ?? { x: 100, y: 100 },
      };
    case 'pencil':
      return {
        ...baseShape,
        id: shape.id,
        type: 'pencil',
        points: shape.points ?? [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
      };
    case 'image':
      return {
        ...baseShape,
        id: shape.id,
        type: 'image',
        src: shape.src ?? 'image.png',
        originalWidth: shape.originalWidth ?? 100,
        originalHeight: shape.originalHeight ?? 100,
        isBase64: shape.isBase64 ?? false,
      };
    case 'audio':
      return {
        ...baseShape,
        id: shape.id,
        type: 'audio',
        src: shape.src ?? 'audio.mp3',
        duration: shape.duration ?? 30,
        isPlaying: shape.isPlaying ?? false,
        waveformData: shape.waveformData ?? [0.1, 0.2],
        isBase64: shape.isBase64 ?? false,
        loop: shape.loop,
      };
    case 'text':
      return {
        ...baseShape,
        id: shape.id,
        type: 'text',
        text: shape.text ?? 'Hello',
        fontSize: shape.fontSize ?? 16,
        fontFamily: shape.fontFamily ?? 'sans-serif',
        fontWeight: shape.fontWeight ?? 'normal',
        fontStyle: shape.fontStyle ?? 'normal',
        textAlign: shape.textAlign ?? 'left',
      };
    case 'embed':
      return {
        ...baseShape,
        id: shape.id,
        type: 'embed',
        url: shape.url ?? 'https://example.com',
        embedType: shape.embedType ?? 'website',
        embedSrc: shape.embedSrc ?? 'https://example.com',
      };
    case 'group':
      return {
        ...baseShape,
        id: shape.id,
        type: 'group',
      };
  }
}

describe('buildSelectionInspectorModel', () => {
  it('returns the default tool style when nothing is selected', () => {
    const model = buildSelectionInspectorModel({
      defaultStyle: {
        ...DEFAULT_STYLE,
        color: '#2563eb',
        strokeWidth: 8,
      },
      selectedIds: [],
      shapes: [],
    });

    expect(model.mode).toBe('defaults');
    expect(model.style).toMatchObject({
      color: '#2563eb',
      strokeWidth: 8,
    });
    expect(model.selectedCount).toBe(0);
    expect(model.selectedItems).toEqual([]);
  });

  it('derives single-selection values from the selected shape instead of the editor defaults', () => {
    const model = buildSelectionInspectorModel({
      defaultStyle: {
        ...DEFAULT_STYLE,
        color: '#2563eb',
        strokeWidth: 8,
      },
      selectedIds: ['shape-1'],
      shapes: [
        createShape({
          id: 'shape-1',
          type: 'rectangle',
          style: {
            ...DEFAULT_STYLE,
            color: '#dc2626',
            strokeWidth: 2,
          },
        }),
      ],
    });

    expect(model.mode).toBe('single');
    expect(model.style).toMatchObject({
      color: '#dc2626',
      strokeWidth: 2,
    });
    expect(model.mixedStyleKeys).toEqual([]);
  });

  it('keeps shared multi-selection values and tracks mixed fields separately', () => {
    const model = buildSelectionInspectorModel({
      defaultStyle: { ...DEFAULT_STYLE },
      selectedIds: ['shape-1', 'shape-2'],
      shapes: [
        createShape({
          id: 'shape-1',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 100, height: 80 },
          style: {
            ...DEFAULT_STYLE,
            color: '#2563eb',
            strokeWidth: 4,
            opacity: 0.5,
          },
        }),
        createShape({
          id: 'shape-2',
          type: 'rectangle',
          bounds: { x: 140, y: 20, width: 100, height: 80 },
          style: {
            ...DEFAULT_STYLE,
            color: '#dc2626',
            strokeWidth: 4,
            opacity: 0.5,
          },
        }),
      ],
    });

    expect(model.mode).toBe('multi');
    expect(model.style).toMatchObject({
      strokeWidth: 4,
      opacity: 0.5,
    });
    expect(model.mixedStyleKeys).toContain('color');
    expect(model.mixedStyleKeys).not.toContain('strokeWidth');
    expect(model.selectedCount).toBe(2);
    expect(model.selectedLayoutBounds).toEqual({ x: 0, y: 0, width: 240, height: 100 });
    expect(model.canGroup).toBe(true);
  });
});
