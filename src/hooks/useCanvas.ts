import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import type { Point, Shape, ShapeStyle, EditorState } from '../types';
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
  pan: (deltaX: number, deltaY: number) => void;
  updateShapeStyle: (updates: Partial<ShapeStyle>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  startTextEdit: (id: string) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
}

const MAX_HISTORY_SIZE = 50;

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
  },
  editingTextId: null,
};

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
        return {
          ...prev,
          shapes: prev.shapes.filter((shape) => shape.id !== id),
          editorState: {
            ...prev.editorState,
            selectedShapeIds: prev.editorState.selectedShapeIds.filter((sid) => sid !== id),
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
      return {
        ...prev,
        shapes: prev.shapes.filter(
          (shape) => !prev.editorState.selectedShapeIds.includes(shape.id)
        ),
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
    pan,
    updateShapeStyle,
    undo,
    redo,
    canUndo,
    canRedo,
    startTextEdit,
    commitTextEdit,
    cancelTextEdit,
  };
}
