import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, type Shape } from '../../types';
import {
  findResizeHandleAtPoint,
  getResizeHandlePoints,
  isBoundsResizableShape,
  resizeBoundsByHandle,
} from './resizeSession';

function createShape(type: Shape['type'], id = type): Shape {
  return {
    id,
    type: type as 'rectangle',
    bounds: { x: 10, y: 20, width: 100, height: 80 },
    style: { ...DEFAULT_STYLE },
    createdAt: 1,
    updatedAt: 1,
  } as Shape;
}

describe('canvas resize sessions', () => {
  it('returns all eight resize handles around bounds', () => {
    expect(getResizeHandlePoints({ x: 10, y: 20, width: 100, height: 80 })).toEqual({
      nw: { x: 10, y: 20 },
      n: { x: 60, y: 20 },
      ne: { x: 110, y: 20 },
      e: { x: 110, y: 60 },
      se: { x: 110, y: 100 },
      s: { x: 60, y: 100 },
      sw: { x: 10, y: 100 },
      w: { x: 10, y: 60 },
    });
  });

  it('only treats bounds-backed media shapes as resizable', () => {
    expect(isBoundsResizableShape(createShape('rectangle'))).toBe(true);
    expect(isBoundsResizableShape(createShape('image'))).toBe(true);
    expect(isBoundsResizableShape(createShape('text'))).toBe(false);
  });

  it('resizes from each side and clamps to the minimum size', () => {
    const bounds = { x: 10, y: 20, width: 100, height: 80 };

    expect(resizeBoundsByHandle(bounds, 'se', 15, 20)).toEqual({
      x: 10,
      y: 20,
      width: 115,
      height: 100,
    });
    expect(resizeBoundsByHandle(bounds, 'nw', 200, 200)).toEqual({
      x: 102,
      y: 92,
      width: 8,
      height: 8,
    });
  });

  it('finds handle hits in screen space with camera transform', () => {
    const shape = createShape('rectangle');
    const camera = { x: 100, y: 50, zoom: 2 };

    expect(findResizeHandleAtPoint({ x: 320, y: 250 }, shape, camera)?.handle).toBe('se');
    expect(findResizeHandleAtPoint({ x: 500, y: 500 }, shape, camera)).toBeNull();
  });
});
