import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STYLE } from '../types';
import type { EditorState, Shape } from '../types';
import { useCanvas } from './useCanvas';

interface WorkspaceFixture {
  id: string;
  name: string;
  state: EditorState;
  shapes: Shape[];
  createdAt: number;
  updatedAt: number;
}

const saveWorkspaceSnapshot = vi.fn();
let workspaces: Record<string, WorkspaceFixture> = {};

const baseEditorState: EditorState = {
  tool: 'select',
  selectedShapeIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  isDragging: false,
  isDrawing: false,
  editingTextId: null,
  shapeStyle: { ...DEFAULT_STYLE },
};

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

function createWorkspace(shapes: Shape[] = [], state: EditorState = baseEditorState): WorkspaceFixture {
  return {
    id: 'workspace-1',
    name: 'Workspace 1',
    state,
    shapes,
    createdAt: 1,
    updatedAt: 1,
  };
}

function createRectangle(id: string, x: number = 0, y: number = 0): Shape {
  return {
    id,
    type: 'rectangle',
    bounds: { x, y, width: 100, height: 80 },
    style: { ...DEFAULT_STYLE },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('useCanvas core behavior', () => {
  beforeEach(() => {
    saveWorkspaceSnapshot.mockReset();
    workspaces = {
      'workspace-1': createWorkspace(),
    };
  });

  it('deletes selected shapes as one undoable document transaction', () => {
    workspaces = {
      'workspace-1': createWorkspace([
        createRectangle('shape-1'),
        createRectangle('shape-2', 140),
      ]),
    };
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      result.current.selectShapes(['shape-1']);
    });
    act(() => {
      result.current.deleteSelectedShapes();
    });

    expect(result.current.shapes.map((shape) => shape.id)).toEqual(['shape-2']);
    expect(result.current.editorState.selectedShapeIds).toEqual([]);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.shapes.map((shape) => shape.id)).toEqual(['shape-1', 'shape-2']);
    expect(result.current.editorState.selectedShapeIds).toEqual(['shape-1']);

    act(() => {
      result.current.redo();
    });

    expect(result.current.shapes.map((shape) => shape.id)).toEqual(['shape-2']);
    expect(result.current.editorState.selectedShapeIds).toEqual([]);
  });

  it('keeps selection and camera changes out of undo history', () => {
    workspaces = {
      'workspace-1': createWorkspace([createRectangle('shape-1')]),
    };
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      result.current.selectShapes(['shape-1']);
      result.current.pan(20, -12);
      result.current.zoomIn();
      result.current.clearSelection();
    });

    expect(result.current.editorState.selectedShapeIds).toEqual([]);
    expect(result.current.editorState.camera).toEqual({ x: 20, y: -12, zoom: 1.2 });
    expect(result.current.canUndo).toBe(false);
  });

  it('zooms around the pointer while preserving the world point under it', () => {
    workspaces = {
      'workspace-1': createWorkspace([], {
        ...baseEditorState,
        camera: { x: 10, y: 20, zoom: 2 },
      }),
    };
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      result.current.zoomAt({ x: 210, y: 120 }, 1.5);
    });

    expect(result.current.editorState.camera).toEqual({
      x: -90,
      y: -30,
      zoom: 3,
    });
  });

  it('clamps zoom controls to the supported canvas range', () => {
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      for (let step = 0; step < 40; step += 1) {
        result.current.zoomOut();
      }
    });
    expect(result.current.editorState.camera.zoom).toBe(0.1);

    act(() => {
      for (let step = 0; step < 40; step += 1) {
        result.current.zoomIn();
      }
    });
    expect(result.current.editorState.camera.zoom).toBe(5);
  });

  it('updates default style without history when there is no selection', () => {
    workspaces = {
      'workspace-1': createWorkspace([createRectangle('shape-1')]),
    };
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      result.current.updateShapeStyle({ color: '#2563eb', strokeWidth: 8 });
    });

    expect(result.current.editorState.shapeStyle).toMatchObject({
      color: '#2563eb',
      strokeWidth: 8,
    });
    expect(result.current.shapes[0].style.color).toBe(DEFAULT_STYLE.color);
    expect(result.current.canUndo).toBe(false);
  });

  it('applies selected style changes as one undoable history step', () => {
    workspaces = {
      'workspace-1': createWorkspace([createRectangle('shape-1')]),
    };
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      result.current.selectShapes(['shape-1']);
      result.current.updateShapeStyle({ color: '#dc2626', strokeWidth: 6 });
    });

    expect(result.current.shapes[0].style).toMatchObject({
      color: '#dc2626',
      strokeWidth: 6,
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.shapes[0].style).toMatchObject({
      color: DEFAULT_STYLE.color,
      strokeWidth: DEFAULT_STYLE.strokeWidth,
    });
  });
});
