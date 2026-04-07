export type ToolType =
  | 'select'
  | 'pan'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'freehand'
  | 'eraser'
  | 'image'
  | 'audio'
  | 'text'
  | 'embed';

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
  // Text-specific properties
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}

export interface BaseShape {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'freehand' | 'image' | 'audio' | 'text' | 'embed';
  bounds: Bounds;
  style: ShapeStyle;
  createdAt: number;
  updatedAt: number;
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

export interface FreehandShape extends BaseShape {
  type: 'freehand';
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

export type Shape =
  | RectangleShape
  | CircleShape
  | LineShape
  | FreehandShape
  | ImageShape
  | AudioShape
  | TextShape
  | EmbedShape;

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
    case 'freehand':
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
    default:
      return false;
  }
}
