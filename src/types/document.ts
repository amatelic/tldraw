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

export interface FillGradient {
  type: 'linear' | 'radial';
  startColor: string;
  endColor: string;
  angle: number;
}

export interface ShadowStyle {
  x: number;
  y: number;
  blur: number;
  color: string;
  opacity: number;
}

export interface TextTypography {
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}

export type ShapeType =
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'pencil'
  | 'image'
  | 'audio'
  | 'text'
  | 'embed'
  | 'group';

export interface ShapeStyle extends TextTypography {
  color: string;
  fillColor: string;
  fillGradient?: FillGradient | null;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  fillStyle: 'none' | 'solid' | 'pattern';
  opacity: number;
  blendMode: BlendMode;
  shadows: ShadowStyle[];
}

export interface BaseShape {
  id: string;
  type: ShapeType;
  bounds: Bounds;
  style: ShapeStyle;
  createdAt: number;
  updatedAt: number;
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

export interface TextShape extends BaseShape, TextTypography {
  type: 'text';
  text: string;
}

export interface EmbedShape extends BaseShape {
  type: 'embed';
  url: string;
  embedType: 'youtube' | 'website';
  embedSrc: string;
}

export interface GroupShape extends BaseShape {
  type: 'group';
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

export const DEFAULT_STYLE: ShapeStyle = {
  color: '#000000',
  fillColor: '#000000',
  fillGradient: null,
  strokeWidth: 2,
  strokeStyle: 'solid',
  fillStyle: 'none',
  opacity: 1,
  blendMode: 'source-over',
  shadows: [],
  fontSize: 16,
  fontFamily: 'sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
};

export const COLORS = [
  '#000000',
  '#dc2626',
  '#d97706',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
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
