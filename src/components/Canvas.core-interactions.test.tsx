import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Canvas } from './Canvas';
import type { CameraState, Point, Shape, ShapeStyle } from '../types';

const engineInstances: Array<{
  createShapeFromPoints: ReturnType<typeof vi.fn>;
}> = [];

vi.mock('../hooks/useElementSize', () => ({
  useElementSize: vi.fn(() => ({ width: 800, height: 600 })),
}));

vi.mock('../canvas/CanvasEngine', () => ({
  screenToWorldPoint: (point: Point, camera: CameraState) => ({
    x: (point.x - camera.x) / camera.zoom,
    y: (point.y - camera.y) / camera.zoom,
  }),
  worldToScreenPoint: (point: Point, camera: CameraState) => ({
    x: point.x * camera.zoom + camera.x,
    y: point.y * camera.zoom + camera.y,
  }),
  CanvasEngine: class {
    clear = vi.fn();
    drawGrid = vi.fn();
    applyCamera = vi.fn();
    restoreCamera = vi.fn();
    drawShape = vi.fn();
    screenToWorld = vi.fn((point: Point, camera: CameraState) => ({
      x: (point.x - camera.x) / camera.zoom,
      y: (point.y - camera.y) / camera.zoom,
    }));
    worldToScreen = vi.fn((point: Point, camera: CameraState) => ({
      x: point.x * camera.zoom + camera.x,
      y: point.y * camera.zoom + camera.y,
    }));
    resize = vi.fn();
    createShapeFromPoints = vi.fn();
    measureTextWidth = vi.fn(() => 100);
    ctx = {
      font: '',
      measureText: vi.fn(() => ({ width: 100 })),
    };

    constructor() {
      engineInstances.push(this);
    }
  },
}));

