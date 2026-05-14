import type { Bounds, Point, Shape } from './document';

function isPointInBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

function getDistanceToLine(point: Point, start: Point, end: Point): number | null {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;

  if (lengthSquared === 0) {
    return null;
  }

  const projection = ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared;
  const closestX = start.x + projection * deltaX;
  const closestY = start.y + projection * deltaY;

  return Math.hypot(point.x - closestX, point.y - closestY);
}

export function isPointInShape(point: Point, shape: Shape): boolean {
  switch (shape.type) {
    case 'rectangle':
    case 'image':
    case 'audio':
    case 'text':
    case 'embed':
    case 'group':
      return isPointInBounds(point, shape.bounds);
    case 'circle':
      return Math.hypot(point.x - shape.center.x, point.y - shape.center.y) <= shape.radius;
    case 'line':
    case 'arrow': {
      const distance = getDistanceToLine(point, shape.start, shape.end);
      return distance !== null && distance <= 5;
    }
    case 'pencil':
      return shape.points.some((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) <= 10);
    default:
      return false;
  }
}
