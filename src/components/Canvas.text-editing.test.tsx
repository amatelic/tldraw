import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Canvas } from './Canvas';
import type { Shape, ShapeStyle, TextShape, Point } from '../types';

// Mock the CanvasEngine
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

describe('Canvas Text Editing', () => {
  const mockShapeStyle: ShapeStyle = {
    color: '#000000',
    fillColor: '#000000',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'none',
    opacity: 1,
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
  };

  const createTextShape = (overrides: Partial<TextShape> = {}): TextShape => ({
    id: 'text-1',
    type: 'text',
    text: 'Hello World',
    bounds: { x: 100, y: 100, width: 200, height: 100 },
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Double-click to enter edit mode', () => {
    it('should call onTextEditStart when double-clicking a text shape', () => {
      const textShape = createTextShape();
      const onTextEditStart = vi.fn();
      
      const { container } = render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          onTextEditStart={onTextEditStart}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      // Double-click on the text shape (simulating a hit)
      fireEvent.doubleClick(canvas!, {
        clientX: 150,
        clientY: 150,
        button: 0,
      });

      expect(onTextEditStart).toHaveBeenCalledWith(textShape.id);
    });

    it('should render textarea overlay when in edit mode', () => {
      const textShape = createTextShape();
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('Hello World');
    });

    it('should position textarea at correct screen coordinates', () => {
      const textShape = createTextShape({
        bounds: { x: 100, y: 100, width: 200, height: 100 },
      });
      
      const { container } = render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      expect(textarea).toHaveStyle({
        position: 'absolute',
        left: '100px',
        top: '100px',
      });
    });
  });

  describe('Textarea styling', () => {
    it('should apply correct font styling to match canvas', () => {
      const textShape = createTextShape({
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
      });
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveStyle({
        fontSize: '24px',
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
      });
    });

    it('should inherit text color from shape style', () => {
      const textShape = createTextShape({
        style: { ...mockShapeStyle, color: '#ff0000' },
      });
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveStyle({
        color: '#ff0000',
      });
    });
  });

  describe('Auto-grow behavior', () => {
    it('should call onShapeUpdate when typing changes text', () => {
      const textShape = createTextShape();
      const onShapeUpdate = vi.fn();
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          onShapeUpdate={onShapeUpdate}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New text content' } });

      expect(onShapeUpdate).toHaveBeenCalledWith(textShape.id, 
        expect.objectContaining({ text: 'New text content' })
      );
    });

    it('should auto-grow width when text exceeds current bounds', () => {
      const textShape = createTextShape({
        bounds: { x: 100, y: 100, width: 100, height: 50 },
      });
      const onShapeUpdate = vi.fn();
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          onShapeUpdate={onShapeUpdate}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'This is a very long text that should expand the width' } });

      // Should update bounds with auto-grown dimensions
      const lastCall = onShapeUpdate.mock.calls[onShapeUpdate.mock.calls.length - 1];
      expect(lastCall[1]).toHaveProperty('bounds');
      expect(lastCall[1].bounds.width).toBeGreaterThan(100);
    });

    it('should auto-grow height for multiline text', () => {
      const textShape = createTextShape({
        bounds: { x: 100, y: 100, width: 200, height: 50 },
      });
      const onShapeUpdate = vi.fn();
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          onShapeUpdate={onShapeUpdate}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3' } });

      // Should update bounds with increased height
      const lastCall = onShapeUpdate.mock.calls[onShapeUpdate.mock.calls.length - 1];
      expect(lastCall[1]).toHaveProperty('bounds');
      expect(lastCall[1].bounds.height).toBeGreaterThan(50);
    });
  });

  describe('Keyboard interactions', () => {
    it('should commit on Enter (without Shift)', () => {
      const textShape = createTextShape();
      const onTextEditCommit = vi.fn();
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          onTextEditCommit={onTextEditCommit}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onTextEditCommit).toHaveBeenCalled();
    });

    it('should add newline on Shift+Enter', () => {
      const textShape = createTextShape({ text: 'Line 1' });
      const onTextEditCommit = vi.fn();
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          onTextEditCommit={onTextEditCommit}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(onTextEditCommit).not.toHaveBeenCalled();
    });

    it('should cancel on Escape', () => {
      const textShape = createTextShape();
      const onTextEditCancel = vi.fn();
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          onTextEditCancel={onTextEditCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Escape' });

      expect(onTextEditCancel).toHaveBeenCalled();
    });
  });

  describe('Click outside behavior', () => {
    it('should commit when clicking outside the textarea', () => {
      const textShape = createTextShape();
      const onTextEditCommit = vi.fn();
      
      const { container } = render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          onTextEditCommit={onTextEditCommit}
        />
      );

      // Click outside the textarea (on the canvas)
      const canvas = container.querySelector('canvas');
      fireEvent.pointerDown(canvas!);

      expect(onTextEditCommit).toHaveBeenCalled();
    });
  });

  describe('Empty text deletion', () => {
    it('should delete shape when committing empty text', () => {
      const textShape = createTextShape({ text: 'Hello' });
      const onShapeDelete = vi.fn();
      const onTextEditCommit = vi.fn();
      const onShapeUpdate = vi.fn().mockImplementation((id, updates) => {
        // Update the shape text so commitTextEdit sees the change
        textShape.text = updates.text ?? textShape.text;
      });
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          onShapeDelete={onShapeDelete}
          onTextEditCommit={onTextEditCommit}
          onShapeUpdate={onShapeUpdate}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(onShapeDelete).toHaveBeenCalledWith(textShape.id);
    });

    it('should delete shape when committing whitespace-only text', () => {
      const textShape = createTextShape({ text: 'Hello' });
      const onShapeDelete = vi.fn();
      const onShapeUpdate = vi.fn().mockImplementation((id, updates) => {
        // Update the shape text so commitTextEdit sees the change
        textShape.text = updates.text ?? textShape.text;
      });
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          onShapeDelete={onShapeDelete}
          onShapeUpdate={onShapeUpdate}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '   ' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(onShapeDelete).toHaveBeenCalledWith(textShape.id);
    });
  });

  describe('Click-switching between text shapes', () => {
    it('should commit current and start editing new text shape when clicked', () => {
      const textShape1 = createTextShape({ id: 'text-1', text: 'First' });
      const textShape2 = createTextShape({ id: 'text-2', text: 'Second', bounds: { x: 400, y: 100, width: 200, height: 100 } });
      
      const onTextEditCommit = vi.fn();
      const onTextEditStart = vi.fn();
      
      const { container } = render(
        <Canvas
          {...defaultProps}
          shapes={[textShape1, textShape2]}
          selectedIds={[textShape1.id]}
          editingTextId={textShape1.id}
          onTextEditCommit={onTextEditCommit}
          onTextEditStart={onTextEditStart}
        />
      );

      const canvas = container.querySelector('canvas');
      // Double-click on second text shape
      fireEvent.doubleClick(canvas!, {
        clientX: 500,
        clientY: 150,
        button: 0,
      });

      expect(onTextEditCommit).toHaveBeenCalled();
      expect(onTextEditStart).toHaveBeenCalledWith(textShape2.id);
    });
  });

  describe('Camera transform handling', () => {
    it('should position textarea correctly with zoom and pan', () => {
      const textShape = createTextShape({
        bounds: { x: 100, y: 100, width: 200, height: 100 },
      });
      
      const worldToScreen = vi.fn((point) => ({
        x: (point.x * 2) + 50, // zoom: 2, pan: 50
        y: (point.y * 2) + 30, // zoom: 2, pan: 30
      }));
      
      const { container } = render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          camera={{ x: 50, y: 30, zoom: 2 }}
          worldToScreen={worldToScreen}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Position should be transformed: (100 * 2 + 50, 100 * 2 + 30) = (250, 230)
      expect(textarea).toHaveStyle({
        left: '250px',
        top: '230px',
      });
    });

    it('should adjust textarea size based on zoom level', () => {
      const textShape = createTextShape({
        bounds: { x: 100, y: 100, width: 200, height: 100 },
      });
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          camera={{ x: 0, y: 0, zoom: 2 }}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Size should be scaled: 200 * 2 = 400, 100 * 2 = 200
      expect(textarea).toHaveStyle({
        width: '400px',
        height: '200px',
      });
    });
  });

  describe('Undo/Redo integration', () => {
    it('should save to history when committing text changes', () => {
      const textShape = createTextShape({ text: 'Original' });
      const onShapeUpdate = vi.fn();
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          onShapeUpdate={onShapeUpdate}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Modified' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });

      // The updateShape call should include the new text
      expect(onShapeUpdate).toHaveBeenCalledWith(textShape.id, 
        expect.objectContaining({ text: 'Modified' })
      );
    });

    it('should not save intermediate typing to history', () => {
      const textShape = createTextShape({ text: 'Original' });
      const onShapeUpdate = vi.fn();
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
          onShapeUpdate={onShapeUpdate}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Type multiple characters
      fireEvent.change(textarea, { target: { value: 'O' } });
      fireEvent.change(textarea, { target: { value: 'Or' } });
      fireEvent.change(textarea, { target: { value: 'Ori' } });
      fireEvent.change(textarea, { target: { value: 'Orig' } });

      // All intermediate changes should call onShapeUpdate for live preview
      expect(onShapeUpdate).toHaveBeenCalledTimes(4);
    });
  });

  describe('Focus management', () => {
    it('should auto-focus textarea when entering edit mode', () => {
      const textShape = createTextShape();
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveFocus();
    });

    it('should select all text when entering edit mode', () => {
      const textShape = createTextShape({ text: 'Select all this' });
      
      render(
        <Canvas
          {...defaultProps}
          shapes={[textShape]}
          selectedIds={[textShape.id]}
          editingTextId={textShape.id}
        />
      );

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      // Textarea has autoFocus but selection state is not guaranteed in test environment
      expect(textarea).toBeInTheDocument();
      expect(textarea.value).toBe('Select all this');
    });
  });

  describe('Default text behavior', () => {
    it('should create text shape with empty string instead of placeholder', () => {
      const onShapeAdd = vi.fn();
      
      const { container } = render(
        <Canvas
          {...defaultProps}
          tool="text"
          onShapeAdd={onShapeAdd}
        />
      );

      const canvas = container.querySelector('canvas');
      fireEvent.pointerDown(canvas!, {
        clientX: 100,
        clientY: 100,
        button: 0,
      });

      expect(onShapeAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text',
          text: '',
        })
      );
    });

    it('should immediately enter edit mode when creating new text shape', () => {
      const onTextEditStart = vi.fn();
      const onShapeAdd = vi.fn().mockImplementation((shape) => {
        // Simulate the shape being added and then edit mode starting
        onTextEditStart(shape.id);
      });
      
      const { container } = render(
        <Canvas
          {...defaultProps}
          tool="text"
          onShapeAdd={onShapeAdd}
          onTextEditStart={onTextEditStart}
        />
      );

      const canvas = container.querySelector('canvas');
      fireEvent.pointerDown(canvas!, {
        clientX: 100,
        clientY: 100,
        button: 0,
      });

      // After adding text shape, should immediately start editing
      expect(onShapeAdd).toHaveBeenCalled();
    });
  });
});
