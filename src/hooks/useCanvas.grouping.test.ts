import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvas } from './useCanvas';
import type { Shape, GroupShape } from '../types';

// Mock workspace store
vi.mock('../stores/workspaceStore', () => ({
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
        },
        editingTextId: null,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })),
    updateWorkspaceSnapshot: vi.fn(),
    updateWorkspaceShapes: vi.fn(),
    updateWorkspaceState: vi.fn(),
  }),
}));

describe('useCanvas - Grouping', () => {
  const workspaceId = 'test-workspace';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('groupShapes', () => {
    it('should create a group from selected shapes', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      // Add some shapes first
      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'circle',
        bounds: { x: 150, y: 150, width: 100, height: 100 },
        center: { x: 200, y: 200 },
        radius: 50,
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
        result.current.addShape(shape2);
      });

      // Group the shapes
      act(() => {
        result.current.groupShapes(['shape-1', 'shape-2']);
      });

      // Check that a group was created
      const group = result.current.shapes.find((s) => s.type === 'group') as GroupShape;
      expect(group).toBeDefined();
      expect(group.childrenIds).toContain('shape-1');
      expect(group.childrenIds).toContain('shape-2');

      // Check that shapes have parentId set
      const updatedShape1 = result.current.shapes.find((s) => s.id === 'shape-1');
      const updatedShape2 = result.current.shapes.find((s) => s.id === 'shape-2');
      expect(updatedShape1?.parentId).toBe(group.id);
      expect(updatedShape2?.parentId).toBe(group.id);

      // Check that group is selected
      expect(result.current.editorState.selectedShapeIds).toContain(group.id);
    });

    it('should not create a group with less than 2 shapes', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
      });

      // Try to group single shape
      act(() => {
        result.current.groupShapes(['shape-1']);
      });

      // No group should be created
      const group = result.current.shapes.find((s) => s.type === 'group');
      expect(group).toBeUndefined();
    });

    it('should calculate correct bounds for the group', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 10, y: 10, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'rectangle',
        bounds: { x: 200, y: 200, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
        result.current.addShape(shape2);
      });

      act(() => {
        result.current.groupShapes(['shape-1', 'shape-2']);
      });

      const group = result.current.shapes.find((s) => s.type === 'group') as GroupShape;
      expect(group.bounds.x).toBe(10);
      expect(group.bounds.y).toBe(10);
      expect(group.bounds.width).toBe(290); // 200 + 100 - 10
      expect(group.bounds.height).toBe(290);
    });
  });

  describe('ungroupShapes', () => {
    it('should ungroup a group and select its children', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      // Create shapes and group them
      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'rectangle',
        bounds: { x: 150, y: 150, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
        result.current.addShape(shape2);
      });

      act(() => {
        result.current.groupShapes(['shape-1', 'shape-2']);
      });

      const group = result.current.shapes.find((s) => s.type === 'group') as GroupShape;

      // Ungroup
      act(() => {
        result.current.ungroupShapes(group.id);
      });

      // Group should be removed
      expect(result.current.shapes.find((s) => s.id === group.id)).toBeUndefined();

      // Children should no longer have parentId
      const updatedShape1 = result.current.shapes.find((s) => s.id === 'shape-1');
      const updatedShape2 = result.current.shapes.find((s) => s.id === 'shape-2');
      expect(updatedShape1?.parentId).toBeUndefined();
      expect(updatedShape2?.parentId).toBeUndefined();

      // Children should be selected
      expect(result.current.editorState.selectedShapeIds).toContain('shape-1');
      expect(result.current.editorState.selectedShapeIds).toContain('shape-2');
    });

    it('should preserve parent hierarchy when ungrouping nested groups', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      // Create shapes and group them
      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'rectangle',
        bounds: { x: 150, y: 150, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape3: Shape = {
        id: 'shape-3',
        type: 'rectangle',
        bounds: { x: 300, y: 300, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
        result.current.addShape(shape2);
        result.current.addShape(shape3);
      });

      // Create inner group with shape1 and shape2
      act(() => {
        result.current.groupShapes(['shape-1', 'shape-2']);
      });

      const innerGroup = result.current.shapes.find((s) => s.type === 'group') as GroupShape;

      // Create outer group containing inner group and shape3
      act(() => {
        result.current.groupShapes([innerGroup.id, 'shape-3']);
      });

      const outerGroup = result.current.shapes.find(
        (s) => s.type === 'group' && s.id !== innerGroup.id
      ) as GroupShape;

      // Ungroup outer group
      act(() => {
        result.current.ungroupShapes(outerGroup.id);
      });

      // Inner group should now have no parent (was in outer group)
      const updatedInnerGroup = result.current.shapes.find((s) => s.id === innerGroup.id);
      expect(updatedInnerGroup?.parentId).toBeUndefined();

      // Shapes should still be in inner group
      expect(updatedInnerGroup?.type === 'group' && (updatedInnerGroup as GroupShape).childrenIds).toContain('shape-1');
      
      // shape3 should be unparented
      const updatedShape3 = result.current.shapes.find((s) => s.id === 'shape-3');
      expect(updatedShape3?.parentId).toBeUndefined();
    });
  });

  describe('deleteSelectedShapes with groups', () => {
    it('should delete group and all its descendants', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'rectangle',
        bounds: { x: 150, y: 150, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
        result.current.addShape(shape2);
      });

      act(() => {
        result.current.groupShapes(['shape-1', 'shape-2']);
      });

      const group = result.current.shapes.find((s) => s.type === 'group') as GroupShape;

      // Select and delete the group
      act(() => {
        result.current.selectShapes([group.id]);
        result.current.deleteSelectedShapes();
      });

      // Group and all children should be deleted
      expect(result.current.shapes.find((s) => s.id === group.id)).toBeUndefined();
      expect(result.current.shapes.find((s) => s.id === 'shape-1')).toBeUndefined();
      expect(result.current.shapes.find((s) => s.id === 'shape-2')).toBeUndefined();
    });
  });

  describe('getAllShapesInGroup', () => {
    it('should return all shape IDs in a group including nested', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'rectangle',
        bounds: { x: 150, y: 150, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
        result.current.addShape(shape2);
      });

      act(() => {
        result.current.groupShapes(['shape-1', 'shape-2']);
      });

      const group = result.current.shapes.find((s) => s.type === 'group') as GroupShape;

      const allShapes = result.current.getAllShapesInGroup(group.id);

      expect(allShapes).toContain(group.id);
      expect(allShapes).toContain('shape-1');
      expect(allShapes).toContain('shape-2');
    });

    it('should return empty array for non-group shape', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      const allShapes = result.current.getAllShapesInGroup('non-existent-id');

      expect(allShapes).toEqual([]);
    });
  });

  describe('layer ordering', () => {
    it('should bring selected shapes to the front', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'rectangle',
        bounds: { x: 120, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape3: Shape = {
        id: 'shape-3',
        type: 'rectangle',
        bounds: { x: 240, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
        result.current.addShape(shape2);
        result.current.addShape(shape3);
        result.current.bringShapesToFront(['shape-1']);
      });

      expect(result.current.shapes.map((shape) => shape.id)).toEqual(['shape-2', 'shape-3', 'shape-1']);
    });

    it('should send selected shapes to the back', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'rectangle',
        bounds: { x: 120, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape3: Shape = {
        id: 'shape-3',
        type: 'rectangle',
        bounds: { x: 240, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
        result.current.addShape(shape2);
        result.current.addShape(shape3);
        result.current.sendShapesToBack(['shape-3']);
      });

      expect(result.current.shapes.map((shape) => shape.id)).toEqual(['shape-3', 'shape-1', 'shape-2']);
    });

    it('should move grouped shapes and their descendants together when bringing to front', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'rectangle',
        bounds: { x: 120, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape3: Shape = {
        id: 'shape-3',
        type: 'rectangle',
        bounds: { x: 240, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
        result.current.addShape(shape2);
        result.current.addShape(shape3);
        result.current.groupShapes(['shape-1', 'shape-2']);
      });

      const group = result.current.shapes.find((shape) => shape.type === 'group') as GroupShape;

      act(() => {
        result.current.bringShapesToFront([group.id]);
      });

      expect(result.current.shapes.map((shape) => shape.id)).toEqual(['shape-3', 'shape-1', 'shape-2', group.id]);
    });
  });

  describe('selection normalization', () => {
    it('should normalize child selections to the root group id', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'rectangle',
        bounds: { x: 120, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
        result.current.addShape(shape2);
        result.current.groupShapes(['shape-1', 'shape-2']);
      });

      const group = result.current.shapes.find((shape) => shape.type === 'group') as GroupShape;

      act(() => {
        result.current.selectShapes(['shape-1']);
      });

      expect(result.current.editorState.selectedShapeIds).toEqual([group.id]);
    });

    it('should group top-level entities when child ids are provided', () => {
      const { result } = renderHook(() => useCanvas(workspaceId));

      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'rectangle',
        bounds: { x: 120, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const shape3: Shape = {
        id: 'shape-3',
        type: 'rectangle',
        bounds: { x: 240, y: 0, width: 100, height: 100 },
        style: result.current.editorState.shapeStyle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape1);
        result.current.addShape(shape2);
        result.current.addShape(shape3);
        result.current.groupShapes(['shape-1', 'shape-2']);
      });

      const innerGroup = result.current.shapes.find((shape) => shape.type === 'group') as GroupShape;

      act(() => {
        result.current.groupShapes(['shape-1', 'shape-3']);
      });

      const outerGroup = result.current.shapes.find(
        (shape) => shape.type === 'group' && shape.id !== innerGroup.id
      ) as GroupShape;

      expect(outerGroup.childrenIds).toContain(innerGroup.id);
      expect(outerGroup.childrenIds).toContain('shape-3');
      expect(result.current.editorState.selectedShapeIds).toEqual([outerGroup.id]);
    });
  });
});
