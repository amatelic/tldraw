import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Canvas } from './Canvas';
import type { Point, Shape, ShapeStyle } from '../types';

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

describe('Canvas selection interactions', () => {
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

  const createRectangle = (id: string, x: number, y: number = 40): Shape => ({
    id,
    type: 'rectangle',
    bounds: { x, y, width: 100, height: 100 },
    style: { ...mockShapeStyle },
    createdAt: Date.now(),
    updatedAt: Date.now(),
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

  it('adds a shape to the current selection with shift-click', () => {
    const shape1 = createRectangle('shape-1', 40);
    const shape2 = createRectangle('shape-2', 180);
    const onSelectionChange = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        shapes={[shape1, shape2]}
        selectedIds={[shape1.id]}
        onSelectionChange={onSelectionChange}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    fireEvent.pointerDown(canvas!, { clientX: 210, clientY: 80, button: 0, shiftKey: true });

    expect(onSelectionChange).toHaveBeenCalledWith([shape1.id, shape2.id]);
  });

  it('removes a selected shape from the current selection with shift-click', () => {
    const shape1 = createRectangle('shape-1', 40);
    const shape2 = createRectangle('shape-2', 180);
    const onSelectionChange = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        shapes={[shape1, shape2]}
        selectedIds={[shape1.id, shape2.id]}
        onSelectionChange={onSelectionChange}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    fireEvent.pointerDown(canvas!, { clientX: 210, clientY: 80, button: 0, shiftKey: true });

    expect(onSelectionChange).toHaveBeenCalledWith([shape1.id]);
  });

  it('shows a combined frame for multi-selection', () => {
    const shape1 = createRectangle('shape-1', 40);
    const shape2 = createRectangle('shape-2', 180);

    render(
      <Canvas
        {...defaultProps}
        shapes={[shape1, shape2]}
        selectedIds={[shape1.id, shape2.id]}
      />
    );

    expect(screen.getByTestId('multi-selection-frame')).toBeInTheDocument();
  });

  it('creates a marquee selection from empty canvas drag', () => {
    const shape1 = createRectangle('shape-1', 40);
    const shape2 = createRectangle('shape-2', 180);
    const onSelectionChange = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        shapes={[shape1, shape2]}
        onSelectionChange={onSelectionChange}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    fireEvent.pointerDown(canvas!, { clientX: 10, clientY: 10, button: 0 });
    fireEvent.pointerMove(canvas!, { clientX: 300, clientY: 180, button: 0 });

    expect(screen.getByTestId('marquee-selection')).toBeInTheDocument();

    fireEvent.pointerUp(canvas!, { clientX: 300, clientY: 180, button: 0 });

    expect(onSelectionChange).toHaveBeenLastCalledWith([shape1.id, shape2.id]);
  });

  it('uses shift-drag for additive marquee selection instead of panning', () => {
    const shape1 = createRectangle('shape-1', 40);
    const shape2 = createRectangle('shape-2', 180);
    const onSelectionChange = vi.fn();
    const onPan = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        shapes={[shape1, shape2]}
        selectedIds={[shape1.id]}
        onSelectionChange={onSelectionChange}
        onPan={onPan}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    fireEvent.pointerDown(canvas!, { clientX: 150, clientY: 10, button: 0, shiftKey: true });
    fireEvent.pointerMove(canvas!, { clientX: 300, clientY: 180, button: 0, shiftKey: true });
    fireEvent.pointerUp(canvas!, { clientX: 300, clientY: 180, button: 0, shiftKey: true });

    expect(onPan).not.toHaveBeenCalled();
    expect(onSelectionChange).toHaveBeenLastCalledWith([shape1.id, shape2.id]);
  });

  it('drags the full multi-selection when a selected shape is dragged', () => {
    const shape1 = createRectangle('shape-1', 40);
    const shape2 = createRectangle('shape-2', 180);
    const onShapeUpdate = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        shapes={[shape1, shape2]}
        selectedIds={[shape1.id, shape2.id]}
        isDragging={true}
        onShapeUpdate={onShapeUpdate}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    fireEvent.pointerDown(canvas!, { clientX: 60, clientY: 80, button: 0 });
    fireEvent.pointerMove(canvas!, { clientX: 90, clientY: 110, button: 0 });

    expect(onShapeUpdate).toHaveBeenCalledWith(shape1.id, {
      bounds: {
        ...shape1.bounds,
        x: 70,
        y: 70,
      },
    });
    expect(onShapeUpdate).toHaveBeenCalledWith(shape2.id, {
      bounds: {
        ...shape2.bounds,
        x: 210,
        y: 70,
      },
    });
  });
});
