import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import type { Point, Shape, ShapeStyle, EditorState, GroupShape } from '../types';
import { DEFAULT_STYLE, createShapeId, generateBounds, getGroupDescendants, getRootGroup } from '../types';
import { validateGenerationProposalForCanvas } from '../agents/agentOrchestrator';
import type {
  AgentCreateConnectorAction,
  AgentCreateShapeAction,
  AgentGenerationProposal,
} from '../types/agents';
import { CanvasEngine } from '../canvas/CanvasEngine';
import { useWorkspaceStore } from '../stores/workspaceStore';

interface HistoryState {
  shapes: Shape[];
  editorState: EditorState;
}

interface UseCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  shapes: Shape[];
  editorState: EditorState;
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  deleteSelectedShapes: () => void;
  selectShapes: (ids: string[]) => void;
  clearSelection: () => void;
  screenToWorld: (point: Point) => Point;
  worldToScreen: (point: Point) => Point;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  zoomAt: (screenPoint: Point, factor: number) => void;
  pan: (deltaX: number, deltaY: number) => void;
  updateShapeStyle: (updates: Partial<ShapeStyle>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  startTextEdit: (id: string) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
  applyGeneratedDiagram: (proposal: AgentGenerationProposal) => {
    success: boolean;
    error: string | null;
    appliedShapeIds: string[];
  };
  // Grouping actions
  groupShapes: (shapeIds: string[]) => void;
  ungroupShapes: (groupId: string) => void;
  getAllShapesInGroup: (groupId: string) => string[];
  bringShapesToFront: (shapeIds: string[]) => void;
  sendShapesToBack: (shapeIds: string[]) => void;
}

const MAX_HISTORY_SIZE = 50;

function normalizeShapeIdsForLayering(shapeIds: string[], shapes: Shape[]): string[] {
  const normalizedIds: string[] = [];
  const seenIds = new Set<string>();

  for (const shapeId of shapeIds) {
    const rootGroup = getRootGroup(shapeId, shapes);
    const normalizedId = rootGroup?.id ?? shapeId;

    if (!seenIds.has(normalizedId)) {
      seenIds.add(normalizedId);
      normalizedIds.push(normalizedId);
    }
  }

  return normalizedIds;
}

function expandShapeIdsForLayering(shapeIds: string[], shapes: Shape[]): Set<string> {
  const expandedIds = new Set<string>();

  for (const shapeId of shapeIds) {
    expandedIds.add(shapeId);

    const shape = shapes.find((candidate) => candidate.id === shapeId);
    if (shape?.type === 'group') {
      const descendants = getGroupDescendants(shapeId, shapes);
      descendants.forEach((descendant) => expandedIds.add(descendant.id));
    }
  }

  return expandedIds;
}

function reorderShapesByLayer(shapeIds: string[], shapes: Shape[], destination: 'front' | 'back'): Shape[] {
  const normalizedIds = normalizeShapeIdsForLayering(shapeIds, shapes);
  if (normalizedIds.length === 0) return shapes;

  const idsToMove = expandShapeIdsForLayering(normalizedIds, shapes);
  const movedShapes = shapes.filter((shape) => idsToMove.has(shape.id));
  const stationaryShapes = shapes.filter((shape) => !idsToMove.has(shape.id));

  if (movedShapes.length === 0 || stationaryShapes.length === 0) {
    return shapes;
  }

  return destination === 'front'
    ? stationaryShapes.concat(movedShapes)
    : movedShapes.concat(stationaryShapes);
}

const defaultEditorState: EditorState = {
  tool: 'select',
  selectedShapeIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  isDragging: false,
  isDrawing: false,
  shapeStyle: {
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
    blendMode: 'source-over',
    shadows: [],
  },
  editingTextId: null,
};

function mergeGeneratedStyle(baseStyle: ShapeStyle, overrides?: Partial<ShapeStyle>): ShapeStyle {
  return {
    ...DEFAULT_STYLE,
    ...baseStyle,
    ...overrides,
  };
}

