import { describe, expect, it } from 'vitest';
import type { ShapeStyle } from '../types';
import {
  createAudioShapeFromUpload,
  createEmbedShapeFromUrl,
  createImageShapeFromUpload,
  createTextShapeAtPoint,
} from './shapeFactories';

const baseStyle: ShapeStyle = {
  color: '#111111',
  fillColor: '#ffffff',
  fillGradient: null,
  strokeWidth: 2,
  strokeStyle: 'solid',
  fillStyle: 'none',
  opacity: 1,
  blendMode: 'source-over',
  shadows: [],
  fontSize: 18,
  fontFamily: 'Inter',
  fontWeight: 'bold',
  fontStyle: 'italic',
  textAlign: 'center',
};

describe('shapeFactories', () => {
  it('creates centered image shapes with upload dimensions scaled down to the max width', () => {
    const shape = createImageShapeFromUpload({
      id: 'image-1',
      now: 123,
      src: 'data:image/png;base64,abc',
      isBase64: true,
      originalWidth: 600,
      originalHeight: 300,
      center: { x: 400, y: 300 },
      style: baseStyle,
    });

    expect(shape).toMatchObject({
      id: 'image-1',
      type: 'image',
      bounds: { x: 250, y: 225, width: 300, height: 150 },
      src: 'data:image/png;base64,abc',
      originalWidth: 600,
      originalHeight: 300,
      isBase64: true,
      createdAt: 123,
      updatedAt: 123,
    });
    expect(shape.style).toEqual(baseStyle);
    expect(shape.style).not.toBe(baseStyle);
  });

  it('creates audio shapes with runtime playback defaults and copied waveform data', () => {
    const waveformData = [0.1, 0.5, 0.2];
    const shape = createAudioShapeFromUpload({
      id: 'audio-1',
      now: 456,
      src: 'audio://clip',
      isBase64: false,
      duration: 12.5,
      waveformData,
      center: { x: 500, y: 300 },
      style: baseStyle,
    });

    expect(shape).toMatchObject({
      id: 'audio-1',
      type: 'audio',
      bounds: { x: 350, y: 260, width: 300, height: 80 },
      src: 'audio://clip',
      duration: 12.5,
      isPlaying: false,
      isBase64: false,
      loop: false,
      createdAt: 456,
      updatedAt: 456,
    });
    expect(shape.waveformData).toEqual(waveformData);
    expect(shape.waveformData).not.toBe(waveformData);
  });

  it('creates embed shapes using the standard 16:9 insertion size', () => {
    const shape = createEmbedShapeFromUrl({
      id: 'embed-1',
      now: 789,
      url: 'https://example.com/watch',
      embedType: 'website',
      embedSrc: 'https://example.com/watch',
      center: { x: 500, y: 300 },
      style: baseStyle,
    });

    expect(shape).toMatchObject({
      id: 'embed-1',
      type: 'embed',
      bounds: { x: 260, y: 165, width: 480, height: 270 },
      url: 'https://example.com/watch',
      embedType: 'website',
      embedSrc: 'https://example.com/watch',
      createdAt: 789,
      updatedAt: 789,
    });
  });

  it('creates text shapes with typography mirrored from the active style', () => {
    const shape = createTextShapeAtPoint({
      id: 'text-1',
      now: 321,
      position: { x: 40, y: 80 },
      text: 'Hello',
      style: baseStyle,
    });

    expect(shape).toMatchObject({
      id: 'text-1',
      type: 'text',
      bounds: { x: 40, y: 80, width: 200, height: 100 },
      text: 'Hello',
      fontSize: 18,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fontStyle: 'italic',
      textAlign: 'center',
      createdAt: 321,
      updatedAt: 321,
    });
  });

  it('creates empty text shapes with custom insertion bounds', () => {
    const shape = createTextShapeAtPoint({
      id: 'text-2',
      now: 654,
      position: { x: -10, y: 20 },
      width: 320,
      height: 160,
      style: baseStyle,
    });

    expect(shape).toMatchObject({
      id: 'text-2',
      type: 'text',
      bounds: { x: -10, y: 20, width: 320, height: 160 },
      text: '',
      createdAt: 654,
      updatedAt: 654,
    });
    expect(shape.style).toEqual(baseStyle);
    expect(shape.style).not.toBe(baseStyle);
  });
});
