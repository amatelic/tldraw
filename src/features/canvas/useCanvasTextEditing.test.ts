import { act, renderHook } from '@testing-library/react';
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Bounds, Shape, ShapeStyle } from '../../types';
import { useCanvasTextEditing } from './useCanvasTextEditing';

const baseStyle: ShapeStyle = {
  color: '#111111',
  fillColor: '#ffffff',
  fillGradient: null,
  strokeWidth: 2,
  strokeStyle: 'solid',
  fillStyle: 'none',
  opacity: 1,
  blendMode: 'source-over',
  shadows: [],
  fontSize: 18,
  fontFamily: 'Inter',
  fontWeight: 'bold',
  fontStyle: 'italic',
  textAlign: 'center',
};

function createTextShape(overrides: Partial<Extract<Shape, { type: 'text' }>> = {}): Extract<Shape, { type: 'text' }> {
  return {
    id: 'text-1',
    type: 'text',
    bounds: { x: 10, y: 20, width: 200, height: 100 },
    text: 'Original',
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    fontStyle: 'italic',
    textAlign: 'center',
    style: { ...baseStyle },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function createKeyboardEvent(
  overrides: Partial<Pick<ReactKeyboardEvent<HTMLTextAreaElement>, 'key' | 'shiftKey'>> = {}
): ReactKeyboardEvent<HTMLTextAreaElement> {
  return {
    key: overrides.key ?? 'Enter',
    shiftKey: overrides.shiftKey ?? false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as ReactKeyboardEvent<HTMLTextAreaElement>;
}

describe('useCanvasTextEditing', () => {
  const createOptions = (shape: Shape | null = createTextShape()) => ({
    editingTextId: shape?.id ?? null,
    shapes: shape ? [shape] : [],
    measurementRef: {
      current: {
        measureTextWidth: vi.fn(() => 260),
      },
    },
    onShapeDelete: vi.fn(),
    onShapeUpdate: vi.fn(),
    onTextEditCancel: vi.fn(),
    onTextEditCommit: vi.fn(),
  });

  it('returns the active text shape and typography for the current edit id', () => {
    const shape = createTextShape();
    const { result } = renderHook(() => useCanvasTextEditing(createOptions(shape)));

    expect(result.current.editingShape).toBe(shape);
    expect(result.current.editingTypography).toMatchObject({
      fontSize: 18,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fontStyle: 'italic',
      textAlign: 'center',
    });
  });

  it('updates text and measured bounds on text changes', () => {
    const shape = createTextShape({ bounds: { x: 10, y: 20, width: 120, height: 60 } });
    const options = createOptions(shape);
    const { result } = renderHook(() => useCanvasTextEditing(options));

    act(() => {
      result.current.handleTextChange({
        target: { value: 'Longer text value' },
      } as ChangeEvent<HTMLTextAreaElement>);
    });

    expect(options.onShapeUpdate).toHaveBeenCalledWith(
      'text-1',
      expect.objectContaining({
        text: 'Longer text value',
        bounds: expect.objectContaining<Partial<Bounds>>({
          x: 10,
          y: 20,
          height: 100,
        }),
      })
    );
    expect(options.onShapeUpdate.mock.calls[0]?.[1].bounds.width).toBeGreaterThan(120);
  });

  it('commits non-empty text on Enter and keeps Shift Enter for multiline editing', () => {
    const options = createOptions(createTextShape({ text: 'Ready' }));
    const { result } = renderHook(() => useCanvasTextEditing(options));
    const enterEvent = createKeyboardEvent({ key: 'Enter' });
    const shiftEnterEvent = createKeyboardEvent({ key: 'Enter', shiftKey: true });

    act(() => {
      result.current.handleTextKeyDown(shiftEnterEvent);
    });

    expect(shiftEnterEvent.preventDefault).not.toHaveBeenCalled();
    expect(options.onTextEditCommit).not.toHaveBeenCalled();

    act(() => {
      result.current.handleTextKeyDown(enterEvent);
    });

    expect(enterEvent.stopPropagation).toHaveBeenCalled();
    expect(enterEvent.preventDefault).toHaveBeenCalled();
    expect(options.onShapeDelete).not.toHaveBeenCalled();
    expect(options.onTextEditCommit).toHaveBeenCalledTimes(1);
  });

  it('deletes empty text before committing', () => {
    const options = createOptions(createTextShape({ text: '   ' }));
    const { result } = renderHook(() => useCanvasTextEditing(options));
    const enterEvent = createKeyboardEvent({ key: 'Enter' });

    act(() => {
      result.current.handleTextKeyDown(enterEvent);
    });

    expect(options.onShapeDelete).toHaveBeenCalledWith('text-1');
    expect(options.onTextEditCommit).toHaveBeenCalledTimes(1);
  });

  it('restores the original text when canceling after live edits', () => {
    const originalShape = createTextShape({ text: 'Original copy' });
    const editedShape = createTextShape({ text: 'Draft copy' });
    const options = createOptions(originalShape);
    const { result, rerender } = renderHook(
      ({ shape }) =>
        useCanvasTextEditing({
          ...options,
          shapes: [shape],
        }),
      { initialProps: { shape: originalShape } }
    );
    const escapeEvent = createKeyboardEvent({ key: 'Escape' });

    rerender({ shape: editedShape });

    act(() => {
      result.current.handleTextKeyDown(escapeEvent);
    });

    expect(escapeEvent.preventDefault).toHaveBeenCalled();
    expect(options.onShapeUpdate).toHaveBeenCalledWith('text-1', {
      text: 'Original copy',
    });
    expect(options.onTextEditCancel).toHaveBeenCalledTimes(1);
  });
});
