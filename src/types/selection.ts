import type { Bounds, GroupShape, Shape } from './document';

function findShape(shapeId: string, shapes: Shape[]): Shape | undefined {
  return shapes.find((shape) => shape.id === shapeId);
}

export function getGroupChildren(groupId: string, shapes: Shape[]): Shape[] {
  return shapes.filter((shape) => shape.parentId === groupId);
}

export function getGroupChildIds(groupId: string, shapes: Shape[]): string[] {
  return getGroupChildren(groupId, shapes).map((shape) => shape.id);
}

export function getGroupDescendants(groupId: string, shapes: Shape[]): Shape[] {
  const descendants: Shape[] = [];
  const children = getGroupChildren(groupId, shapes);

  for (const child of children) {
    descendants.push(child);
    if (child.type === 'group') {
      descendants.push(...getGroupDescendants(child.id, shapes));
    }
  }

  return descendants;
}

export function getGroupBounds(groupId: string, shapes: Shape[]): Bounds | null {
  const children = getGroupChildren(groupId, shapes);

  if (children.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const child of children) {
    minX = Math.min(minX, child.bounds.x);
    minY = Math.min(minY, child.bounds.y);
    maxX = Math.max(maxX, child.bounds.x + child.bounds.width);
    maxY = Math.max(maxY, child.bounds.y + child.bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function isShapeInGroup(shapeId: string, groupId: string, shapes: Shape[]): boolean {
  const shape = findShape(shapeId, shapes);
  if (!shape) return false;

  if (shape.parentId === groupId) return true;
  if (shape.parentId) return isShapeInGroup(shape.parentId, groupId, shapes);

  return false;
}

export function getRootGroup(shapeId: string, shapes: Shape[]): GroupShape | null {
  const shape = findShape(shapeId, shapes);
  if (!shape || !shape.parentId) return null;

  const parent = findShape(shape.parentId, shapes);
  if (!parent) return null;

  if (parent.type === 'group') {
    const rootGroup = getRootGroup(parent.id, shapes);
    return rootGroup ?? parent;
  }

  return null;
}

export function getTopLevelSelectableShape(shapeId: string, shapes: Shape[]): Shape | null {
  const shape = findShape(shapeId, shapes);
  if (!shape) return null;

  return getRootGroup(shapeId, shapes) ?? shape;
}

export function normalizeShapeIdsForSelection(shapeIds: string[], shapes: Shape[]): string[] {
  const normalizedIds: string[] = [];
  const seenIds = new Set<string>();

  for (const shapeId of shapeIds) {
    const selectableShape = getTopLevelSelectableShape(shapeId, shapes);
    if (!selectableShape || seenIds.has(selectableShape.id)) {
      continue;
    }

    seenIds.add(selectableShape.id);
    normalizedIds.push(selectableShape.id);
  }

  return normalizedIds;
}

export function getSelectableShapeBounds(shapeId: string, shapes: Shape[]): Bounds | null {
  const selectableShape = getTopLevelSelectableShape(shapeId, shapes);
  if (!selectableShape) return null;

  if (selectableShape.type === 'group') {
    return getGroupBounds(selectableShape.id, shapes) ?? selectableShape.bounds;
  }

  return selectableShape.bounds;
}

export function getSelectionBounds(shapeIds: string[], shapes: Shape[]): Bounds | null {
  const normalizedIds = normalizeShapeIdsForSelection(shapeIds, shapes);
  let combinedBounds: Bounds | null = null;

  for (const shapeId of normalizedIds) {
    const bounds = getSelectableShapeBounds(shapeId, shapes);
    if (!bounds) continue;

    if (!combinedBounds) {
      combinedBounds = { ...bounds };
      continue;
    }

    const minX = Math.min(combinedBounds.x, bounds.x);
    const minY = Math.min(combinedBounds.y, bounds.y);
    const maxX = Math.max(combinedBounds.x + combinedBounds.width, bounds.x + bounds.width);
    const maxY = Math.max(combinedBounds.y + combinedBounds.height, bounds.y + bounds.height);

    combinedBounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  return combinedBounds;
}
