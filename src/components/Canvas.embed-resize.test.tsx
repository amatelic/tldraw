import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Canvas } from './Canvas';
import type { EmbedShape, Point, Shape, ShapeStyle } from '../types';

vi.mock('../canvas/CanvasEngine', () => ({
  CanvasEngine: class {
    clear = vi.fn();
    drawGrid = vi.fn();
    applyCamera = vi.fn();
    restoreCamera = vi.fn();
    drawShape = vi.fn();
    screenToWorld = vi.fn((point: Point) => point);
    worldToScreen = vi.fn((point: Point) => point);
    resize = vi.fn();
    ctx = {
      font: '',
      measureText: vi.fn(() => ({ width: 100 })),
    };
  },
}));

describe('Canvas embed resize', () => {
  const mockShapeStyle: ShapeStyle = {
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

  const createEmbed = (overrides: Partial<EmbedShape> = {}): EmbedShape => ({
    id: 'embed-1',
    type: 'embed',
    url: 'https://example.com',
    embedType: 'website',
    embedSrc: 'https://example.com',
    bounds: { x: 100, y: 120, width: 320, height: 220 },
    style: { ...mockShapeStyle },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  const defaultProps = {
    canvasRef: { current: null as HTMLCanvasElement | null },
    shapes: [] as Shape[],
    selectedIds: [] as string[],
    tool: 'select',
    style: mockShapeStyle,
    camera: { x: 0, y: 0, zoom: 1 },
    isDragging: false,
    isDrawing: false,
    editingTextId: null as string | null,
    onShapeAdd: vi.fn(),
    onShapeUpdate: vi.fn(),
    onShapeDelete: vi.fn(),
    onSelectionChange: vi.fn(),
    onDraggingChange: vi.fn(),
    onDrawingChange: vi.fn(),
    onPan: vi.fn(),
    onZoomAt: vi.fn(),
    screenToWorld: vi.fn((point) => point),
    worldToScreen: vi.fn((point) => point),
    onTextEditStart: vi.fn(),
    onTextEditCommit: vi.fn(),
    onTextEditCancel: vi.fn(),
    onDeleteSelected: vi.fn(),
    onGroupSelected: vi.fn(),
    onUngroupSelected: vi.fn(),
    onBringToFront: vi.fn(),
    onSendToBack: vi.fn(),
    canGroupSelection: false,
    canUngroupSelection: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all edge and corner handles for a selected embed', () => {
    const embed = createEmbed();

    render(<Canvas {...defaultProps} shapes={[embed]} selectedIds={[embed.id]} />);

    expect(screen.getByLabelText('Resize embed nw')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize embed n')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize embed ne')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize embed e')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize embed se')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize embed s')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize embed sw')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize embed w')).toBeInTheDocument();
  });

  it('updates width and height when dragging a corner resize handle', () => {
    const embed = createEmbed();
    const onShapeUpdate = vi.fn();

    render(
      <Canvas
        {...defaultProps}
        shapes={[embed]}
        selectedIds={[embed.id]}
        onShapeUpdate={onShapeUpdate}
      />
    );

    fireEvent.pointerDown(screen.getByLabelText('Resize embed se'), {
      clientX: 420,
      clientY: 340,
    });
    fireEvent.pointerMove(window, {
      clientX: 470,
      clientY: 370,
    });
    fireEvent.pointerUp(window);

    expect(onShapeUpdate).toHaveBeenCalledWith(embed.id, {
      bounds: {
        x: 100,
        y: 120,
        width: 370,
        height: 250,
      },
    });
  });

  it('updates x and width when dragging a left edge resize handle', () => {
    const embed = createEmbed();
    const onShapeUpdate = vi.fn();

    render(
      <Canvas
        {...defaultProps}
        shapes={[embed]}
        selectedIds={[embed.id]}
        onShapeUpdate={onShapeUpdate}
      />
    );

    fireEvent.pointerDown(screen.getByLabelText('Resize embed w'), {
      clientX: 100,
      clientY: 230,
    });
    fireEvent.pointerMove(window, {
      clientX: 140,
      clientY: 230,
    });
    fireEvent.pointerUp(window);

    expect(onShapeUpdate).toHaveBeenCalledWith(embed.id, {
      bounds: {
        x: 140,
        y: 120,
        width: 280,
        height: 220,
      },
    });
  });

  it('clamps embeds to the minimum size when resizing inward', () => {
    const embed = createEmbed();
    const onShapeUpdate = vi.fn();

    render(
      <Canvas
        {...defaultProps}
        shapes={[embed]}
        selectedIds={[embed.id]}
        onShapeUpdate={onShapeUpdate}
      />
    );

    fireEvent.pointerDown(screen.getByLabelText('Resize embed nw'), {
      clientX: 100,
      clientY: 120,
    });
    fireEvent.pointerMove(window, {
      clientX: 400,
      clientY: 320,
    });
    fireEvent.pointerUp(window);

    expect(onShapeUpdate).toHaveBeenCalledWith(embed.id, {
      bounds: {
        x: 260,
        y: 220,
        width: 160,
        height: 120,
      },
    });
  });
});
