import type { ArrowShape, Bounds, Point, Shape } from '../types';

export const ARROW_HEAD_MIN_LENGTH = 14;
export const ARROW_HEAD_MAX_LENGTH = 24;
export const ARROW_HEAD_ANGLE = Math.PI / 5;

export function getShapeBounds(shape: Shape): Bounds {
  switch (shape.type) {
    case 'rectangle':
      return shape.bounds;
    case 'circle':
      return {
        x: shape.center.x - shape.radius,
        y: shape.center.y - shape.radius,
        width: shape.radius * 2,
        height: shape.radius * 2,
      };
    case 'line':
    case 'arrow':
      return {
        x: Math.min(shape.start.x, shape.end.x),
        y: Math.min(shape.start.y, shape.end.y),
        width: Math.abs(shape.end.x - shape.start.x),
        height: Math.abs(shape.end.y - shape.start.y),
      };
    case 'pencil': {
      if (shape.points.length === 0) {
        return shape.bounds;
      }

      const xs = shape.points.map((point) => point.x);
      const ys = shape.points.map((point) => point.y);
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };
    }
    case 'image':
    case 'audio':
    case 'text':
    case 'embed':
    case 'group':
      return shape.bounds;
  }
}

export function getCombinedShapeBounds(shapes: Shape[]): Bounds | null {
  if (shapes.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    const bounds = getShapeBounds(shape);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function getResizeHandles(bounds: Bounds): Point[] {
  const { x, y, width, height } = bounds;
  return [
    { x, y },
    { x: x + width / 2, y },
    { x: x + width, y },
    { x: x + width, y: y + height / 2 },
    { x: x + width, y: y + height },
    { x: x + width / 2, y: y + height },
    { x, y: y + height },
    { x, y: y + height / 2 },
  ];
}

export function getArrowHeadPoints(shape: ArrowShape): [Point, Point, Point] {
  const { start, end } = shape;
  const lineLength = Math.hypot(end.x - start.x, end.y - start.y);
  const arrowLength = Math.min(
    ARROW_HEAD_MAX_LENGTH,
    Math.max(ARROW_HEAD_MIN_LENGTH, shape.style.strokeWidth * 5)
  );
  const cappedArrowLength = Math.min(arrowLength, Math.max(lineLength * 0.6, 8));
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  return [
    {
      x: end.x - cappedArrowLength * Math.cos(angle - ARROW_HEAD_ANGLE),
      y: end.y - cappedArrowLength * Math.sin(angle - ARROW_HEAD_ANGLE),
    },
    end,
    {
      x: end.x - cappedArrowLength * Math.cos(angle + ARROW_HEAD_ANGLE),
      y: end.y - cappedArrowLength * Math.sin(angle + ARROW_HEAD_ANGLE),
    },
  ];
}
