import { act, fireEvent, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STYLE, type GroupShape, type Shape } from '../types';
import { getGroupChildIds } from '../types/selection';
import { useCanvas } from './useCanvas';
import { useKeyboard } from './useKeyboard';

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
          shapeStyle: { ...DEFAULT_STYLE },
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

type CanvasHook = ReturnType<typeof useCanvas>;
interface CanvasResult {
  current: CanvasHook;
}

function createRectangle(
  id: string,
  bounds: Partial<Shape['bounds']> = {},
  parentId?: string
): Shape {
  return {
    id,
    type: 'rectangle',
    bounds: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      ...bounds,
    },
    style: { ...DEFAULT_STYLE },
    createdAt: 1,
    updatedAt: 1,
    parentId,
  };
}

function createCircle(id: string, bounds: Partial<Shape['bounds']> = {}): Shape {
  const nextBounds = {
    x: 150,
    y: 150,
    width: 100,
    height: 100,
    ...bounds,
  };

  return {
    id,
    type: 'circle',
    bounds: nextBounds,
    center: {
      x: nextBounds.x + nextBounds.width / 2,
      y: nextBounds.y + nextBounds.height / 2,
    },
    radius: Math.min(nextBounds.width, nextBounds.height) / 2,
    style: { ...DEFAULT_STYLE },
    createdAt: 1,
    updatedAt: 1,
  };
}

function addShapes(result: CanvasResult, shapes: Shape[]): void {
  act(() => {
    shapes.forEach((shape) => result.current.addShape(shape));
  });
}

function selectShapes(result: CanvasResult, shapeIds: string[]): void {
  act(() => {
    result.current.selectShapes(shapeIds);
  });
}

function getGroups(canvas: CanvasHook): GroupShape[] {
  return canvas.shapes.filter((shape): shape is GroupShape => shape.type === 'group');
}

function getShapeById(canvas: CanvasHook, shapeId: string): Shape | undefined {
  return canvas.shapes.find((shape) => shape.id === shapeId);
}

function groupShapes(result: CanvasResult, shapeIds: string[]): GroupShape {
  const previousGroupIds = new Set(getGroups(result.current).map((group) => group.id));

  act(() => {
    result.current.groupShapes(shapeIds);
  });

  const group = getGroups(result.current).find((candidate) => !previousGroupIds.has(candidate.id));
  expect(group).toBeDefined();
  return group as GroupShape;
}

function ungroupShape(result: CanvasResult, groupId: string): void {
  act(() => {
    result.current.ungroupShapes(groupId);
  });
}

function pressGroupShortcut(shiftKey: boolean = false): void {
  act(() => {
    fireEvent.keyDown(window, { key: 'g', ctrlKey: true, shiftKey });
  });
}

function expectGroupChildren(canvas: CanvasHook, groupId: string, childIds: string[]): void {
  expect(getGroupChildIds(groupId, canvas.shapes)).toEqual(childIds);
}

function expectShapeParent(
  canvas: CanvasHook,
  shapeId: string,
  parentId: string | undefined
): void {
  expect(getShapeById(canvas, shapeId)?.parentId).toBe(parentId);
}

function renderCanvasWithKeyboard(): ReturnType<typeof renderHook<CanvasHook, unknown>> {
  return renderHook(() => {
    const canvas = useCanvas(workspaceId);

    useKeyboard({
      undo: canvas.undo,
      redo: canvas.redo,
      deleteSelected: canvas.deleteSelectedShapes,
      clearSelection: canvas.clearSelection,
      setTool: (tool) => canvas.setEditorState((prev) => ({ ...prev, tool })),
      groupSelected: () => canvas.groupShapes(canvas.editorState.selectedShapeIds),
      ungroupSelected: () => {
        const [selectedId] = canvas.editorState.selectedShapeIds;
        if (selectedId) {
          canvas.ungroupShapes(selectedId);
        }
      },
    });

    return canvas;
  });
}

