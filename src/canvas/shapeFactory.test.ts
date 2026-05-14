import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from '../types';
import { createPencilShapeAtPoint, createShapeFromPoints } from './shapeFactory';

describe('canvas shape factory', () => {
  it('creates rectangle shapes from drag points', () => {
    expect(
      createShapeFromPoints(
        { x: 40, y: 60 },
        { x: 10, y: 20 },
        'rectangle',
        DEFAULT_STYLE,
        123
      )
    ).toMatchObject({
      id: 'shape-123',
      type: 'rectangle',
      bounds: { x: 10, y: 20, width: 30, height: 40 },
      createdAt: 123,
      updatedAt: 123,
    });
  });

  it('creates circles from the drag start as center', () => {
    const shape = createShapeFromPoints(
      { x: 10, y: 10 },
      { x: 13, y: 14 },
      'circle',
      DEFAULT_STYLE,
      456
    );

    expect(shape).toMatchObject({
      id: 'shape-456',
      type: 'circle',
      center: { x: 10, y: 10 },
      radius: 5,
      bounds: { x: 5, y: 5, width: 10, height: 10 },
    });
  });

  it('rejects non-drag-created shape types', () => {
    expect(() =>
      createShapeFromPoints({ x: 0, y: 0 }, { x: 10, y: 10 }, 'text', DEFAULT_STYLE, 1)
    ).toThrow('Cannot create text shape from points');
  });

  it('creates a pencil preview seed from a single world point', () => {
    expect(
      createPencilShapeAtPoint({
        id: 'pencil-1',
        now: 789,
        point: { x: 24, y: 36 },
        style: DEFAULT_STYLE,
      })
    ).toMatchObject({
      id: 'pencil-1',
      type: 'pencil',
      bounds: { x: 24, y: 36, width: 0, height: 0 },
      points: [{ x: 24, y: 36 }],
      createdAt: 789,
      updatedAt: 789,
    });
  });

  it('copies pencil seed point and style data instead of reusing mutable inputs', () => {
    const point = { x: 12, y: 18 };
    const shape = createPencilShapeAtPoint({
      id: 'pencil-2',
      now: 987,
      point,
      style: DEFAULT_STYLE,
    });

    point.x = 999;

    expect(shape.points[0]).toEqual({ x: 12, y: 18 });
    expect(shape.points[0]).not.toBe(point);
    expect(shape.style).toEqual(DEFAULT_STYLE);
    expect(shape.style).not.toBe(DEFAULT_STYLE);
  });
});
