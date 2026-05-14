import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Shape, ShapeStyle } from '../types';
import { CanvasEngine } from './CanvasEngine';

const createMockContext = () => ({
  setTransform: vi.fn(),
  scale: vi.fn(),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
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
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  strokeRect: vi.fn(),
  strokeText: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  measureText: vi.fn().mockReturnValue({ width: 50 }),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  font: '',
  textAlign: 'left',
  textBaseline: 'alphabetic',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
});

const createMockCanvas = (context: ReturnType<typeof createMockContext>) =>
  ({
    getContext: vi.fn(() => context),
    getBoundingClientRect: vi.fn(() => ({ width: 640, height: 480 })),
    width: 0,
    height: 0,
    style: {} as CSSStyleDeclaration,
  }) as unknown as HTMLCanvasElement;

const createDefaultStyle = (): ShapeStyle => ({
  color: '#111111',
  fillColor: '#ffffff',
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
});

const createImageShape = (src: string): Extract<Shape, { type: 'image' }> => ({
  id: 'image-1',
  type: 'image',
  src,
  bounds: { x: 24, y: 32, width: 160, height: 120 },
  style: createDefaultStyle(),
  createdAt: 1,
  updatedAt: 1,
});

type ImageEventHandler = ((this: ImageStub, event: Event) => unknown) | null;

class ImageStub {
  static instances: ImageStub[] = [];

  complete = false;
  naturalWidth = 0;
  onload: ImageEventHandler = null;
  onerror: ImageEventHandler = null;
  src = '';

  constructor() {
    ImageStub.instances.push(this);
  }

  load(): void {
    this.complete = true;
    this.naturalWidth = 160;
    this.onload?.call(this, new Event('load'));
  }
}

describe('CanvasEngine image loading', () => {
  beforeEach(() => {
    ImageStub.instances = [];
    vi.stubGlobal('Image', ImageStub);
    vi.stubGlobal('devicePixelRatio', 1);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests a rerender when an async image finishes loading', () => {
    const context = createMockContext();
    const canvas = createMockCanvas(context);
    const requestRender = vi.fn();
    const engine = new CanvasEngine(canvas, { onImageLoad: requestRender });
    const shape = createImageShape('image://rerender-on-load');

    engine.drawShape(shape);

    expect(context.fillRect).toHaveBeenCalledWith(24, 32, 160, 120);
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(ImageStub.instances).toHaveLength(1);

    ImageStub.instances[0].load();

    expect(requestRender).toHaveBeenCalledTimes(1);

    const exportContext = createMockContext();
    const exportCanvas = createMockCanvas(exportContext);
    const exportEngine = new CanvasEngine(exportCanvas);
    exportEngine.drawShape(shape);

    expect(exportContext.fillRect).not.toHaveBeenCalledWith(24, 32, 160, 120);
    expect(exportContext.drawImage).toHaveBeenCalledWith(ImageStub.instances[0], 24, 32, 160, 120);
  });
});
