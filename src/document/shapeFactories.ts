import type { AudioShape, EmbedShape, ImageShape, Point, ShapeStyle, TextShape } from '../types';
import { createShapeId } from '../types';

interface BaseShapeFactoryOptions {
  center: Point;
  style: ShapeStyle;
  id?: string;
  now?: number;
}

export interface CreateImageShapeOptions extends BaseShapeFactoryOptions {
  src: string;
  isBase64: boolean;
  originalWidth: number;
  originalHeight: number;
  maxWidth?: number;
}

export interface CreateAudioShapeOptions extends BaseShapeFactoryOptions {
  src: string;
  isBase64: boolean;
  duration: number;
  waveformData: number[];
}

export interface CreateEmbedShapeOptions extends BaseShapeFactoryOptions {
  url: string;
  embedType: EmbedShape['embedType'];
  embedSrc: string;
}

export interface CreateTextShapeOptions {
  position: Point;
  style: ShapeStyle;
  id?: string;
  now?: number;
  text?: string;
  width?: number;
  height?: number;
}

function getShapeFactoryMetadata(options: Pick<BaseShapeFactoryOptions, 'id' | 'now'>): {
  id: string;
  timestamp: number;
} {
  return {
    id: options.id ?? createShapeId(),
    timestamp: options.now ?? Date.now(),
  };
}

export function createImageShapeFromUpload({
  src,
  isBase64,
  originalWidth,
  originalHeight,
  maxWidth = 300,
  center,
  style,
  id,
  now,
}: CreateImageShapeOptions): ImageShape {
  const { id: shapeId, timestamp } = getShapeFactoryMetadata({ id, now });
  const scale = Math.min(1, maxWidth / originalWidth);
  const width = originalWidth * scale;
  const height = originalHeight * scale;

  return {
    id: shapeId,
    type: 'image',
    bounds: {
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
    },
    src,
    originalWidth,
    originalHeight,
    isBase64,
    style: { ...style },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createAudioShapeFromUpload({
  src,
  isBase64,
  duration,
  waveformData,
  center,
  style,
  id,
  now,
}: CreateAudioShapeOptions): AudioShape {
  const { id: shapeId, timestamp } = getShapeFactoryMetadata({ id, now });

  return {
    id: shapeId,
    type: 'audio',
    bounds: {
      x: center.x - 150,
      y: center.y - 40,
      width: 300,
      height: 80,
    },
    src,
    duration,
    isPlaying: false,
    waveformData: [...waveformData],
    isBase64,
    loop: false,
    style: { ...style },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createEmbedShapeFromUrl({
  url,
  embedType,
  embedSrc,
  center,
  style,
  id,
  now,
}: CreateEmbedShapeOptions): EmbedShape {
  const { id: shapeId, timestamp } = getShapeFactoryMetadata({ id, now });

  return {
    id: shapeId,
    type: 'embed',
    bounds: {
      x: center.x - 240,
      y: center.y - 135,
      width: 480,
      height: 270,
    },
    url,
    embedType,
    embedSrc,
    style: { ...style },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createTextShapeAtPoint({
  position,
  style,
  id,
  now,
  text = '',
  width = 200,
  height = 100,
}: CreateTextShapeOptions): TextShape {
  const { id: shapeId, timestamp } = getShapeFactoryMetadata({ id, now });

  return {
    id: shapeId,
    type: 'text',
    bounds: {
      x: position.x,
      y: position.y,
      width,
      height,
    },
    text,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textAlign: style.textAlign,
    style: { ...style },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
