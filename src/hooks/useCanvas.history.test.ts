import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Shape, ShapeStyle } from '../types';
import { useCanvas } from './useCanvas';

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
  fontSize: 16,
  fontFamily: 'sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
};

interface WorkspaceFixture {
  id: string;
  name: string;
  state: {
    tool: 'select';
    selectedShapeIds: string[];
    camera: { x: number; y: number; zoom: number };
    shapeStyle: ShapeStyle;
  };
  shapes: Shape[];
  createdAt: number;
  updatedAt: number;
}

let workspaces: Record<string, WorkspaceFixture> = {};
const saveWorkspaceSnapshot = vi.fn();

vi.mock('../stores/workspaceStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../stores/workspaceStore')>();

  return {
    ...actual,
    useWorkspaceStore: () => ({
      getWorkspace: vi.fn((id: string) => workspaces[id]),
      saveWorkspaceSnapshot,
    }),
  };
});

function createRectangle(): Shape {
  return {
    id: 'shape-1',
    type: 'rectangle',
    bounds: { x: 0, y: 0, width: 100, height: 80 },
    style: { ...baseStyle },
    createdAt: 1,
    updatedAt: 1,
  };
}

function createText(): Shape {
  return {
    id: 'text-1',
    type: 'text',
    bounds: { x: 0, y: 0, width: 160, height: 80 },
    text: 'Original',
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    style: { ...baseStyle },
    createdAt: 1,
    updatedAt: 1,
  };
}

function createWorkspace(shapes: Shape[]): WorkspaceFixture {
  return {
    id: 'workspace-1',
    name: 'Workspace 1',
    state: {
      tool: 'select',
      selectedShapeIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
      shapeStyle: { ...baseStyle },
    },
    shapes,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('useCanvas history transactions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveWorkspaceSnapshot.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records a drag as one undoable history step', () => {
    workspaces = {
      'workspace-1': createWorkspace([createRectangle()]),
    };
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      result.current.setEditorState((prev) => ({ ...prev, isDragging: true }));
    });
    act(() => {
      result.current.updateShape('shape-1', {
        bounds: { x: 24, y: 32, width: 100, height: 80 },
      });
    });
    act(() => {
      result.current.setEditorState((prev) => ({ ...prev, isDragging: false }));
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.shapes[0].bounds).toEqual({ x: 0, y: 0, width: 100, height: 80 });

    act(() => {
      result.current.redo();
    });

    expect(result.current.shapes[0].bounds).toEqual({ x: 24, y: 32, width: 100, height: 80 });
  });

  it('does not add a drag history entry when nothing changed', () => {
    workspaces = {
      'workspace-1': createWorkspace([createRectangle()]),
    };
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      result.current.setEditorState((prev) => ({ ...prev, isDragging: true }));
    });
    act(() => {
      result.current.setEditorState((prev) => ({ ...prev, isDragging: false }));
    });

    expect(result.current.canUndo).toBe(false);
  });

  it('records a committed text edit as one undoable history step', () => {
    workspaces = {
      'workspace-1': createWorkspace([createText()]),
    };
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      result.current.startTextEdit('text-1');
    });
    act(() => {
      result.current.updateShape('text-1', {
        text: 'Updated',
        bounds: { x: 0, y: 0, width: 180, height: 80 },
      } as Partial<Shape>);
    });

    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.commitTextEdit();
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    const restoredText = result.current.shapes[0];
    expect(restoredText.type).toBe('text');
    expect(restoredText.type === 'text' ? restoredText.text : '').toBe('Original');
  });
});
