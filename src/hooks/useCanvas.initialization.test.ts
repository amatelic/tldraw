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

describe('useCanvas initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    storeStub.workspaces = [];
    storeStub.activeWorkspaceId = 'workspace-1';

    Object.keys(workspaceMap).forEach((workspaceId) => {
      delete workspaceMap[workspaceId];
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes from the current workspace data without falling back to defaults', () => {
    workspaceMap['workspace-1'] = createWorkspace('workspace-1', {
      shapes: [
        {
          id: 'shape-1',
          type: 'rectangle',
          bounds: { x: 24, y: 36, width: 160, height: 90 },
          style: {
            color: '#2563eb',
            fillColor: '#dbeafe',
            fillGradient: null,
            strokeWidth: 3,
            strokeStyle: 'solid',
            fillStyle: 'solid',
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
        },
      ],
      state: {
        ...createWorkspace('workspace-1').state,
        tool: 'rectangle',
        selectedShapeIds: ['shape-1'],
        camera: { x: 80, y: 40, zoom: 1.5 },
      },
    });

    const { result } = renderHook(() => useCanvas('workspace-1'));

    expect(result.current.shapes).toHaveLength(1);
    expect(result.current.shapes[0]?.id).toBe('shape-1');
    expect(result.current.editorState.tool).toBe('rectangle');
    expect(result.current.editorState.selectedShapeIds).toEqual(['shape-1']);
    expect(result.current.editorState.camera).toEqual({ x: 80, y: 40, zoom: 1.5 });
  });

  it('resets present state when the workspace id changes', () => {
    workspaceMap['workspace-1'] = createWorkspace('workspace-1', {
      shapes: [],
    });
    workspaceMap['workspace-2'] = createWorkspace('workspace-2', {
      shapes: [
        {
          id: 'text-1',
          type: 'text',
          bounds: { x: 100, y: 120, width: 200, height: 32 },
          text: 'Workspace Two',
          fontSize: 18,
          fontFamily: 'Georgia',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textAlign: 'center',
          style: {
            color: '#111827',
            fillColor: '#ffffff',
            fillGradient: null,
            strokeWidth: 2,
            strokeStyle: 'solid',
            fillStyle: 'none',
            opacity: 1,
            blendMode: 'source-over',
            shadows: [],
            fontSize: 18,
            fontFamily: 'Georgia',
            fontWeight: 'bold',
            fontStyle: 'normal',
            textAlign: 'center',
          },
          createdAt: 2,
          updatedAt: 2,
        },
      ],
      state: {
        ...createWorkspace('workspace-2').state,
        tool: 'text',
        selectedShapeIds: ['text-1'],
      },
    });

    const { result, rerender } = renderHook(
      ({ workspaceId }: { workspaceId: string }) => useCanvas(workspaceId),
      { initialProps: { workspaceId: 'workspace-1' } }
    );

    act(() => {
      result.current.addShape({
        id: 'local-shape',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 10, height: 10 },
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
        createdAt: 3,
        updatedAt: 3,
      });
    });

    expect(result.current.shapes).toHaveLength(1);

    act(() => {
      rerender({ workspaceId: 'workspace-2' });
    });

    expect(result.current.shapes.map((shape) => shape.id)).toEqual(['text-1']);
    expect(result.current.editorState.tool).toBe('text');
    expect(result.current.editorState.selectedShapeIds).toEqual(['text-1']);
    expect(result.current.canUndo).toBe(false);
  });
});
