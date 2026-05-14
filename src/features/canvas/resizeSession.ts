import type { Bounds, CameraState, Point, Shape } from '../../types';
import { worldToScreenPoint } from '../../canvas/CanvasEngine';

export type ShapeResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface ShapeResizeSession {
  shapeId: string;
  handle: ShapeResizeHandle;
  startWorldPoint: Point;
  originalBounds: Bounds;
}

export interface ResizeHandleTarget {
  shape: Shape;
  handle: ShapeResizeHandle;
}

export const RESIZABLE_SHAPE_TYPES = new Set<Shape['type']>(['rectangle', 'image']);
export const RESIZE_HANDLE_HIT_RADIUS = 8;
export const MIN_RESIZABLE_SHAPE_SIZE = 8;

export const SHAPE_RESIZE_CURSORS: Record<ShapeResizeHandle, React.CSSProperties['cursor']> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

const HANDLE_HIT_PRIORITY: ShapeResizeHandle[] = ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'];

export function isBoundsResizableShape(shape: Shape): boolean {
  return RESIZABLE_SHAPE_TYPES.has(shape.type);
}

export function getResizeHandlePoints(bounds: Bounds): Record<ShapeResizeHandle, Point> {
  const { x, y, width, height } = bounds;

  return {
    nw: { x, y },
    n: { x: x + width / 2, y },
    ne: { x: x + width, y },
    e: { x: x + width, y: y + height / 2 },
    se: { x: x + width, y: y + height },
    s: { x: x + width / 2, y: y + height },
    sw: { x, y: y + height },
    w: { x, y: y + height / 2 },
  };
}

export function resizeBoundsByHandle(
  bounds: Bounds,
  handle: ShapeResizeHandle,
  deltaX: number,
  deltaY: number
): Bounds {
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;

  let nextX = bounds.x;
  let nextY = bounds.y;
  let nextWidth = bounds.width;
  let nextHeight = bounds.height;

  if (handle.includes('w')) {
    nextX = Math.min(bounds.x + deltaX, right - MIN_RESIZABLE_SHAPE_SIZE);
    nextWidth = right - nextX;
  }

  if (handle.includes('e')) {
    nextWidth = Math.max(MIN_RESIZABLE_SHAPE_SIZE, bounds.width + deltaX);
  }

  if (handle.includes('n')) {
    nextY = Math.min(bounds.y + deltaY, bottom - MIN_RESIZABLE_SHAPE_SIZE);
    nextHeight = bottom - nextY;
  }

  if (handle.includes('s')) {
    nextHeight = Math.max(MIN_RESIZABLE_SHAPE_SIZE, bounds.height + deltaY);
  }

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
}

export function findResizeHandleAtPoint(
  screenPoint: Point,
  shape: Shape,
  camera: CameraState,
  hitRadius = RESIZE_HANDLE_HIT_RADIUS
): ResizeHandleTarget | null {
  if (!isBoundsResizableShape(shape)) {
    return null;
  }

  const handlePoints = getResizeHandlePoints(shape.bounds);

  for (const handle of HANDLE_HIT_PRIORITY) {
    const handleScreenPoint = worldToScreenPoint(handlePoints[handle], camera);
    const distance = Math.hypot(
      screenPoint.x - handleScreenPoint.x,
      screenPoint.y - handleScreenPoint.y
    );

    if (distance <= hitRadius) {
      return { shape, handle };
    }
  }

  return null;
}
