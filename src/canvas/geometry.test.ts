import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, type Shape } from '../types';
import {
  getArrowHeadPoints,
  getCombinedShapeBounds,
  getResizeHandles,
  getShapeBounds,
} from './geometry';

describe('canvas geometry helpers', () => {
  it('calculates bounds for point-based shapes', () => {
    const pencil: Shape = {
      id: 'pencil-1',
      type: 'pencil',
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      points: [
        { x: 40, y: 10 },
        { x: 10, y: 70 },
        { x: 80, y: 30 },
      ],
      style: { ...DEFAULT_STYLE },
      createdAt: 1,
      updatedAt: 1,
    };

    expect(getShapeBounds(pencil)).toEqual({ x: 10, y: 10, width: 70, height: 60 });
  });

  it('combines shape bounds with a minimum fitted size', () => {
    const shapes: Shape[] = [
      {
        id: 'rect-1',
        type: 'rectangle',
        bounds: { x: 10, y: 20, width: 50, height: 30 },
        style: { ...DEFAULT_STYLE },
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'line-1',
        type: 'line',
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        start: { x: -20, y: 10 },
        end: { x: 5, y: 80 },
        style: { ...DEFAULT_STYLE },
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    expect(getCombinedShapeBounds(shapes)).toEqual({ x: -20, y: 10, width: 80, height: 70 });
  });

  it('returns the eight resize handles around bounds', () => {
    expect(getResizeHandles({ x: 10, y: 20, width: 100, height: 80 })).toEqual([
      { x: 10, y: 20 },
      { x: 60, y: 20 },
      { x: 110, y: 20 },
      { x: 110, y: 60 },
      { x: 110, y: 100 },
      { x: 60, y: 100 },
      { x: 10, y: 100 },
      { x: 10, y: 60 },
    ]);
  });

  it('calculates reusable arrowhead points', () => {
    const arrow: Shape = {
      id: 'arrow-1',
      type: 'arrow',
      bounds: { x: 0, y: 0, width: 100, height: 0 },
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      style: { ...DEFAULT_STYLE, strokeWidth: 2 },
      createdAt: 1,
      updatedAt: 1,
    };

    const [left, end, right] = getArrowHeadPoints(arrow);

    expect(end).toEqual({ x: 100, y: 0 });
    expect(left.x).toBeCloseTo(88.67, 2);
    expect(left.y).toBeCloseTo(8.23, 2);
    expect(right.x).toBeCloseTo(88.67, 2);
    expect(right.y).toBeCloseTo(-8.23, 2);
  });
});
