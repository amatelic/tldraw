import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, normalizeShapeIdsForSelection } from '../types';
import type { GroupShape, Point, Shape, ShapeStyle } from '../types';
import { buildSelectedInspectorItems } from './selectedInspectorItems';

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
  childrenIds?: string[];
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
      return {
        ...baseShape,
        id: shape.id,
        type: 'rectangle',
      };
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
        childrenIds: shape.childrenIds ?? [],
      } as GroupShape;
  }
}

describe('buildSelectedInspectorItems', () => {
  it('returns rows in back-to-front layer order', () => {
    const shapes: Shape[] = [
      createShape({ id: 'shape-circle', type: 'circle' }),
      createShape({ id: 'shape-text', type: 'text' }),
      createShape({ id: 'shape-rect', type: 'rectangle' }),
    ];

    const items = buildSelectedInspectorItems(['shape-rect', 'shape-circle'], shapes);

    expect(items).toEqual([
      {
        id: 'shape-circle',
        typeLabel: 'Circle',
        layerIndex: 0,
        hierarchyLabel: 'Ungrouped',
      },
      {
        id: 'shape-rect',
        typeLabel: 'Rectangle',
        layerIndex: 2,
        hierarchyLabel: 'Ungrouped',
      },
    ]);
  });

  it('maps shape kinds to user-facing type labels', () => {
    const shapes: Shape[] = [
      createShape({ id: 'shape-arrow', type: 'arrow' }),
      createShape({ id: 'shape-audio', type: 'audio' }),
      createShape({ id: 'shape-group', type: 'group' }),
    ];

    const items = buildSelectedInspectorItems(
      ['shape-audio', 'shape-group', 'shape-arrow'],
      shapes
    );

    expect(items.map((item) => item.typeLabel)).toEqual(['Arrow', 'Audio', 'Group']);
  });

  it('returns Ungrouped for top-level non-group items', () => {
    const shapes: Shape[] = [createShape({ id: 'shape-1', type: 'rectangle' })];

    const items = buildSelectedInspectorItems(['shape-1'], shapes);

    expect(items[0]?.hierarchyLabel).toBe('Ungrouped');
  });

  it('returns Top level for root groups', () => {
    const shapes: Shape[] = [createShape({ id: 'group-1', type: 'group', childrenIds: [] })];

    const items = buildSelectedInspectorItems(['group-1'], shapes);

    expect(items[0]?.hierarchyLabel).toBe('Top level');
  });

  it('returns generic breadcrumbs for nested ancestry', () => {
    const shapes: Shape[] = [
      createShape({ id: 'group-root', type: 'group', childrenIds: ['group-inner'] }),
      createShape({
        id: 'group-inner',
        type: 'group',
        parentId: 'group-root',
        childrenIds: ['shape-child'],
      }),
      createShape({ id: 'shape-child', type: 'text', parentId: 'group-inner' }),
    ];

    const items = buildSelectedInspectorItems(['shape-child'], shapes);

    expect(items[0]?.hierarchyLabel).toBe('Group > Group');
  });

  it('works with normalized top-level selection ids', () => {
    const shapes: Shape[] = [
      createShape({
        id: 'group-root',
        type: 'group',
        childrenIds: ['shape-child'],
      }),
      createShape({
        id: 'shape-child',
        type: 'rectangle',
        parentId: 'group-root',
      }),
      createShape({
        id: 'shape-sibling',
        type: 'image',
      }),
    ];

    const normalizedIds = normalizeShapeIdsForSelection(
      ['shape-child', 'group-root', 'shape-sibling'],
      shapes
    );

    const items = buildSelectedInspectorItems(normalizedIds, shapes);

    expect(items).toEqual([
      {
        id: 'group-root',
        typeLabel: 'Group',
        layerIndex: 0,
        hierarchyLabel: 'Top level',
      },
      {
        id: 'shape-sibling',
        typeLabel: 'Image',
        layerIndex: 2,
        hierarchyLabel: 'Ungrouped',
      },
    ]);
  });
});
