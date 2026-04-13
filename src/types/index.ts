export type ToolType =
  | 'select'
  | 'pan'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'pencil'
  | 'eraser'
  | 'image'
  | 'audio'
  | 'text'
  | 'embed';

// Canvas blend modes supported by globalCompositeOperation
export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShapeStyle {
  color: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  fillStyle: 'none' | 'solid' | 'pattern';
  opacity: number;
  blendMode: BlendMode;
  shadows: ShadowStyle[];
  // Text-specific properties
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}

// Shadow style for shape shadows
export interface ShadowStyle {
  x: number;
  y: number;
  blur: number;
  color: string;
  opacity: number;
}

export interface BaseShape {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'pencil' | 'image' | 'audio' | 'text' | 'embed' | 'group';
  bounds: Bounds;
  style: ShapeStyle;
  createdAt: number;
  updatedAt: number;
  // Grouping support
  parentId?: string;
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  center: Point;
  radius: number;
}

export interface LineShape extends BaseShape {
  type: 'line';
  start: Point;
  end: Point;
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  start: Point;
  end: Point;
}

export interface PencilShape extends BaseShape {
  type: 'pencil';
  points: Point[];
}

export interface ImageShape extends BaseShape {
  type: 'image';
  src: string;
  originalWidth: number;
  originalHeight: number;
  isBase64: boolean;
}

export interface AudioShape extends BaseShape {
  type: 'audio';
  src: string;
  duration: number;
  isPlaying: boolean;
  waveformData: number[];
  isBase64: boolean;
  loop?: boolean;
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}

export interface EmbedShape extends BaseShape {
  type: 'embed';
  url: string;
  embedType: 'youtube' | 'website';
  embedSrc: string;
}

// Group shape for nested grouping support
export interface GroupShape extends BaseShape {
  type: 'group';
  childrenIds: string[];
}

export type Shape =
  | RectangleShape
  | CircleShape
  | LineShape
  | ArrowShape
  | PencilShape
  | ImageShape
  | AudioShape
  | TextShape
  | EmbedShape
  | GroupShape;

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface EditorState {
  tool: ToolType;
  selectedShapeIds: string[];
  camera: CameraState;
  isDragging: boolean;
  isDrawing: boolean;
  shapeStyle: ShapeStyle;
  editingTextId: string | null;
}

export interface CanvasState {
  shapes: Shape[];
  editorState: EditorState;
}

export const DEFAULT_STYLE: ShapeStyle = {
  color: '#000000',
  fillColor: '#000000',
  strokeWidth: 2,
  strokeStyle: 'solid',
  fillStyle: 'none',
  opacity: 1,
  blendMode: 'source-over',
  shadows: [],
  // Text defaults
  fontSize: 16,
  fontFamily: 'sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
};

export const COLORS = [
  '#000000',
  '#1e1e1e',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#9333ea',
  '#db2777',
  '#9ca3af',
] as const;

export const STROKE_WIDTHS = [1, 2, 4, 8, 12] as const;

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 32, 48] as const;
export const FONT_FAMILIES = [
  'sans-serif',
  'serif',
  'monospace',
  'Arial',
  'Georgia',
  'Times New Roman',
] as const;

export function createShapeId(): string {
  return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateBounds(start: Point, end: Point): Bounds {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { x, y, width, height };
}

// Group-related helper functions

/**
 * Get all direct children of a group
 */
export function getGroupChildren(groupId: string, shapes: Shape[]): Shape[] {
  return shapes.filter((shape) => shape.parentId === groupId);
}

/**
 * Get all descendants of a group (including nested groups)
 */
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

/**
 * Get the bounds of a group including all its children
 */
export function getGroupBounds(groupId: string, shapes: Shape[]): Bounds | null {
  const children = getGroupChildren(groupId, shapes);
  
  if (children.length === 0) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const child of children) {
    const bounds = child.bounds;
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Check if a shape is part of a group (directly or indirectly)
 */
export function isShapeInGroup(shapeId: string, groupId: string, shapes: Shape[]): boolean {
  const shape = shapes.find((s) => s.id === shapeId);
  if (!shape) return false;
  
  if (shape.parentId === groupId) return true;
  if (shape.parentId) return isShapeInGroup(shape.parentId, groupId, shapes);
  
  return false;
}

/**
 * Get the root group (top-level parent) of a shape
 */
export function getRootGroup(shapeId: string, shapes: Shape[]): GroupShape | null {
  const shape = shapes.find((s) => s.id === shapeId);
  if (!shape || !shape.parentId) return null;
  
  const parent = shapes.find((s) => s.id === shape.parentId);
  if (!parent) return null;
  
  if (parent.type === 'group') {
    const rootGroup = getRootGroup(parent.id, shapes);
    return rootGroup || (parent as GroupShape);
  }
  
  return null;
}

export function isPointInShape(point: Point, shape: Shape): boolean {
  switch (shape.type) {
    case 'rectangle':
      return (
        point.x >= shape.bounds.x &&
        point.x <= shape.bounds.x + shape.bounds.width &&
        point.y >= shape.bounds.y &&
        point.y <= shape.bounds.y + shape.bounds.height
      );
    case 'circle': {
      const dx = point.x - shape.center.x;
      const dy = point.y - shape.center.y;
      return dx * dx + dy * dy <= shape.radius * shape.radius;
    }
    case 'line': {
      const { start, end } = shape;
      const lineLength = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
      if (lineLength === 0) return false;
      const t =
        ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) /
        lineLength ** 2;
      const closestX = start.x + t * (end.x - start.x);
      const closestY = start.y + t * (end.y - start.y);
      const distance = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
      return distance <= 5;
    }
    case 'arrow': {
      const { start, end } = shape;
      const arrowLength = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
      if (arrowLength === 0) return false;
      const t =
        ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) /
        arrowLength ** 2;
      const closestX = start.x + t * (end.x - start.x);
      const closestY = start.y + t * (end.y - start.y);
      const distance = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
      return distance <= 5;
    }
    case 'pencil':
      return shape.points.some((p) => {
        const d = Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2);
        return d <= 10;
      });
    case 'image':
    case 'audio':
    case 'text':
    case 'embed':
      return (
        point.x >= shape.bounds.x &&
        point.x <= shape.bounds.x + shape.bounds.width &&
        point.y >= shape.bounds.y &&
        point.y <= shape.bounds.y + shape.bounds.height
      );
    case 'group':
      // Groups are selected by their bounds or children
      return (
        point.x >= shape.bounds.x &&
        point.x <= shape.bounds.x + shape.bounds.width &&
        point.y >= shape.bounds.y &&
        point.y <= shape.bounds.y + shape.bounds.height
      );
    default:
      return false;
  }
}
