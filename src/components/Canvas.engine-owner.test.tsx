import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Canvas } from './Canvas';
import type { Shape, ShapeStyle } from '../types';

const canvasEngineConstructor = vi.fn();
const engineInstances: Array<{
  createShapeFromPoints: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
}> = [];

vi.mock('../hooks/useElementSize', () => ({
  useElementSize: vi.fn(() => ({ width: 800, height: 600 })),
}));

vi.mock('../canvas/CanvasEngine', () => ({
  screenToWorldPoint: (point: { x: number; y: number }, camera: { x: number; y: number; zoom: number }) => ({
    x: (point.x - camera.x) / camera.zoom,
    y: (point.y - camera.y) / camera.zoom,
  }),
  worldToScreenPoint: (point: { x: number; y: number }, camera: { x: number; y: number; zoom: number }) => ({
    x: point.x * camera.zoom + camera.x,
    y: point.y * camera.zoom + camera.y,
  }),
  CanvasEngine: class {
    clear = vi.fn();
    drawGrid = vi.fn();
    applyCamera = vi.fn();
    restoreCamera = vi.fn();
    drawShape = vi.fn();
    screenToWorld = vi.fn((point: { x: number; y: number }, camera: { x: number; y: number; zoom: number }) => ({
      x: (point.x - camera.x) / camera.zoom,
      y: (point.y - camera.y) / camera.zoom,
    }));
    worldToScreen = vi.fn((point: { x: number; y: number }, camera: { x: number; y: number; zoom: number }) => ({
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

    constructor(canvas: HTMLCanvasElement) {
      canvasEngineConstructor(canvas);
      engineInstances.push(this);
    }
  },
}));

describe('Canvas engine ownership', () => {
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

  const defaultProps = {
    canvasRef: { current: null as HTMLCanvasElement | null },
    shapes: [],
    selectedIds: [],
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

  it('creates a single engine instance for one mounted canvas surface', () => {
    const { rerender } = render(<Canvas {...defaultProps} />);

    rerender(
      <Canvas
        {...defaultProps}
        camera={{ x: 40, y: 20, zoom: 2 }}
        isDragging={true}
      />
    );

    expect(canvasEngineConstructor).toHaveBeenCalledTimes(1);
  });

  it('does not resize the engine again when the canvas size is unchanged', () => {
    const { rerender } = render(<Canvas {...defaultProps} />);

    expect(engineInstances).toHaveLength(1);
    expect(engineInstances[0].resize).toHaveBeenCalledTimes(1);

    rerender(
      <Canvas
        {...defaultProps}
        camera={{ x: 40, y: 20, zoom: 2 }}
        selectedIds={['shape-1']}
      />
    );

    expect(engineInstances[0].resize).toHaveBeenCalledTimes(1);
  });

  it('redraws the mounted canvas when only the camera changes', () => {
    const { rerender } = render(<Canvas {...defaultProps} />);

    expect(engineInstances).toHaveLength(1);
    const engine = engineInstances[0] as (typeof engineInstances)[number] & {
      drawGrid: ReturnType<typeof vi.fn>;
      applyCamera: ReturnType<typeof vi.fn>;
      clear: ReturnType<typeof vi.fn>;
    };
    vi.clearAllMocks();

    const camera = { x: 80, y: -24, zoom: 1.5 };
    rerender(<Canvas {...defaultProps} camera={camera} />);

    expect(engine.clear).toHaveBeenCalled();
    expect(engine.drawGrid).toHaveBeenCalledWith(camera);
    expect(engine.applyCamera).toHaveBeenCalledWith(camera);
  });

  it('notifies the shell after a drawing tool creates a meaningful shape', () => {
    const onShapeAdd = vi.fn();
    const onDrawingChange = vi.fn();
    const onCreationComplete = vi.fn();
    const createdShape: Shape = {
      id: 'created-rectangle',
      type: 'rectangle',
      bounds: { x: 10, y: 10, width: 40, height: 30 },
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
    expect(canvas).toBeInTheDocument();

    fireEvent.pointerDown(canvas!, { clientX: 10, clientY: 10, button: 0 });
    engineInstances[0].createShapeFromPoints.mockReturnValue(createdShape);

    rerender(
      <Canvas
        {...defaultProps}
        tool="rectangle"
        isDrawing={true}
        onShapeAdd={onShapeAdd}
        onDrawingChange={onDrawingChange}
        onCreationComplete={onCreationComplete}
      />
    );

    fireEvent.pointerMove(canvas!, { clientX: 50, clientY: 40, button: 0 });
    fireEvent.pointerUp(canvas!, { clientX: 50, clientY: 40, button: 0 });

    expect(onShapeAdd).toHaveBeenCalledWith(createdShape);
    expect(onCreationComplete).toHaveBeenCalledTimes(1);
  });
});