describe('useCanvas - Grouping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('groupShapes', () => {
    it('should create a group from selected shapes', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [
        createRectangle('shape-1'),
        createCircle('shape-2'),
      ]);

      const group = groupShapes(result, ['shape-1', 'shape-2']);

      expectGroupChildren(result.current, group.id, ['shape-1', 'shape-2']);
      expectShapeParent(result.current, 'shape-1', group.id);
      expectShapeParent(result.current, 'shape-2', group.id);
      expect(result.current.editorState.selectedShapeIds).toEqual([group.id]);
    });

    it('should group and ungroup selected shapes through keyboard shortcuts', () => {
      const { result, unmount } = renderCanvasWithKeyboard();

      addShapes(result, [
        createRectangle('shape-1'),
        createRectangle('shape-2', { x: 150, y: 150 }),
      ]);
      selectShapes(result, ['shape-1', 'shape-2']);

      pressGroupShortcut();

      const group = getGroups(result.current)[0];
      expect(group).toBeDefined();
      expectGroupChildren(result.current, group.id, ['shape-1', 'shape-2']);
      expectShapeParent(result.current, 'shape-1', group.id);
      expectShapeParent(result.current, 'shape-2', group.id);
      expect(result.current.editorState.selectedShapeIds).toEqual([group.id]);

      pressGroupShortcut(true);

      expect(getShapeById(result.current, group.id)).toBeUndefined();
      expectShapeParent(result.current, 'shape-1', undefined);
      expectShapeParent(result.current, 'shape-2', undefined);
      expect(result.current.editorState.selectedShapeIds).toEqual(['shape-1', 'shape-2']);

      unmount();
    });

    it('should not create a group with less than 2 shapes', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [createRectangle('shape-1')]);

      act(() => {
        result.current.groupShapes(['shape-1']);
      });

      expect(getGroups(result.current)).toEqual([]);
    });

    it('should calculate correct bounds for the group', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [
        createRectangle('shape-1', { x: 10, y: 10 }),
        createRectangle('shape-2', { x: 200, y: 200 }),
      ]);

      const group = groupShapes(result, ['shape-1', 'shape-2']);

      expect(group.bounds).toEqual({ x: 10, y: 10, width: 290, height: 290 });
    });
  });

  describe('ungroupShapes', () => {
    it('should ungroup a group and select its children', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [
        createRectangle('shape-1'),
        createRectangle('shape-2', { x: 150, y: 150 }),
      ]);

      const group = groupShapes(result, ['shape-1', 'shape-2']);

      ungroupShape(result, group.id);

      expect(getShapeById(result.current, group.id)).toBeUndefined();
      expectShapeParent(result.current, 'shape-1', undefined);
      expectShapeParent(result.current, 'shape-2', undefined);
      expect(result.current.editorState.selectedShapeIds).toEqual(['shape-1', 'shape-2']);
    });

    it('should preserve parent hierarchy when ungrouping nested groups', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [
        createRectangle('shape-1'),
        createRectangle('shape-2', { x: 150, y: 150 }),
        createRectangle('shape-3', { x: 300, y: 300 }),
      ]);

      const innerGroup = groupShapes(result, ['shape-1', 'shape-2']);
      const outerGroup = groupShapes(result, [innerGroup.id, 'shape-3']);

      ungroupShape(result, outerGroup.id);

      expectShapeParent(result.current, innerGroup.id, undefined);
      expectGroupChildren(result.current, innerGroup.id, ['shape-1', 'shape-2']);
      expectShapeParent(result.current, 'shape-3', undefined);
    });
  });

  describe('deleteSelectedShapes with groups', () => {
    it('should delete group and all its descendants', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [
        createRectangle('shape-1'),
        createRectangle('shape-2', { x: 150, y: 150 }),
      ]);
      const group = groupShapes(result, ['shape-1', 'shape-2']);

      act(() => {
        result.current.selectShapes([group.id]);
        result.current.deleteSelectedShapes();
      });

      expect(getShapeById(result.current, group.id)).toBeUndefined();
      expect(getShapeById(result.current, 'shape-1')).toBeUndefined();
      expect(getShapeById(result.current, 'shape-2')).toBeUndefined();
    });
  });

  describe('getAllShapesInGroup', () => {
    it('should return all shape IDs in a group including nested', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [
        createRectangle('shape-1'),
        createRectangle('shape-2', { x: 150, y: 150 }),
      ]);
      const group = groupShapes(result, ['shape-1', 'shape-2']);

      expect(result.current.getAllShapesInGroup(group.id)).toEqual([
        group.id,
        'shape-1',
        'shape-2',
      ]);
    });

    it('should return empty array for non-group shape', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      expect(result.current.getAllShapesInGroup('non-existent-id')).toEqual([]);
    });
  });

  describe('layer ordering', () => {
    it('should bring selected shapes to the front', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [
        createRectangle('shape-1'),
        createRectangle('shape-2', { x: 120 }),
        createRectangle('shape-3', { x: 240 }),
      ]);

      act(() => {
        result.current.bringShapesToFront(['shape-1']);
      });

      expect(result.current.shapes.map((shape) => shape.id)).toEqual([
        'shape-2',
        'shape-3',
        'shape-1',
      ]);
    });

    it('should send selected shapes to the back', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [
        createRectangle('shape-1'),
        createRectangle('shape-2', { x: 120 }),
        createRectangle('shape-3', { x: 240 }),
      ]);

      act(() => {
        result.current.sendShapesToBack(['shape-3']);
      });

      expect(result.current.shapes.map((shape) => shape.id)).toEqual([
        'shape-3',
        'shape-1',
        'shape-2',
      ]);
    });

    it('should move grouped shapes and their descendants together when bringing to front', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [
        createRectangle('shape-1'),
        createRectangle('shape-2', { x: 120 }),
        createRectangle('shape-3', { x: 240 }),
      ]);
      const group = groupShapes(result, ['shape-1', 'shape-2']);

      act(() => {
        result.current.bringShapesToFront([group.id]);
      });

      expect(result.current.shapes.map((shape) => shape.id)).toEqual([
        'shape-3',
        'shape-1',
        'shape-2',
        group.id,
      ]);
    });
  });

  describe('selection normalization', () => {
    it('should normalize child selections to the root group id', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [
        createRectangle('shape-1'),
        createRectangle('shape-2', { x: 120 }),
      ]);
      const group = groupShapes(result, ['shape-1', 'shape-2']);

      selectShapes(result, ['shape-1']);

      expect(result.current.editorState.selectedShapeIds).toEqual([group.id]);
    });

    it('should group top-level entities when child ids are provided', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      addShapes(result, [
        createRectangle('shape-1'),
        createRectangle('shape-2', { x: 120 }),
        createRectangle('shape-3', { x: 240 }),
      ]);

      const innerGroup = groupShapes(result, ['shape-1', 'shape-2']);
      const outerGroup = groupShapes(result, ['shape-1', 'shape-3']);

      expect(getGroupChildIds(outerGroup.id, result.current.shapes)).toEqual(
        expect.arrayContaining([innerGroup.id, 'shape-3'])
      );
      expect(getGroupChildIds(outerGroup.id, result.current.shapes)).toHaveLength(2);
      expect(result.current.editorState.selectedShapeIds).toEqual([outerGroup.id]);
    });
  });
});
