import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Shape } from '../types';
import { useCanvas } from './useCanvas';

vi.mock('../stores/workspaceStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../stores/workspaceStore')>();

  return {
    ...actual,
    useWorkspaceStore: () => ({
      workspaces: [],
      activeWorkspaceId: 'test-workspace',
      getWorkspace: vi.fn(() => ({
        id: 'test-workspace',
        name: 'Test',
        shapes: [],
        state: {
          tool: 'select',
          selectedShapeIds: [],
          camera: { x: 0, y: 0, zoom: 1 },
          isDragging: false,
          isDrawing: false,
          shapeStyle: {
            color: '#000000',
            fillColor: '#ffffff',
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
          },
          editingTextId: null,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })),
      saveWorkspaceSnapshot: vi.fn(),
    }),
  };
});

const workspaceId = 'test-workspace';

function createRectangle(id: string, x: number, y: number): Shape {
  return {
    id,
    type: 'rectangle',
    bounds: { x, y, width: 100, height: 60 },
    style: {
      color: '#000000',
      fillColor: '#ffffff',
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
    },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('useCanvas - layout commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('undos alignShapes in a single history step', () => {
    const { result } = renderHook(() => useCanvas(workspaceId));

    act(() => {
      result.current.addShape(createRectangle('shape-1', 40, 20));
      result.current.addShape(createRectangle('shape-2', 180, 80));
      result.current.addShape(createRectangle('shape-3', 320, 140));
    });

    act(() => {
      result.current.alignShapes(['shape-1', 'shape-2', 'shape-3'], 'left');
    });

    expect(result.current.shapes.map((shape) => shape.bounds.x)).toEqual([40, 40, 40]);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.shapes.map((shape) => shape.bounds.x)).toEqual([40, 180, 320]);
    expect(result.current.canRedo).toBe(true);
  });
});
