import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Canvas } from './Canvas';
import type { GroupShape, Point, Shape, ShapeStyle } from '../types';

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

describe('Canvas context menu', () => {
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

  const createRectangle = (id: string, x: number): Shape => ({
    id,
    type: 'rectangle',
    bounds: { x, y: 40, width: 100, height: 100 },
    style: { ...mockShapeStyle },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const createGroup = (id: string, childrenIds: string[]): GroupShape => ({
    id,
    type: 'group',
    bounds: { x: 20, y: 20, width: 220, height: 160 },
    childrenIds,
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

  it('should show delete, group, and layer actions on right-click for a multi-selection', () => {
    const shape1 = createRectangle('shape-1', 40);
    const shape2 = createRectangle('shape-2', 180);

    const { container } = render(
      <Canvas
        {...defaultProps}
        shapes={[shape1, shape2]}
        selectedIds={[shape1.id, shape2.id]}
        canGroupSelection
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    fireEvent.contextMenu(canvas!, { clientX: 60, clientY: 80 });

    expect(screen.getByRole('menu', { name: 'Canvas actions' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /group selection/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /bring to front/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /send to back/i })).toBeInTheDocument();
  });

  it('should select the right-clicked shape before opening the menu', () => {
    const shape1 = createRectangle('shape-1', 40);
    const onSelectionChange = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        shapes={[shape1]}
        onSelectionChange={onSelectionChange}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    fireEvent.contextMenu(canvas!, { clientX: 60, clientY: 80 });

    expect(onSelectionChange).toHaveBeenCalledWith([shape1.id]);
    expect(screen.getByRole('menu', { name: 'Canvas actions' })).toBeInTheDocument();
  });

  it('should show ungroup for a selected group and trigger the action', () => {
    const group = createGroup('group-1', ['shape-1', 'shape-2']);
    const onUngroupSelected = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        shapes={[group]}
        selectedIds={[group.id]}
        canUngroupSelection
        onUngroupSelected={onUngroupSelected}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    fireEvent.contextMenu(canvas!, { clientX: 60, clientY: 80 });

    const ungroupButton = screen.getByRole('menuitem', { name: /ungroup/i });
    expect(screen.queryByRole('menuitem', { name: /group selection/i })).not.toBeInTheDocument();

    fireEvent.click(ungroupButton);

    expect(onUngroupSelected).toHaveBeenCalledTimes(1);
  });

  it('should trigger delete from the context menu', () => {
    const shape1 = createRectangle('shape-1', 40);
    const onDeleteSelected = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        shapes={[shape1]}
        selectedIds={[shape1.id]}
        onDeleteSelected={onDeleteSelected}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    fireEvent.contextMenu(canvas!, { clientX: 60, clientY: 80 });
    fireEvent.click(screen.getByRole('menuitem', { name: /delete/i }));

    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
  });
});
