import { describe, expect, it } from 'vitest';

import type { GroupShape, Shape } from './document';
import { DEFAULT_STYLE } from './document';
import {
  getGroupBounds,
  getGroupDescendants,
  getSelectionBounds,
  getTopLevelSelectableShape,
  isShapeInGroup,
  normalizeShapeIdsForSelection,
} from './selection';

type ShapeBase = Pick<Shape, 'id' | 'bounds' | 'style' | 'createdAt' | 'updatedAt'>;

function createBaseShape(id: string, bounds: Shape['bounds']): ShapeBase {
  return {
    id,
    bounds,
    style: DEFAULT_STYLE,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('selection helpers', () => {
  const rootGroup: GroupShape = {
    ...createBaseShape('group-root', { x: 0, y: 0, width: 0, height: 0 }),
    type: 'group',
  };

  const rect: Shape = {
    ...createBaseShape('rect-1', { x: 10, y: 20, width: 40, height: 30 }),
    type: 'rectangle',
    parentId: 'group-root',
  };

  const nestedGroup: GroupShape = {
    ...createBaseShape('group-nested', { x: 80, y: 30, width: 20, height: 20 }),
    type: 'group',
    parentId: 'group-root',
  };

  const circle: Shape = {
    ...createBaseShape('circle-1', { x: 80, y: 30, width: 20, height: 20 }),
    type: 'circle',
    center: { x: 90, y: 40 },
    radius: 10,
    parentId: 'group-nested',
  };

  const standalone: Shape = {
    ...createBaseShape('text-1', { x: 140, y: 15, width: 30, height: 18 }),
    type: 'text',
    text: 'Hi',
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
  };

  const shapes: Shape[] = [rootGroup, rect, nestedGroup, circle, standalone];

  it('returns nested descendants in traversal order', () => {
    expect(getGroupDescendants('group-root', shapes).map((shape) => shape.id)).toEqual([
      'rect-1',
      'group-nested',
      'circle-1',
    ]);
  });

  it('tracks direct and indirect group membership', () => {
    expect(isShapeInGroup('rect-1', 'group-root', shapes)).toBe(true);
    expect(isShapeInGroup('circle-1', 'group-root', shapes)).toBe(true);
    expect(isShapeInGroup('text-1', 'group-root', shapes)).toBe(false);
  });

  it('normalizes grouped children to the outermost selectable shape', () => {
    expect(normalizeShapeIdsForSelection(['rect-1', 'circle-1', 'text-1'], shapes)).toEqual([
      'group-root',
      'text-1',
    ]);

    expect(getTopLevelSelectableShape('circle-1', shapes)?.id).toBe('group-root');
  });

  it('computes live group and selection bounds from child shapes', () => {
    expect(getGroupBounds('group-root', shapes)).toEqual({
      x: 10,
      y: 20,
      width: 90,
      height: 30,
    });

    expect(getSelectionBounds(['circle-1', 'text-1'], shapes)).toEqual({
      x: 10,
      y: 15,
      width: 160,
      height: 35,
    });
  });
});
