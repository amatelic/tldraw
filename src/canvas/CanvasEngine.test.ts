import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasEngine } from './CanvasEngine';
import type { Shape, ShapeStyle } from '../types';

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
  fillRect: vi.fn(),
  fillText: vi.fn(),
  strokeRect: vi.fn(),
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

const createDefaultStyle = (): ShapeStyle => ({
  color: '#111111',
  fillColor: '#111111',
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

describe('CanvasEngine text measurement', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('measures text width without exposing the rendering context', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    const context = createMockContext();
    context.font = '12px serif';
    context.measureText = vi.fn().mockReturnValue({ width: 84 });
    const canvas = createMockCanvas(context, 640, 480);
    const engine = new CanvasEngine(canvas as unknown as HTMLCanvasElement);

    expect(engine.measureTextWidth('Hello', 'bold 20px sans-serif')).toBe(84);
    expect(context.measureText).toHaveBeenCalledWith('Hello');
    expect(context.font).toBe('12px serif');
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

describe('CanvasEngine grid rendering', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders grid lines in screen space after applying camera pan and zoom', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    const context = createMockContext();
    const canvas = createMockCanvas(context, 100, 80);
    const engine = new CanvasEngine(canvas as unknown as HTMLCanvasElement);

    engine.drawGrid({ x: 10, y: 20, zoom: 2 }, 20);

    expect(context.moveTo).toHaveBeenCalledWith(10, 0);
    expect(context.lineTo).toHaveBeenCalledWith(10, 80);
    expect(context.moveTo).toHaveBeenCalledWith(50, 0);
    expect(context.lineTo).toHaveBeenCalledWith(50, 80);
    expect(context.moveTo).toHaveBeenCalledWith(0, 20);
    expect(context.lineTo).toHaveBeenCalledWith(100, 20);
    expect(context.moveTo).toHaveBeenCalledWith(0, 60);
    expect(context.lineTo).toHaveBeenCalledWith(100, 60);
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

describe('CanvasEngine audio cards', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createAudioShape = (
    overrides: Partial<Extract<Shape, { type: 'audio' }>> = {}
  ): Extract<Shape, { type: 'audio' }> => ({
    id: 'audio-1',
    type: 'audio' as const,
    bounds: { x: 10, y: 20, width: 300, height: 100 },
    src: 'audio.mp3',
    duration: 65,
    isPlaying: false,
    waveformData: [0.2, 0.8, 0.45, 1],
    isBase64: false,
    style: createDefaultStyle(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  it('draws audio shapes as rounded media cards', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    const context = createMockContext();
    const canvas = createMockCanvas(context, 640, 480);
    const engine = new CanvasEngine(canvas as unknown as HTMLCanvasElement);

    engine.drawShape(createAudioShape());

    expect(context.quadraticCurveTo).toHaveBeenCalled();
    expect(context.arc).toHaveBeenCalledWith(160, 70, expect.any(Number), 0, Math.PI * 2);
    expect(context.measureText).toHaveBeenCalledWith('1:05');
    expect(context.fillText).toHaveBeenCalledWith('1:05', expect.any(Number), expect.any(Number));
    expect(context.fillRect).toHaveBeenCalledTimes(4);
  });

  it('draws pause bars over the card button while audio is playing', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    const context = createMockContext();
    const canvas = createMockCanvas(context, 640, 480);
    const engine = new CanvasEngine(canvas as unknown as HTMLCanvasElement);

    engine.drawShape(createAudioShape({ isPlaying: true, waveformData: [0.5] }));

    expect(context.fillRect).toHaveBeenCalledTimes(3);
  });
});

describe('CanvasEngine text typography', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses style typography as a compatibility fallback for legacy text shapes', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    const context = createMockContext();
    const canvas = createMockCanvas(context, 640, 480);
    const engine = new CanvasEngine(canvas as unknown as HTMLCanvasElement);

    engine.drawShape({
      id: 'text-legacy',
      type: 'text',
      bounds: { x: 40, y: 50, width: 180, height: 60 },
      text: 'Legacy text',
      style: {
        color: '#111111',
        fillColor: '#ffffff',
        fillGradient: null,
        strokeWidth: 2,
        strokeStyle: 'solid',
        fillStyle: 'none',
        opacity: 1,
        blendMode: 'source-over',
        shadows: [],
        fontSize: 24,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as unknown as Parameters<CanvasEngine['drawShape']>[0]);

    expect(context.font).toBe('italic bold 24px Georgia');
    expect(context.textAlign).toBe('center');
  });
});

describe('CanvasEngine groups', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('derives the group label count from parent relationships', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    const context = createMockContext();
    const canvas = createMockCanvas(context, 640, 480);
    const engine = new CanvasEngine(canvas as unknown as HTMLCanvasElement);

    const now = Date.now();
    const groupStyle = {
      color: '#111111',
      fillColor: '#ffffff',
      fillGradient: null,
      strokeWidth: 2,
      strokeStyle: 'solid',
      fillStyle: 'none',
      opacity: 1,
      blendMode: 'source-over' as const,
      shadows: [],
      fontSize: 16,
      fontFamily: 'sans-serif',
      fontWeight: 'normal' as const,
      fontStyle: 'normal' as const,
      textAlign: 'left' as const,
    };

    engine.drawShape(
      {
        id: 'group-1',
        type: 'group',
        bounds: { x: 10, y: 20, width: 200, height: 120 },
        style: groupStyle,
        createdAt: now,
        updatedAt: now,
      },
      false,
      true,
      [
        {
          id: 'group-1',
          type: 'group',
          bounds: { x: 10, y: 20, width: 200, height: 120 },
          style: groupStyle,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'rect-1',
          type: 'rectangle',
          bounds: { x: 20, y: 30, width: 40, height: 40 },
          style: groupStyle,
          createdAt: now,
          updatedAt: now,
          parentId: 'group-1',
        },
        {
          id: 'rect-2',
          type: 'rectangle',
          bounds: { x: 80, y: 30, width: 40, height: 40 },
          style: groupStyle,
          createdAt: now,
          updatedAt: now,
          parentId: 'group-1',
        },
      ]
    );

    expect(context.fillText).toHaveBeenCalledWith('Group (2)', 14, 4);
  });
});
