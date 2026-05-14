import { createShapeId } from '../types';
import type { PencilShape, Point, Shape, ShapeStyle } from '../types';

interface ShapeFactoryMetadataOptions {
  id?: string;
  now?: number;
}

export interface CreatePencilShapeAtPointOptions extends ShapeFactoryMetadataOptions {
  point: Point;
  style: ShapeStyle;
}

function getShapeFactoryMetadata(options: ShapeFactoryMetadataOptions): {
  id: string;
  timestamp: number;
} {
  return {
    id: options.id ?? createShapeId(),
    timestamp: options.now ?? Date.now(),
  };
}

export function createPencilShapeAtPoint({
  point,
  style,
  id,
  now,
}: CreatePencilShapeAtPointOptions): PencilShape {
  const { id: shapeId, timestamp } = getShapeFactoryMetadata({ id, now });

  return {
    id: shapeId,
    type: 'pencil',
    bounds: { x: point.x, y: point.y, width: 0, height: 0 },
    points: [{ ...point }],
    style: { ...style },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createShapeFromPoints(
  start: Point,
  end: Point,
  type: Shape['type'],
  style: ShapeStyle,
  now: number = Date.now()
): Shape {
  const id = `shape-${now}`;
  const bounds = {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };

  switch (type) {
    case 'rectangle':
      return {
        id,
        type: 'rectangle',
        bounds,
        style: { ...style },
        createdAt: now,
        updatedAt: now,
      };
    case 'circle': {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      return {
        id,
        type: 'circle',
        bounds: {
          x: start.x - radius,
          y: start.y - radius,
          width: radius * 2,
          height: radius * 2,
        },
        center: start,
        radius,
        style: { ...style },
        createdAt: now,
        updatedAt: now,
      };
    }
    case 'line':
      return {
        id,
        type: 'line',
        bounds,
        start,
        end,
        style: { ...style },
        createdAt: now,
        updatedAt: now,
      };
    case 'arrow':
      return {
        id,
        type: 'arrow',
        bounds,
        start,
        end,
        style: { ...style },
        createdAt: now,
        updatedAt: now,
      };
    case 'pencil':
      return {
        id,
        type: 'pencil',
        bounds,
        points: [start, end],
        style: { ...style },
        createdAt: now,
        updatedAt: now,
      };
    case 'image':
    case 'audio':
      throw new Error(`Cannot create ${type} shape from points. Use file upload instead.`);
    case 'text':
      throw new Error('Cannot create text shape from points. Use text tool instead.');
    case 'embed':
      throw new Error('Cannot create embed shape from points. Use embed dialog instead.');
    case 'group':
      throw new Error('Cannot create shape of type group from points.');
  }
}
