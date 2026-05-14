import type { Point, Shape } from '../../types';
import { getGroupDescendants, normalizeShapeIdsForSelection } from '../../types/selection';

export interface DragSessionShape {
  shape: Shape;
  startPosition: Point;
}

export function buildDragSessionShapes(selectionIds: string[], shapes: Shape[]): DragSessionShape[] {
  const normalizedSelectionIds = normalizeShapeIdsForSelection(selectionIds, shapes);
  const dragShapes: DragSessionShape[] = [];
  const seenIds = new Set<string>();

  const addShape = (shape: Shape): void => {
    if (seenIds.has(shape.id)) {
      return;
    }

    seenIds.add(shape.id);
    dragShapes.push({
      shape,
      startPosition: { x: shape.bounds.x, y: shape.bounds.y },
    });
  };

  normalizedSelectionIds.forEach((id) => {
    const shape = shapes.find((candidate) => candidate.id === id);
    if (!shape) {
      return;
    }

    addShape(shape);

    if (shape.type === 'group') {
      getGroupDescendants(id, shapes).forEach(addShape);
    }
  });

  return dragShapes;
}

export function buildDraggedShapeUpdates(
  shape: Shape,
  startPosition: Point,
  dx: number,
  dy: number
): Partial<Shape> {
  const nextBounds = {
    ...shape.bounds,
    x: startPosition.x + dx,
    y: startPosition.y + dy,
  };

  switch (shape.type) {
    case 'circle':
      return {
        center: {
          x: shape.center.x + dx,
          y: shape.center.y + dy,
        },
        bounds: nextBounds,
      };

    case 'line':
    case 'arrow':
      return {
        start: {
          x: shape.start.x + dx,
          y: shape.start.y + dy,
        },
        end: {
          x: shape.end.x + dx,
          y: shape.end.y + dy,
        },
        bounds: nextBounds,
      };

    case 'pencil':
      return {
        points: shape.points.map((point) => ({
          x: point.x + dx,
          y: point.y + dy,
        })),
        bounds: nextBounds,
      };

    case 'rectangle':
    case 'image':
    case 'audio':
    case 'text':
    case 'embed':
    case 'group':
    default:
      return {
        bounds: nextBounds,
      };
  }
}