describe('Canvas core interactions', () => {
  const mockShapeStyle: ShapeStyle = {
    color: '#111111',
    fillColor: '#ffffff',
    fillGradient: null,
    strokeWidth: 3,
    strokeStyle: 'dashed',
    fillStyle: 'solid',
    opacity: 0.8,
    blendMode: 'source-over',
    shadows: [],
    fontSize: 18,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fontStyle: 'italic',
    textAlign: 'center',
  };

  const createRectangle = (id: string, x: number = 40, y: number = 40): Shape => ({
    id,
    type: 'rectangle',
    bounds: { x, y, width: 100, height: 80 },
    style: { ...mockShapeStyle },
    createdAt: 1,
    updatedAt: 1,
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
    onTextEditStart: vi.fn(),
    onTextEditCommit: vi.fn(),
    onTextEditCancel: vi.fn(),
    onCreationComplete: vi.fn(),
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
    engineInstances.length = 0;
  });

  it('creates an empty text shape with the current style and starts editing it', () => {
    const onShapeAdd = vi.fn();
    const onSelectionChange = vi.fn();
    const onTextEditStart = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        tool="text"
        onShapeAdd={onShapeAdd}
        onSelectionChange={onSelectionChange}
        onTextEditStart={onTextEditStart}
      />
    );
    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas!, { clientX: 120, clientY: 160, button: 0 });

    const createdShape = onShapeAdd.mock.calls[0]?.[0] as Shape;
    expect(createdShape).toMatchObject({
      type: 'text',
      bounds: { x: 120, y: 160, width: 200, height: 100 },
      text: '',
      fontSize: mockShapeStyle.fontSize,
      fontFamily: mockShapeStyle.fontFamily,
      fontWeight: mockShapeStyle.fontWeight,
      fontStyle: mockShapeStyle.fontStyle,
      textAlign: mockShapeStyle.textAlign,
      style: mockShapeStyle,
    });
    expect(onSelectionChange).toHaveBeenCalledWith([createdShape.id]);
    expect(onTextEditStart).toHaveBeenCalledWith(createdShape.id);
  });

  it('creates text shapes at the transformed world point', () => {
    const onShapeAdd = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        tool="text"
        camera={{ x: 20, y: 40, zoom: 2 }}
        onShapeAdd={onShapeAdd}
      />
    );
    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas!, { clientX: 220, clientY: 340, button: 0 });

    expect(onShapeAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text',
        bounds: { x: 100, y: 150, width: 200, height: 100 },
      })
    );
  });

  it('does not commit tiny drawing previews as shapes', () => {
    const onShapeAdd = vi.fn();
    const onDrawingChange = vi.fn();
    const onCreationComplete = vi.fn();
    const tinyShape: Shape = {
      id: 'tiny-rectangle',
      type: 'rectangle',
      bounds: { x: 10, y: 10, width: 4, height: 3 },
      style: { ...mockShapeStyle },
      createdAt: 1,
      updatedAt: 1,
    };

    const { container, rerender } = render(
      <Canvas
        {...defaultProps}
        tool="rectangle"
        onShapeAdd={onShapeAdd}
        onDrawingChange={onDrawingChange}
        onCreationComplete={onCreationComplete}
      />
    );
    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas!, { clientX: 10, clientY: 10, button: 0 });
    engineInstances[0].createShapeFromPoints.mockReturnValue(tinyShape);

    rerender(
      <Canvas
        {...defaultProps}
        tool="rectangle"
        isDrawing
        onShapeAdd={onShapeAdd}
        onDrawingChange={onDrawingChange}
        onCreationComplete={onCreationComplete}
      />
    );

    fireEvent.pointerMove(canvas!, { clientX: 14, clientY: 13, button: 0 });
    fireEvent.pointerUp(canvas!, { clientX: 14, clientY: 13, button: 0 });

    expect(onDrawingChange).toHaveBeenLastCalledWith(false);
    expect(onShapeAdd).not.toHaveBeenCalled();
    expect(onCreationComplete).not.toHaveBeenCalled();
  });

  it('commits pencil strokes after collecting more than one point', () => {
    const onShapeAdd = vi.fn();
    const onCreationComplete = vi.fn();

    const { container, rerender } = render(
      <Canvas
        {...defaultProps}
        tool="pencil"
        onShapeAdd={onShapeAdd}
        onCreationComplete={onCreationComplete}
      />
    );
    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas!, { clientX: 20, clientY: 30, button: 0 });

    rerender(
      <Canvas
        {...defaultProps}
        tool="pencil"
        isDrawing
        onShapeAdd={onShapeAdd}
        onCreationComplete={onCreationComplete}
      />
    );

    fireEvent.pointerMove(canvas!, { clientX: 40, clientY: 60, button: 0 });
    fireEvent.pointerMove(canvas!, { clientX: 55, clientY: 45, button: 0 });
    fireEvent.pointerUp(canvas!, { clientX: 55, clientY: 45, button: 0 });

    const pencilShape = onShapeAdd.mock.calls[0]?.[0] as Shape;
    expect(pencilShape).toMatchObject({
      type: 'pencil',
      points: [
        { x: 20, y: 30 },
        { x: 40, y: 60 },
        { x: 55, y: 45 },
      ],
      bounds: { x: 20, y: 30, width: 35, height: 30 },
    });
    expect(onCreationComplete).toHaveBeenCalledTimes(1);
  });

  it('does not commit single-point pencil strokes', () => {
    const onShapeAdd = vi.fn();
    const onCreationComplete = vi.fn();

    const { container, rerender } = render(
      <Canvas
        {...defaultProps}
        tool="pencil"
        onShapeAdd={onShapeAdd}
        onCreationComplete={onCreationComplete}
      />
    );
    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas!, { clientX: 20, clientY: 30, button: 0 });

    rerender(
      <Canvas
        {...defaultProps}
        tool="pencil"
        isDrawing
        onShapeAdd={onShapeAdd}
        onCreationComplete={onCreationComplete}
      />
    );

    fireEvent.pointerUp(canvas!, { clientX: 20, clientY: 30, button: 0 });

    expect(onShapeAdd).not.toHaveBeenCalled();
    expect(onCreationComplete).not.toHaveBeenCalled();
  });

  it('deletes the topmost shape under the eraser pointer', () => {
    const bottomShape = createRectangle('bottom-shape');
    const topShape = createRectangle('top-shape');
    const onShapeDelete = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        tool="eraser"
        shapes={[bottomShape, topShape]}
        onShapeDelete={onShapeDelete}
      />
    );
    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas!, { clientX: 80, clientY: 80, button: 0 });

    expect(onShapeDelete).toHaveBeenCalledWith('top-shape');
  });

  it('uses Space plus drag to pan while the select tool is active', () => {
    const onPan = vi.fn();
    const onSelectionChange = vi.fn();

    const { container } = render(
      <Canvas
        {...defaultProps}
        shapes={[createRectangle('shape-1')]}
        onPan={onPan}
        onSelectionChange={onSelectionChange}
      />
    );
    const canvas = container.querySelector('canvas');

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    fireEvent.pointerDown(canvas!, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas!, { clientX: 125, clientY: 90, button: 0 });
    fireEvent.pointerUp(canvas!, { clientX: 125, clientY: 90, button: 0 });
    fireEvent.keyUp(window, { key: ' ', code: 'Space' });

    expect(onPan).toHaveBeenCalledWith(25, -10);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
