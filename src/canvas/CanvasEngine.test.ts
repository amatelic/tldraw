import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasEngine } from './CanvasEngine';

const createMockGradient = () => ({
  addColorStop: vi.fn(),
});

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
  fillText: vi.fn(),
  strokeText: vi.fn(),
  createLinearGradient: vi.fn().mockImplementation(() => createMockGradient()),
  createRadialGradient: vi.fn().mockImplementation(() => createMockGradient()),
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

const createMockCanvas = (
  context: ReturnType<typeof createMockContext>,
  width: number,
  height: number
) => ({
  getContext: vi.fn().mockReturnValue(context),
  getBoundingClientRect: vi.fn().mockReturnValue({ width, height }),
  width: 0,
  height: 0,
  style: {} as CSSStyleDeclaration,
});

describe('CanvasEngine resize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sizes the backing canvas using the current DPR', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const context = createMockContext();
    const canvas = createMockCanvas(context, 640, 480);

    const engine = new CanvasEngine(canvas as unknown as HTMLCanvasElement);

    expect(engine).toBeInstanceOf(CanvasEngine);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(960);
    expect(canvas.style.width).toBe('640px');
    expect(canvas.style.height).toBe('480px');
    expect(context.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    expect(context.scale).toHaveBeenCalledWith(2, 2);
  });

  it('resets the context transform before each resize', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const context = createMockContext();
    const canvas = createMockCanvas(context, 400, 300);
    const engine = new CanvasEngine(canvas as unknown as HTMLCanvasElement);

    canvas.getBoundingClientRect = vi.fn().mockReturnValue({ width: 500, height: 320 });

    engine.resize();

    expect(context.setTransform).toHaveBeenNthCalledWith(2, 1, 0, 0, 1, 0, 0);
    expect(context.scale).toHaveBeenNthCalledWith(2, 2, 2);
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(640);
  });
});

describe('CanvasEngine gradients', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a linear gradient fill for rectangles with fillGradient', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    const context = createMockContext();
    const canvas = createMockCanvas(context, 640, 480);
    const engine = new CanvasEngine(canvas as unknown as HTMLCanvasElement);

    engine.drawShape({
      id: 'rect-1',
      type: 'rectangle',
      bounds: { x: 10, y: 20, width: 120, height: 80 },
      style: {
        color: '#111111',
        fillColor: '#2563EB',
        fillGradient: {
          type: 'linear',
          startColor: '#2563EB',
          endColor: '#7C3AED',
          angle: 45,
        },
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
    });

    expect(context.createLinearGradient).toHaveBeenCalledOnce();
    const gradient = context.createLinearGradient.mock.results[0]?.value;
    expect(gradient.addColorStop).toHaveBeenNthCalledWith(1, 0, '#2563EB');
    expect(gradient.addColorStop).toHaveBeenNthCalledWith(2, 1, '#7C3AED');
    expect(context.fill).toHaveBeenCalled();
  });

  it('uses a radial gradient fill for circles with fillGradient', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    const context = createMockContext();
    const canvas = createMockCanvas(context, 640, 480);
    const engine = new CanvasEngine(canvas as unknown as HTMLCanvasElement);

    engine.drawShape({
      id: 'circle-1',
      type: 'circle',
      bounds: { x: 40, y: 40, width: 120, height: 120 },
      center: { x: 100, y: 100 },
      radius: 60,
      style: {
        color: '#111111',
        fillColor: '#16A34A',
        fillGradient: {
          type: 'radial',
          startColor: '#BBF7D0',
          endColor: '#15803D',
          angle: 0,
        },
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
    });

    expect(context.createRadialGradient).toHaveBeenCalledOnce();
    const gradient = context.createRadialGradient.mock.results[0]?.value;
    expect(gradient.addColorStop).toHaveBeenNthCalledWith(1, 0, '#BBF7D0');
    expect(gradient.addColorStop).toHaveBeenNthCalledWith(2, 1, '#15803D');
    expect(context.fill).toHaveBeenCalled();
  });
});

describe('CanvasEngine arrows', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('draws a larger, wider arrowhead for arrows', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    const context = createMockContext();
    const canvas = createMockCanvas(context, 640, 480);
    const engine = new CanvasEngine(canvas as unknown as HTMLCanvasElement);

    engine.drawShape({
      id: 'arrow-1',
      type: 'arrow',
      bounds: { x: 20, y: 80, width: 180, height: 20 },
      start: { x: 20, y: 90 },
      end: { x: 200, y: 90 },
      style: {
        color: '#111111',
        fillColor: '#111111',
        fillGradient: null,
        strokeWidth: 2,
        strokeStyle: 'dotted',
        fillStyle: 'none',
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
    });

    const lineToCalls = context.lineTo.mock.calls;
    expect(lineToCalls).toHaveLength(3);
    expect(context.setLineDash).toHaveBeenNthCalledWith(1, [2, 4]);
    expect(context.setLineDash).toHaveBeenLastCalledWith([]);

    const [, firstHead, secondHead] = lineToCalls as Array<[number, number]>;
    const headPoints = [firstHead, secondHead].sort((a, b) => a[1] - b[1]);

    expect(headPoints[0][0]).toBeCloseTo(188.67, 1);
    expect(headPoints[0][1]).toBeCloseTo(81.77, 1);
    expect(headPoints[1][0]).toBeCloseTo(188.67, 1);
    expect(headPoints[1][1]).toBeCloseTo(98.23, 1);
  });
});
