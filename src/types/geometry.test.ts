import { describe, expect, it } from 'vitest';

import { boundsIntersect, generateBounds } from './geometry';

describe('geometry helpers', () => {
  it('normalizes bounds regardless of drag direction', () => {
    expect(generateBounds({ x: 30, y: 40 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 20,
      height: 20,
    });
  });

  it('treats overlapping and edge-touching bounds as intersecting', () => {
    expect(
      boundsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 5, width: 4, height: 4 }
      )
    ).toBe(true);
  });

  it('returns false for separated bounds', () => {
    expect(
      boundsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 4, height: 4 }
      )
    ).toBe(false);
  });
});
