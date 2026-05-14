import { describe, expect, it } from 'vitest';

import { DEFAULT_STYLE } from './document';
import { isPointInShape } from './hitTesting';

describe('hit-testing helpers', () => {
  it('hit-tests bounds-based shapes using their bounds', () => {
    const shape = {
      id: 'rect-1',
      type: 'rectangle' as const,
      bounds: { x: 10, y: 20, width: 100, height: 50 },
      style: DEFAULT_STYLE,
      createdAt: 1,
      updatedAt: 1,
    };

    expect(isPointInShape({ x: 20, y: 30 }, shape)).toBe(true);
    expect(isPointInShape({ x: 5, y: 30 }, shape)).toBe(false);
  });

  it('hit-tests circles using radius distance', () => {
    const shape = {
      id: 'circle-1',
      type: 'circle' as const,
      bounds: { x: 0, y: 0, width: 20, height: 20 },
      center: { x: 10, y: 10 },
      radius: 10,
      style: DEFAULT_STYLE,
      createdAt: 1,
      updatedAt: 1,
    };

    expect(isPointInShape({ x: 16, y: 10 }, shape)).toBe(true);
    expect(isPointInShape({ x: 25, y: 10 }, shape)).toBe(false);
  });

  it('hit-tests lines and arrows using the shared line-distance helper', () => {
    const line = {
      id: 'line-1',
      type: 'line' as const,
      bounds: { x: 0, y: 0, width: 20, height: 20 },
      start: { x: 0, y: 0 },
      end: { x: 20, y: 20 },
      style: DEFAULT_STYLE,
      createdAt: 1,
      updatedAt: 1,
    };

    const arrow = {
      id: 'arrow-1',
      type: 'arrow' as const,
      bounds: { x: 0, y: 0, width: 20, height: 20 },
      start: { x: 0, y: 20 },
      end: { x: 20, y: 0 },
      style: DEFAULT_STYLE,
      createdAt: 1,
      updatedAt: 1,
    };

    expect(isPointInShape({ x: 10, y: 12 }, line)).toBe(true);
    expect(isPointInShape({ x: 10, y: 10 }, arrow)).toBe(true);
    expect(isPointInShape({ x: 10, y: 30 }, line)).toBe(false);
  });
});
