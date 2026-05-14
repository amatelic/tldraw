import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RectangleShape, TextShape } from '../types';
import {
  createCanvasImageExportFilename,
  createSvgExport,
  downloadShapesAsPng,
  downloadShapesAsSvg,
} from './export';

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

function createRectangleShape(): RectangleShape {
  return {
    id: 'rect-1',
    type: 'rectangle',
    bounds: { x: 40, y: 60, width: 120, height: 80 },
    style: {
      color: '#111111',
      fillColor: '#2563eb',
      fillGradient: null,
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
    createdAt: 1,
    updatedAt: 1,
  };
}

function createTextShape(): TextShape {
  return {
    id: 'text-1',
    type: 'text',
    text: 'Export me',
    bounds: { x: 200, y: 80, width: 180, height: 60 },
    fontSize: 18,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fontStyle: 'italic',
    textAlign: 'center',
    style: {
      color: '#222222',
      fillColor: '#ffffff',
      fillGradient: null,
      strokeWidth: 2,
      strokeStyle: 'solid',
      fillStyle: 'none',
      opacity: 1,
      blendMode: 'source-over',
      shadows: [],
      fontSize: 18,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontStyle: 'italic',
      textAlign: 'center',
    },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('CanvasEngine export helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates scope-aware image export filenames with timestamps', () => {
    const filename = createCanvasImageExportFilename(
      'Export Demo',
      'png',
      'selected',
      new Date('2026-04-24T08:15:30.000Z')
    );

    expect(filename).toBe('export-demo-selected-2026-04-24T08-15-30Z.png');
  });

  it('creates SVG markup for fitted exports', () => {
    const svg = createSvgExport({
      shapes: [createRectangleShape(), createTextShape()],
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg).toContain('Export me');
    expect(svg).toContain('viewBox="0 0');
  });

  it('renders a fitted PNG export and downloads it', () => {
    const context = createMockContext();
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: vi.fn(() => context),
          getBoundingClientRect: vi.fn(() => ({ width: 1, height: 1 })),
          toDataURL: vi.fn(() => 'data:image/png;base64,exported'),
          width: 0,
          height: 0,
          style: {},
        } as unknown as HTMLCanvasElement;
      }

      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: clickSpy,
        } as unknown as HTMLAnchorElement;
      }

      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    downloadShapesAsPng({
      shapes: [createRectangleShape()],
      workspaceName: 'Export Demo',
      scope: 'all',
    });

    expect(context.rect).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('downloads SVG exports as blob files', async () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:svg-export');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: clickSpy,
        } as unknown as HTMLAnchorElement;
      }

      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    downloadShapesAsSvg({
      shapes: [createRectangleShape()],
      workspaceName: 'Export Demo',
      scope: 'selected',
    });

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:svg-export');

    const blob = createObjectURLSpy.mock.calls[0]?.[0];
    await expect(blob?.text()).resolves.toContain('<svg');
  });
});
