import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workspace } from '../stores/workspaceStore';
import { useCanvas } from './useCanvas';

const workspaceMap: Record<string, Workspace> = {};
const storeStub = {
  workspaces: [] as Workspace[],
  activeWorkspaceId: 'workspace-1',
  getWorkspace: vi.fn((workspaceId: string) => workspaceMap[workspaceId]),
  updateWorkspaceSnapshot: vi.fn(),
  updateWorkspaceShapes: vi.fn(),
  updateWorkspaceState: vi.fn(),
};

vi.mock('../stores/workspaceStore', () => ({
  useWorkspaceStore: () => storeStub,
}));

function createWorkspace(workspaceId: string, overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: workspaceId,
    name: workspaceId,
    state: {
      tool: 'select',
      selectedShapeIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
      isDragging: false,
      isDrawing: false,
      shapeStyle: {
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
      },
      editingTextId: null,
    },
    shapes: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function createRectangleShape(id: string, x: number): Workspace['shapes'][number] {
  return {
    id,
    type: 'rectangle',
    bounds: { x, y: 20, width: 120, height: 80 },
    style: {
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
    },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('useCanvas persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    workspaceMap['workspace-1'] = createWorkspace('workspace-1');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists shapes and editor state together through one debounced store write', () => {
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      result.current.addShape(createRectangleShape('shape-1', 10));
      result.current.setEditorState((previous) => ({
        ...previous,
        tool: 'rectangle',
        selectedShapeIds: ['shape-1'],
      }));
    });

    expect(storeStub.updateWorkspaceSnapshot).not.toHaveBeenCalled();
    expect(storeStub.updateWorkspaceShapes).not.toHaveBeenCalled();
    expect(storeStub.updateWorkspaceState).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(storeStub.updateWorkspaceSnapshot).toHaveBeenCalledTimes(1);
    expect(storeStub.updateWorkspaceSnapshot).toHaveBeenCalledWith('workspace-1', {
      shapes: [expect.objectContaining({ id: 'shape-1' })],
      state: expect.objectContaining({
        tool: 'rectangle',
        selectedShapeIds: ['shape-1'],
      }),
    });
    expect(storeStub.updateWorkspaceShapes).not.toHaveBeenCalled();
    expect(storeStub.updateWorkspaceState).not.toHaveBeenCalled();
  });

  it('collapses rapid shape and state changes into the latest snapshot only', () => {
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      result.current.addShape(createRectangleShape('shape-1', 10));
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    act(() => {
      result.current.addShape(createRectangleShape('shape-2', 180));
      result.current.setEditorState((previous) => ({
        ...previous,
        tool: 'select',
        selectedShapeIds: ['shape-1', 'shape-2'],
      }));
    });

    act(() => {
      vi.advanceTimersByTime(99);
    });

    expect(storeStub.updateWorkspaceSnapshot).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(storeStub.updateWorkspaceSnapshot).toHaveBeenCalledTimes(1);
    expect(storeStub.updateWorkspaceSnapshot).toHaveBeenLastCalledWith('workspace-1', {
      shapes: [
        expect.objectContaining({ id: 'shape-1' }),
        expect.objectContaining({ id: 'shape-2' }),
      ],
      state: expect.objectContaining({
        selectedShapeIds: ['shape-1', 'shape-2'],
      }),
    });
  });
});
