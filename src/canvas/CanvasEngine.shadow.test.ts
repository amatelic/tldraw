import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanvasEngine } from './CanvasEngine';
import type { RectangleShape, CircleShape, LineShape, ArrowShape, PencilShape } from '../types';

// Mock canvas and context
const createMockContext = () => ({
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  rect: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  quadraticCurveTo: vi.fn(),
  setLineDash: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 50 }),
  // Shadow properties
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  // Style properties
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  font: '',
  textAlign: 'left',
  textBaseline: 'alphabetic',
});

const createMockCanvas = (ctx: ReturnType<typeof createMockContext>) => ({
  getContext: vi.fn().mockReturnValue(ctx),
  getBoundingClientRect: vi.fn().mockReturnValue({ width: 800, height: 600 }),
  width: 800,
  height: 600,
  style: {},
});

describe('CanvasEngine Shadow Support', () => {
  let engine: CanvasEngine;
  let ctx: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
    engine = new CanvasEngine(createMockCanvas(ctx) as unknown as HTMLCanvasElement);
  });

  describe('Single Shadow', () => {
    it('should render a rectangle with a single shadow', () => {
      const shape: RectangleShape = {
        id: 'rect-1',
        type: 'rectangle',
        bounds: { x: 10, y: 10, width: 100, height: 50 },
        style: {
          color: '#000000',
          fillColor: '#ffffff',
          strokeWidth: 2,
          strokeStyle: 'solid',
          fillStyle: 'solid',
          opacity: 1,
          blendMode: 'source-over',
          shadows: [
            { x: 5, y: 5, blur: 10, color: '#000000', opacity: 0.5 },
          ],
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.drawShape(shape);

      // Should call save/restore for shadow rendering
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();

      // Should draw the shape for shadow and actual (2 times)
      expect(ctx.beginPath).toHaveBeenCalledTimes(2);
      expect(ctx.rect).toHaveBeenCalledTimes(2);
      expect(ctx.rect).toHaveBeenCalledWith(10, 10, 100, 50);

      // Should draw fill twice (shadow + actual)
      expect(ctx.fill).toHaveBeenCalledTimes(2);

      // Should stroke twice (shadow + actual)
      expect(ctx.stroke).toHaveBeenCalledTimes(2);
    });

    it('should render a circle with a single shadow', () => {
      const shape: CircleShape = {
        id: 'circle-1',
        type: 'circle',
        bounds: { x: 40, y: 40, width: 100, height: 100 },
        center: { x: 90, y: 90 },
        radius: 50,
        style: {
          color: '#000000',
          fillColor: '#ff0000',
          strokeWidth: 2,
          strokeStyle: 'solid',
          fillStyle: 'solid',
          opacity: 1,
          blendMode: 'source-over',
          shadows: [
            { x: 3, y: 3, blur: 15, color: '#ff0000', opacity: 0.3 },
          ],
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.drawShape(shape);

      expect(ctx.save).toHaveBeenCalled();

      // Should draw circle path twice (shadow + actual)
      expect(ctx.beginPath).toHaveBeenCalledTimes(2);
      expect(ctx.arc).toHaveBeenCalledTimes(2);
      expect(ctx.arc).toHaveBeenCalledWith(90, 90, 50, 0, Math.PI * 2);

      // Should fill and stroke twice
      expect(ctx.fill).toHaveBeenCalledTimes(2);
      expect(ctx.stroke).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multiple Shadows', () => {
    it('should render a rectangle with multiple shadows', () => {
      const shape: RectangleShape = {
        id: 'rect-multi',
        type: 'rectangle',
        bounds: { x: 20, y: 20, width: 80, height: 40 },
        style: {
          color: '#000000',
          fillColor: '#ffffff',
          strokeWidth: 1,
          strokeStyle: 'solid',
          fillStyle: 'none',
          opacity: 1,
          blendMode: 'source-over',
          shadows: [
            { x: 10, y: 10, blur: 20, color: '#000000', opacity: 0.3 },
            { x: -5, y: -5, blur: 10, color: '#ff0000', opacity: 0.5 },
            { x: 0, y: 0, blur: 30, color: '#0000ff', opacity: 0.2 },
          ],
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.drawShape(shape);

      // Should save/restore once for all shadows
      expect(ctx.save).toHaveBeenCalledTimes(1);
      expect(ctx.restore).toHaveBeenCalledTimes(1);

      // Should draw shape 3 times for shadows + 1 for actual = 4 times
      expect(ctx.beginPath).toHaveBeenCalledTimes(4);
      expect(ctx.rect).toHaveBeenCalledTimes(4);

      // Should stroke 4 times (3 shadows + 1 actual)
      // (no fill since fillStyle is 'none')
      expect(ctx.stroke).toHaveBeenCalledTimes(4);
    });

    it('should render a line with multiple shadows', () => {
      const shape: LineShape = {
        id: 'line-1',
        type: 'line',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        style: {
          color: '#000000',
          fillColor: '#000000',
          strokeWidth: 2,
          strokeStyle: 'solid',
          fillStyle: 'none',
          opacity: 1,
          blendMode: 'source-over',
          shadows: [
            { x: 2, y: 2, blur: 5, color: '#000000', opacity: 0.5 },
            { x: -2, y: -2, blur: 5, color: '#ffffff', opacity: 0.3 },
          ],
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.drawShape(shape);

      // Line draws: 2 shadows + 1 actual = 3 strokes
      expect(ctx.stroke).toHaveBeenCalledTimes(3);

      // Should create path 3 times
      expect(ctx.beginPath).toHaveBeenCalledTimes(3);
      expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
      expect(ctx.lineTo).toHaveBeenCalledWith(100, 100);
    });

    it('should render an arrow with multiple shadows including arrowhead', () => {
      const shape: ArrowShape = {
        id: 'arrow-1',
        type: 'arrow',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
        start: { x: 0, y: 25 },
        end: { x: 100, y: 25 },
        style: {
          color: '#000000',
          fillColor: '#000000',
          strokeWidth: 2,
          strokeStyle: 'solid',
          fillStyle: 'none',
          opacity: 1,
          blendMode: 'source-over',
          shadows: [
            { x: 3, y: 3, blur: 8, color: '#333333', opacity: 0.4 },
          ],
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.drawShape(shape);

      // Arrow draws: line stroke + arrowhead for each shadow + actual
      // 1 shadow = 2 strokes (line + arrowhead), actual = 2 strokes
      expect(ctx.stroke).toHaveBeenCalledTimes(4);
    });
  });

  describe('No Shadows', () => {
    it('should render a shape without shadows when shadows array is empty', () => {
      const shape: RectangleShape = {
        id: 'rect-no-shadow',
        type: 'rectangle',
        bounds: { x: 10, y: 10, width: 50, height: 50 },
        style: {
          color: '#000000',
          fillColor: '#ffffff',
          strokeWidth: 2,
          strokeStyle: 'solid',
          fillStyle: 'solid',
          opacity: 1,
          blendMode: 'source-over',
          shadows: [],
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.drawShape(shape);

      // Should not save/restore for shadows
      expect(ctx.save).not.toHaveBeenCalled();
      expect(ctx.restore).not.toHaveBeenCalled();

      // Should draw only once (no shadow passes)
      expect(ctx.rect).toHaveBeenCalledTimes(1);
      expect(ctx.fill).toHaveBeenCalledTimes(1);
    });

    it('should render a shape without shadows when shadows property is undefined', () => {
      const shape = {
        id: 'rect-no-shadow-prop',
        type: 'rectangle',
        bounds: { x: 10, y: 10, width: 50, height: 50 },
        style: {
          color: '#000000',
          fillColor: '#ffffff',
          strokeWidth: 2,
          strokeStyle: 'solid',
          fillStyle: 'solid',
          opacity: 1,
          blendMode: 'source-over',
          // shadows property missing
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as RectangleShape;

      engine.drawShape(shape);

      // Should not save/restore for shadows
      expect(ctx.save).not.toHaveBeenCalled();
      expect(ctx.restore).not.toHaveBeenCalled();

      // Should draw only once
      expect(ctx.rect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pencil Shapes', () => {
    it('should render a pencil shape with shadows', () => {
      const shape: PencilShape = {
        id: 'pencil-1',
        type: 'pencil',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 25 },
          { x: 100, y: 50 },
        ],
        style: {
          color: '#000000',
          fillColor: '#000000',
          strokeWidth: 3,
          strokeStyle: 'solid',
          fillStyle: 'none',
          opacity: 1,
          blendMode: 'source-over',
          shadows: [
            { x: 2, y: 2, blur: 5, color: '#000000', opacity: 0.3 },
          ],
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      engine.drawShape(shape);

      // Should draw pencil path for shadow and actual
      expect(ctx.beginPath).toHaveBeenCalledTimes(2);
      expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
      expect(ctx.stroke).toHaveBeenCalledTimes(2);
    });
  });

  describe('hexToRgba Helper', () => {
    it('should convert 6-character hex to rgba', () => {
      const shape: RectangleShape = {
        id: 'test',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 50, height: 50 },
        style: {
          color: '#000000',
          fillColor: '#ffffff',
          strokeWidth: 2,
          strokeStyle: 'solid',
          fillStyle: 'solid',
          opacity: 1,
          blendMode: 'source-over',
          shadows: [
            { x: 5, y: 5, blur: 10, color: '#ff0000', opacity: 0.5 },
          ],
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Spy on shadowColor assignment
      const shadowColorSpy = vi.spyOn(ctx, 'shadowColor', 'set');

      engine.drawShape(shape);

      // Should set shadow color in rgba format
      expect(shadowColorSpy).toHaveBeenCalled();
      // Get all calls that set shadow color (not the final 'transparent')
      const rgbaCalls = shadowColorSpy.mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].startsWith('rgba')
      );
      expect(rgbaCalls.length).toBeGreaterThan(0);
      expect(rgbaCalls[0][0]).toContain('rgba');
      expect(rgbaCalls[0][0]).toContain('255');
      expect(rgbaCalls[0][0]).toContain('0');
      expect(rgbaCalls[0][0]).toContain('0.5');
    });

    it('should convert 3-character hex to rgba', () => {
      const shape: RectangleShape = {
        id: 'test',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 50, height: 50 },
        style: {
          color: '#000000',
          fillColor: '#ffffff',
          strokeWidth: 2,
          strokeStyle: 'solid',
          fillStyle: 'solid',
          opacity: 1,
          blendMode: 'source-over',
          shadows: [
            { x: 5, y: 5, blur: 10, color: '#0f0', opacity: 0.75 },
          ],
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shadowColorSpy = vi.spyOn(ctx, 'shadowColor', 'set');

      engine.drawShape(shape);

      expect(shadowColorSpy).toHaveBeenCalled();
      // Get all calls that set shadow color (not the final 'transparent')
      const rgbaCalls = shadowColorSpy.mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].startsWith('rgba')
      );
      expect(rgbaCalls.length).toBeGreaterThan(0);
      expect(rgbaCalls[0][0]).toContain('rgba');
      expect(rgbaCalls[0][0]).toContain('0');
      expect(rgbaCalls[0][0]).toContain('255');
      expect(rgbaCalls[0][0]).toContain('0');
    });
  });
});