function createGeneratedCanvasShape(
  action: AgentCreateShapeAction,
  baseStyle: ShapeStyle,
  timestamp: number
): Shape {
  const style = mergeGeneratedStyle(baseStyle, action.shape.style);

  if (action.shape.type === 'text') {
    return {
      id: action.shape.id,
      type: 'text',
      bounds: { ...action.shape.bounds },
      text: action.shape.text ?? '',
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      textAlign: style.textAlign,
      style,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  if (action.shape.type === 'circle') {
    const { x, y, width, height } = action.shape.bounds;

    return {
      id: action.shape.id,
      type: 'circle',
      bounds: { ...action.shape.bounds },
      center: {
        x: x + width / 2,
        y: y + height / 2,
      },
      radius: Math.min(width, height) / 2,
      style,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  return {
    id: action.shape.id,
    type: 'rectangle',
    bounds: { ...action.shape.bounds },
    style,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createGeneratedCanvasConnector(
  action: AgentCreateConnectorAction,
  baseStyle: ShapeStyle,
  timestamp: number
): Shape {
  const style = mergeGeneratedStyle(baseStyle, action.connector.style);

  return {
    id: action.connector.id,
    type: action.connector.type,
    bounds: generateBounds(action.connector.start, action.connector.end),
    start: { ...action.connector.start },
    end: { ...action.connector.end },
    style,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createGeneratedNodeLabel(
  nodeShapeId: string,
  label: string,
  bounds: Shape['bounds'],
  baseStyle: ShapeStyle,
  timestamp: number,
  existingIds: Set<string>
): Shape {
  const labelBaseId = `${nodeShapeId}-label`;
  let labelId = labelBaseId;
  let suffix = 1;

  while (existingIds.has(labelId)) {
    labelId = `${labelBaseId}-${suffix}`;
    suffix += 1;
  }

  existingIds.add(labelId);

  const style = mergeGeneratedStyle(baseStyle, {
    color: baseStyle.color,
    fillStyle: 'none',
    textAlign: 'center',
  });

  const insetX = Math.min(12, Math.max(bounds.width * 0.12, 6));
  const insetY = Math.min(12, Math.max(bounds.height * 0.12, 6));

  return {
    id: labelId,
    type: 'text',
    bounds: {
      x: bounds.x + insetX,
      y: bounds.y + insetY,
      width: Math.max(bounds.width - insetX * 2, 40),
      height: Math.max(bounds.height - insetY * 2, style.fontSize * 1.4),
    },
    text: label,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textAlign: style.textAlign,
    style,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function useCanvas(workspaceId: string): UseCanvasReturn {
  const workspaceStore = useWorkspaceStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const previousWorkspaceIdRef = useRef(workspaceId);
  const isFirstRenderRef = useRef(true);
  const currentShapeRef = useRef<Shape | null>(null);

  // Get current workspace data
  const workspace = workspaceStore.getWorkspace(workspaceId);

  // Compute initial state only when workspaceId changes
  const initialData = useMemo(
    () => ({
      shapes: workspace?.shapes || [],
      editorState: workspace?.state || defaultEditorState,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceId]
  );

  // History management
  const [past, setPast] = useState<HistoryState[]>([]);
  const [present, setPresent] = useState<HistoryState>(initialData);
  const [future, setFuture] = useState<HistoryState[]>([]);

  const shapes = present.shapes;
  const editorState = present.editorState;

  // Handle workspace switching
  useEffect(() => {
    // Skip on first render since initialData is already set
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      previousWorkspaceIdRef.current = workspaceId;
      return;
    }

    // Only reset if workspaceId actually changed
    if (workspaceId !== previousWorkspaceIdRef.current) {
      const newWorkspace = workspaceStore.getWorkspace(workspaceId);
      const newShapes = newWorkspace?.shapes || [];
      const newState = newWorkspace?.state || defaultEditorState;

      // Use requestAnimationFrame to defer state updates to next frame
      requestAnimationFrame(() => {
        setPast([]);
        setPresent({ shapes: newShapes, editorState: newState });
        setFuture([]);
        previousWorkspaceIdRef.current = workspaceId;
      });
    }
  }, [workspaceId, workspaceStore]);

  // Auto-save to workspace store
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      workspaceStore.updateWorkspaceShapes(workspaceId, shapes);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [shapes, workspaceId, workspaceStore]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      workspaceStore.updateWorkspaceState(workspaceId, editorState);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [editorState, workspaceId, workspaceStore]);

  // Helper to save current state to history
  const saveToHistory = useCallback(
    (currentShapes: Shape[], currentEditorState: EditorState, clearFuture: boolean = true) => {
      setPast((prev) => {
        const newPast = [...prev, { shapes: currentShapes, editorState: currentEditorState }];
        // Limit history size
        if (newPast.length > MAX_HISTORY_SIZE) {
          return newPast.slice(newPast.length - MAX_HISTORY_SIZE);
        }
        return newPast;
      });

      if (clearFuture) {
        setFuture([]);
      }
    },
    []
  );

  // Render canvas when shapes or editor state changes
  const render = useCallback(() => {
    if (!engineRef.current) return;

    const engine = engineRef.current;
    engine.clear();
    engine.drawGrid(editorState.camera);
    engine.applyCamera(editorState.camera);

    shapes.forEach((shape) => {
      const isSelected = editorState.selectedShapeIds.includes(shape.id);
      engine.drawShape(shape, isSelected);
    });

    // Draw preview shape while drawing
    if (currentShapeRef.current) {
      engine.drawShape(currentShapeRef.current, false);
    }

    engine.restoreCamera();
  }, [shapes, editorState.camera, editorState.selectedShapeIds]);

  // Initialize engine
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new CanvasEngine(canvasRef.current);
      render();
    }

    const handleResize = () => {
      engineRef.current?.resize();
      render();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  useEffect(() => {
    render();
  }, [shapes, editorState.camera, editorState.selectedShapeIds, render]);

  const screenToWorld = useCallback(
    (point: Point): Point => {
      if (!engineRef.current) return point;
      return engineRef.current.screenToWorld(point, editorState.camera);
    },
    [editorState.camera]
  );

  const worldToScreen = useCallback(
    (point: Point): Point => {
      if (!engineRef.current) return point;
      return engineRef.current.worldToScreen(point, editorState.camera);
    },
    [editorState.camera]
  );

  const addShape = useCallback(
    (shape: Shape) => {
      setPresent((prev) => {
        saveToHistory(prev.shapes, prev.editorState);
        return {
          ...prev,
          shapes: [...prev.shapes, shape],
        };
      });
    },
    [saveToHistory]
  );

  const updateShape = useCallback(
    (id: string, updates: Partial<Shape>) => {
      setPresent((prev) => {
        // Only save to history if the update is significant (not just dragging)
        const isSignificantUpdate = !updates.bounds || (updates.bounds && !editorState.isDragging);

        if (isSignificantUpdate) {
          saveToHistory(prev.shapes, prev.editorState);
        }

        return {
          ...prev,
          shapes: prev.shapes.map((shape) => {
            if (shape.id !== id) return shape;
            const updated = { ...shape, ...updates, updatedAt: Date.now() } as Shape;
            return updated;
          }),
        };
      });
    },
    [saveToHistory, editorState.isDragging]
  );

  const deleteShape = useCallback(
    (id: string) => {
      setPresent((prev) => {
        saveToHistory(prev.shapes, prev.editorState);
        
        // Get all shapes to delete (including descendants if it's a group)
        const idsToDelete = new Set<string>([id]);
        const shapeToDelete = prev.shapes.find((s) => s.id === id);
        
        if (shapeToDelete?.type === 'group') {
          // Add all descendants
          const descendants = getGroupDescendants(id, prev.shapes);
          descendants.forEach((d) => idsToDelete.add(d.id));
        }
        
        return {
          ...prev,
          shapes: prev.shapes.filter((shape) => !idsToDelete.has(shape.id)),
          editorState: {
            ...prev.editorState,
            selectedShapeIds: prev.editorState.selectedShapeIds.filter((sid) => !idsToDelete.has(sid)),
          },
        };
      });
    },
    [saveToHistory]
  );

  const deleteSelectedShapes = useCallback(() => {
    if (editorState.selectedShapeIds.length === 0) return;

    setPresent((prev) => {
      saveToHistory(prev.shapes, prev.editorState);
      
      // Collect all IDs to delete (including group descendants)
      const idsToDelete = new Set<string>();
      
      for (const selectedId of prev.editorState.selectedShapeIds) {
        idsToDelete.add(selectedId);
        const shape = prev.shapes.find((s) => s.id === selectedId);
        if (shape?.type === 'group') {
          const descendants = getGroupDescendants(selectedId, prev.shapes);
          descendants.forEach((d) => idsToDelete.add(d.id));
        }
      }
      
      return {
        ...prev,
        shapes: prev.shapes.filter((shape) => !idsToDelete.has(shape.id)),
        editorState: {
          ...prev.editorState,
          selectedShapeIds: [],
        },
      };
    });
  }, [saveToHistory, editorState.selectedShapeIds]);

  const selectShapes = useCallback((ids: string[]) => {
    setPresent((prev) => ({
      ...prev,
      editorState: {
        ...prev.editorState,
        selectedShapeIds: ids,
      },
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setPresent((prev) => ({
      ...prev,
      editorState: {
        ...prev.editorState,
        selectedShapeIds: [],
      },
    }));
  }, []);

  const zoomIn = useCallback(() => {
    setPresent((prev) => ({
      ...prev,
      editorState: {
        ...prev.editorState,
        camera: {
          ...prev.editorState.camera,
          zoom: Math.min(prev.editorState.camera.zoom * 1.2, 5),
        },
      },
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setPresent((prev) => ({
      ...prev,
      editorState: {
        ...prev.editorState,
        camera: {
          ...prev.editorState.camera,
          zoom: Math.max(prev.editorState.camera.zoom / 1.2, 0.1),
        },
      },
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setPresent((prev) => ({
      ...prev,
      editorState: {
        ...prev.editorState,
        camera: { x: 0, y: 0, zoom: 1 },
      },
    }));
  }, []);

  const zoomAt = useCallback((screenPoint: Point, factor: number) => {
    setPresent((prev) => {
      const currentCamera = prev.editorState.camera;
      const worldPos = {
        x: (screenPoint.x - currentCamera.x) / currentCamera.zoom,
        y: (screenPoint.y - currentCamera.y) / currentCamera.zoom,
      };
      const newZoom = Math.min(Math.max(currentCamera.zoom * factor, 0.1), 5);
      const newCameraX = screenPoint.x - worldPos.x * newZoom;
      const newCameraY = screenPoint.y - worldPos.y * newZoom;

      return {
        ...prev,
        editorState: {
          ...prev.editorState,
          camera: {
            x: newCameraX,
            y: newCameraY,
            zoom: newZoom,
          },
        },
      };
    });
  }, []);

  const pan = useCallback((deltaX: number, deltaY: number) => {
    setPresent((prev) => ({
      ...prev,
      editorState: {
        ...prev.editorState,
        camera: {
          ...prev.editorState.camera,
          x: prev.editorState.camera.x + deltaX,
          y: prev.editorState.camera.y + deltaY,
        },
      },
    }));
  }, []);

  const updateShapeStyle = useCallback(
    (updates: Partial<ShapeStyle>) => {
      setPresent((prev) => {
        const newShapeStyle = { ...prev.editorState.shapeStyle, ...updates };
        const hasSelection = prev.editorState.selectedShapeIds.length > 0;

        // If shapes are selected, apply the style immediately to them
        if (hasSelection) {
          saveToHistory(prev.shapes, prev.editorState);
          return {
            ...prev,
            shapes: prev.shapes.map((shape) =>
              prev.editorState.selectedShapeIds.includes(shape.id)
                ? {
                    ...shape,
                    style: { ...shape.style, ...updates },
                    updatedAt: Date.now(),
                  }
                : shape
            ),
            editorState: {
              ...prev.editorState,
              shapeStyle: newShapeStyle,
            },
          };
        }

        // Otherwise just update the default style for new shapes
        return {
          ...prev,
          editorState: {
            ...prev.editorState,
            shapeStyle: newShapeStyle,
          },
        };
      });
    },
    [saveToHistory]
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture((prev) => [present, ...prev]);
    setPresent(previous);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast((prev) => [...prev, present]);
    setFuture(newFuture);
    setPresent(next);
  }, [future, present]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // Text editing methods
  const startTextEdit = useCallback((id: string) => {
    setPresent((prev) => ({
      ...prev,
      editorState: {
        ...prev.editorState,
        editingTextId: id,
        selectedShapeIds: [id],
      },
    }));
  }, []);

  const commitTextEdit = useCallback(() => {
    setPresent((prev) => {
      // Save to history when committing text edit
      saveToHistory(prev.shapes, prev.editorState);
      return {
        ...prev,
        editorState: {
          ...prev.editorState,
          editingTextId: null,
        },
      };
    });
  }, [saveToHistory]);

  const cancelTextEdit = useCallback(() => {
    setPresent((prev) => ({
      ...prev,
      editorState: {
        ...prev.editorState,
        editingTextId: null,
      },
    }));
  }, []);

  const applyGeneratedDiagram = useCallback(
    (proposal: AgentGenerationProposal) => {
      if (proposal.actions.length === 0) {
        return {
          success: false,
          error: 'This draft does not include any shapes or connectors to apply.',
          appliedShapeIds: [],
        };
      }

      const validation = validateGenerationProposalForCanvas(
        proposal,
        shapes.map((shape) => shape.id)
      );

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error ?? 'The generated diagram is invalid.',
          appliedShapeIds: [],
        };
      }

      const timestamp = Date.now();
      const reservedIds = new Set(shapes.map((shape) => shape.id));
      const nextShapes = proposal.actions.flatMap((action) => {
        if (action.type === 'create-connector') {
          const connector = createGeneratedCanvasConnector(action, editorState.shapeStyle, timestamp);
          reservedIds.add(connector.id);
          return [connector];
        }

        const nodeShape = createGeneratedCanvasShape(action, editorState.shapeStyle, timestamp);
        reservedIds.add(nodeShape.id);

        if (action.shape.type === 'text' || !action.shape.text?.trim()) {
          return [nodeShape];
        }

        const labelShape = createGeneratedNodeLabel(
          action.shape.id,
          action.shape.text,
          action.shape.bounds,
          mergeGeneratedStyle(editorState.shapeStyle, action.shape.style),
          timestamp,
          reservedIds
        );

        return [nodeShape, labelShape];
      });
      const appliedShapeIds = nextShapes.map((shape) => shape.id);

      setPresent((prev) => {
        saveToHistory(prev.shapes, prev.editorState);

        return {
          shapes: [...prev.shapes, ...nextShapes],
          editorState: {
            ...prev.editorState,
            selectedShapeIds: appliedShapeIds,
          },
        };
      });

      return {
        success: true,
        error: null,
        appliedShapeIds,
      };
    },
    [editorState.shapeStyle, saveToHistory, shapes]
  );

  // GROUPING METHODS

  /**
   * Group selected shapes into a new group
   */
  const groupShapes = useCallback((shapeIds: string[]) => {
    if (shapeIds.length < 2) return; // Need at least 2 shapes to group

    setPresent((prev) => {
      saveToHistory(prev.shapes, prev.editorState);

      // Find common parent (if all shapes have same parent)
      const shapesToGroup = prev.shapes.filter((s) => shapeIds.includes(s.id));
      if (shapesToGroup.length < 2) return prev;

      const parentIds = new Set(shapesToGroup.map((s) => s.parentId));
      const commonParentId = parentIds.size === 1 ? Array.from(parentIds)[0] : undefined;

      // Calculate bounds for the group
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const shape of shapesToGroup) {
        const bounds = shape.bounds;
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }

      // Create the group
      const groupId = createShapeId();
      const group: GroupShape = {
        id: groupId,
        type: 'group',
        bounds: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        },
        childrenIds: shapeIds,
        style: { ...prev.editorState.shapeStyle },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        parentId: commonParentId,
      };

      // Update shapes to set their parentId
      return {
        ...prev,
        shapes: prev.shapes.map((shape) => {
          if (shapeIds.includes(shape.id)) {
            return { ...shape, parentId: groupId };
          }
          return shape;
        }).concat(group),
        editorState: {
          ...prev.editorState,
          selectedShapeIds: [groupId],
        },
      };
    });
  }, [saveToHistory]);

  /**
   * Ungroup a group - removes the group and makes children independent
   */
  const ungroupShapes = useCallback((groupId: string) => {
    setPresent((prev) => {
      const group = prev.shapes.find((s) => s.id === groupId);
      if (!group || group.type !== 'group') return prev;

      saveToHistory(prev.shapes, prev.editorState);

      const groupShape = group as GroupShape;
      const childrenIds = groupShape.childrenIds;
      const grandParentId = groupShape.parentId;

      // Remove parentId from children and set to grandparent (if exists)
      return {
        ...prev,
        shapes: prev.shapes
          .filter((s) => s.id !== groupId) // Remove the group
          .map((shape) => {
            if (childrenIds.includes(shape.id)) {
              return { ...shape, parentId: grandParentId };
            }
            return shape;
          }),
        editorState: {
          ...prev.editorState,
          selectedShapeIds: childrenIds,
        },
      };
    });
  }, [saveToHistory]);

  /**
   * Get all shape IDs within a group (including descendants)
   */
  const getAllShapesInGroup = useCallback((groupId: string): string[] => {
    const group = shapes.find((s) => s.id === groupId);
    if (!group || group.type !== 'group') return [];

    const descendants = getGroupDescendants(groupId, shapes);
    return [groupId, ...descendants.map((d) => d.id)];
  }, [shapes]);

  const bringShapesToFront = useCallback(
    (shapeIds: string[]) => {
      if (shapeIds.length === 0) return;

      setPresent((prev) => {
        const reorderedShapes = reorderShapesByLayer(shapeIds, prev.shapes, 'front');
        if (reorderedShapes === prev.shapes) return prev;

        saveToHistory(prev.shapes, prev.editorState);
        return {
          ...prev,
          shapes: reorderedShapes,
        };
      });
    },
    [saveToHistory]
  );

  const sendShapesToBack = useCallback(
    (shapeIds: string[]) => {
      if (shapeIds.length === 0) return;

      setPresent((prev) => {
        const reorderedShapes = reorderShapesByLayer(shapeIds, prev.shapes, 'back');
        if (reorderedShapes === prev.shapes) return prev;

        saveToHistory(prev.shapes, prev.editorState);
        return {
          ...prev,
          shapes: reorderedShapes,
        };
      });
    },
    [saveToHistory]
  );

  return {
    canvasRef,
    shapes,
    editorState,
    setEditorState: (action: React.SetStateAction<EditorState>) => {
      setPresent((prev) => ({
        ...prev,
        editorState: typeof action === 'function' ? action(prev.editorState) : action,
      }));
    },
    addShape,
    updateShape,
    deleteShape,
    deleteSelectedShapes,
    selectShapes,
    clearSelection,
    screenToWorld,
    worldToScreen,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomAt,
    pan,
    updateShapeStyle,
    undo,
    redo,
    canUndo,
    canRedo,
    startTextEdit,
    commitTextEdit,
    cancelTextEdit,
    applyGeneratedDiagram,
    // Grouping
    groupShapes,
    ungroupShapes,
    getAllShapesInGroup,
    bringShapesToFront,
    sendShapesToBack,
  };
}
