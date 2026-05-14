import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, type Shape } from '../../types';
import { buildDraggedShapeUpdates, buildDragSessionShapes } from './dragSession';

const now = 1;

function createRectangle(id: string, x: number, y = 0, parentId?: string): Shape {
  return {
    id,
    type: 'rectangle',
    bounds: { x, y, width: 20, height: 10 },
    style: { ...DEFAULT_STYLE },
    createdAt: now,
    updatedAt: now,
    parentId,
  };
}

describe('canvas drag sessions', () => {
  it('normalizes child selections to their top-level group and includes descendants', () => {
    const group: Shape = {
      id: 'group-1',
      type: 'group',
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      style: { ...DEFAULT_STYLE },
      createdAt: now,
      updatedAt: now,
    };
    const child = createRectangle('child-1', 10, 20, group.id);
    const sibling = createRectangle('child-2', 40, 50, group.id);
    const other = createRectangle('other', 200);

    const sessionShapes = buildDragSessionShapes(['child-1', 'other'], [
      group,
      child,
      sibling,
      other,
    ]);

    expect(sessionShapes.map(({ shape }) => shape.id)).toEqual([
      'group-1',
      'child-1',
      'child-2',
      'other',
    ]);
    expect(sessionShapes.map(({ startPosition }) => startPosition)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 40, y: 50 },
      { x: 200, y: 0 },
    ]);
  });

  it('builds bounds-only updates for rectangular shapes', () => {
    const shape = createRectangle('rect-1', 10, 20);

    expect(buildDraggedShapeUpdates(shape, { x: 10, y: 20 }, 5, -3)).toEqual({
      bounds: { x: 15, y: 17, width: 20, height: 10 },
    });
  });

  it('moves circle centers together with bounds', () => {
    const shape: Shape = {
      id: 'circle-1',
      type: 'circle',
      bounds: { x: 5, y: 10, width: 20, height: 20 },
      center: { x: 15, y: 20 },
      radius: 10,
      style: { ...DEFAULT_STYLE },
      createdAt: now,
      updatedAt: now,
    };

    expect(buildDraggedShapeUpdates(shape, { x: 5, y: 10 }, -2, 4)).toEqual({
      center: { x: 13, y: 24 },
      bounds: { x: 3, y: 14, width: 20, height: 20 },
    });
  });

  it('moves line endpoints together with bounds', () => {
    const shape: Shape = {
      id: 'line-1',
      type: 'line',
      bounds: { x: 10, y: 20, width: 40, height: 30 },
      start: { x: 10, y: 20 },
      end: { x: 50, y: 50 },
      style: { ...DEFAULT_STYLE },
      createdAt: now,
      updatedAt: now,
    };

    expect(buildDraggedShapeUpdates(shape, { x: 10, y: 20 }, 5, 6)).toEqual({
      start: { x: 15, y: 26 },
      end: { x: 55, y: 56 },
      bounds: { x: 15, y: 26, width: 40, height: 30 },
    });
  });

  it('moves pencil points together with bounds', () => {
    const shape: Shape = {
      id: 'pencil-1',
      type: 'pencil',
      bounds: { x: 1, y: 2, width: 4, height: 6 },
      points: [
        { x: 1, y: 2 },
        { x: 5, y: 8 },
      ],
      style: { ...DEFAULT_STYLE },
      createdAt: now,
      updatedAt: now,
    };

    expect(buildDraggedShapeUpdates(shape, { x: 1, y: 2 }, 3, -1)).toEqual({
      points: [
        { x: 4, y: 1 },
        { x: 8, y: 7 },
      ],
      bounds: { x: 4, y: 1, width: 4, height: 6 },
    });
  });
});
