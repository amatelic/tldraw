import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShapeStyle } from '../types';
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
    tool: 'select' | 'rectangle';
    selectedShapeIds: string[];
    camera: { x: number; y: number; zoom: number };
    shapeStyle: ShapeStyle;
  };
  shapes: Array<{
    id: string;
    type: 'rectangle';
    bounds: { x: number; y: number; width: number; height: number };
    style: ShapeStyle;
    createdAt: number;
    updatedAt: number;
  }>;
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

function createWorkspace(id: string, shapeId?: string): WorkspaceFixture {
  return {
    id,
    name: id,
    state: {
      tool: 'select',
      selectedShapeIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
      shapeStyle: { ...baseStyle },
    },
    shapes: shapeId
      ? [
          {
            id: shapeId,
            type: 'rectangle',
            bounds: { x: 0, y: 0, width: 100, height: 80 },
            style: { ...baseStyle },
            createdAt: 1,
            updatedAt: 1,
          },
        ]
      : [],
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('useCanvas persistence coordination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveWorkspaceSnapshot.mockReset();
    workspaces = {
      'workspace-1': createWorkspace('workspace-1'),
      'workspace-2': createWorkspace('workspace-2', 'shape-2'),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists shape and durable editor changes through one debounced save cycle', () => {
    const { result } = renderHook(() => useCanvas('workspace-1'));

    act(() => {
      vi.runOnlyPendingTimers();
    });
    saveWorkspaceSnapshot.mockClear();

    act(() => {
      result.current.addShape({
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 20, y: 30, width: 140, height: 90 },
        style: { ...baseStyle },
        createdAt: 10,
        updatedAt: 10,
      });
    });

    act(() => {
      result.current.setEditorState((prev) => ({
        ...prev,
        tool: 'rectangle',
        camera: { x: 48, y: 24, zoom: 1.25 },
        isDragging: true,
      }));
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(saveWorkspaceSnapshot).toHaveBeenCalledTimes(1);
    expect(saveWorkspaceSnapshot).toHaveBeenCalledWith(
      'workspace-1',
      expect.objectContaining({
        shapes: [
          expect.objectContaining({
            id: 'shape-1',
            type: 'rectangle',
          }),
        ],
        state: expect.objectContaining({
          tool: 'rectangle',
          camera: { x: 48, y: 24, zoom: 1.25 },
        }),
      })
    );
    expect(saveWorkspaceSnapshot.mock.calls[0]?.[1].state).not.toHaveProperty('isDragging');
  });

  it('flushes the previous workspace before loading the next workspace snapshot', async () => {
    const { result, rerender } = renderHook(
      ({ currentWorkspaceId }: { currentWorkspaceId: string }) => useCanvas(currentWorkspaceId),
      {
        initialProps: { currentWorkspaceId: 'workspace-1' },
      }
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    act(() => {
      result.current.addShape({
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 12, y: 18, width: 80, height: 60 },
        style: { ...baseStyle },
        createdAt: 10,
        updatedAt: 10,
      });
    });

    expect(result.current.canUndo).toBe(true);
    saveWorkspaceSnapshot.mockClear();

    await act(async () => {
      rerender({ currentWorkspaceId: 'workspace-2' });
      await Promise.resolve();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.shapes.map((shape) => shape.id)).toEqual(['shape-2']);

    expect(saveWorkspaceSnapshot).toHaveBeenCalledTimes(1);
    expect(saveWorkspaceSnapshot).toHaveBeenCalledWith(
      'workspace-1',
      expect.objectContaining({
        shapes: [expect.objectContaining({ id: 'shape-1' })],
      })
    );

    saveWorkspaceSnapshot.mockClear();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(saveWorkspaceSnapshot).toHaveBeenCalledTimes(1);
    expect(saveWorkspaceSnapshot).toHaveBeenCalledWith(
      'workspace-2',
      expect.objectContaining({
        shapes: [expect.objectContaining({ id: 'shape-2' })],
      })
    );
    expect(
      saveWorkspaceSnapshot.mock.calls[0]?.[1].shapes.some((shape: { id: string }) => shape.id === 'shape-1')
    ).toBe(false);
  });

  it('flushes the previous workspace only once when rerendering during a switch', async () => {
    const { result, rerender } = renderHook(
      ({ currentWorkspaceId }: { currentWorkspaceId: string }) => useCanvas(currentWorkspaceId),
      {
        initialProps: { currentWorkspaceId: 'workspace-1' },
      }
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    act(() => {
      result.current.addShape({
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 24, y: 30, width: 90, height: 70 },
        style: { ...baseStyle },
        createdAt: 10,
        updatedAt: 10,
      });
    });

    saveWorkspaceSnapshot.mockClear();

    await act(async () => {
      rerender({ currentWorkspaceId: 'workspace-2' });
      rerender({ currentWorkspaceId: 'workspace-2' });
      await Promise.resolve();
    });

    expect(saveWorkspaceSnapshot).toHaveBeenCalledTimes(1);
    expect(saveWorkspaceSnapshot).toHaveBeenCalledWith(
      'workspace-1',
      expect.objectContaining({
        shapes: [expect.objectContaining({ id: 'shape-1' })],
      })
    );
  });

  it('keeps local edits when the same workspace snapshot changes without switching ids', () => {
    const { result, rerender } = renderHook(
      ({ currentWorkspaceId }: { currentWorkspaceId: string }) => useCanvas(currentWorkspaceId),
      {
        initialProps: { currentWorkspaceId: 'workspace-1' },
      }
    );

    act(() => {
      result.current.addShape({
        id: 'local-shape',
        type: 'rectangle',
        bounds: { x: 12, y: 18, width: 80, height: 60 },
        style: { ...baseStyle },
        createdAt: 10,
        updatedAt: 10,
      });
    });

    workspaces['workspace-1'] = createWorkspace('workspace-1', 'external-shape');

    act(() => {
      rerender({ currentWorkspaceId: 'workspace-1' });
    });

    expect(result.current.shapes.map((shape) => shape.id)).toEqual(['local-shape']);
  });
});
