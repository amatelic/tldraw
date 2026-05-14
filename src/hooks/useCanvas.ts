import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import type { Point, Shape, ShapeStyle, EditorState, PersistedEditorState } from '../types';
import type { AgentGenerationProposal, AgentMutationProposal } from '../types/agents';
import {
  addShapeToDocument,
  alignShapesInDocument,
  bringShapesToFrontInDocument,
  deleteSelectedShapesFromDocument,
  deleteShapeFromDocument,
  distributeShapesInDocument,
  groupShapesInDocument,
  sendShapesToBackInDocument,
  tidyShapesInDocument,
  ungroupShapesInDocument,
  updateSelectedShapeStyleInDocument,
  updateShapeBoundsInDocument,
  updateShapeInDocument,
} from '../document/commands';
import {
  applyGenerationProposalToDocumentState,
  applyMutationProposalToDocumentState,
} from '../agents/documentApplication';
import { normalizeDocumentShapes } from '../document/textStyle';
import type { DistributionDirection, LayoutAlignment } from '../document/commands';
import {
  normalizePersistedWorkspaceState,
  stripRuntimeStateFromShapes,
  useWorkspaceStore,
} from '../stores/workspaceStore';
import { getGroupDescendants, normalizeShapeIdsForSelection } from '../types/selection';

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
  updateShapeBounds: (id: string, updates: Partial<Shape['bounds']>) => void;
  deleteShape: (id: string) => void;
  deleteSelectedShapes: () => void;
  selectShapes: (ids: string[]) => void;
  clearSelection: () => void;
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
  applyMutationProposal: (proposal: AgentMutationProposal) => {
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
  alignShapes: (shapeIds: string[], alignment: LayoutAlignment) => void;
  distributeShapes: (shapeIds: string[], direction: DistributionDirection) => void;
  tidyShapes: (shapeIds: string[]) => void;
}

const MAX_HISTORY_SIZE = 50;
const SAVE_DEBOUNCE_MS = 100;

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

function normalizeEditorState(
  editorState?: Partial<PersistedEditorState> | Partial<EditorState>
): EditorState {
  const persistedState = normalizePersistedWorkspaceState(
    editorState
  );
  return {
    ...defaultEditorState,
    ...persistedState,
    isDragging: false,
    isDrawing: false,
    editingTextId: null,
  };
}

export function useCanvas(workspaceId: string): UseCanvasReturn {
  const workspaceStore = useWorkspaceStore();
  const getWorkspace = workspaceStore.getWorkspace;
  const saveWorkspaceSnapshot = workspaceStore.saveWorkspaceSnapshot;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Get current workspace data
  const workspace = workspaceStore.getWorkspace(workspaceId);
  const workspaceShapes = workspace?.shapes;
  const workspaceState = workspace?.state;

  // Compute the state used by the initial history snapshot.
  const initialData = useMemo(
    () => ({
      shapes: stripRuntimeStateFromShapes(normalizeDocumentShapes(workspaceShapes || [])),
      editorState: normalizeEditorState(workspaceState),
    }),
    [workspaceShapes, workspaceState]
  );

  // History management
  const [past, setPast] = useState<HistoryState[]>([]);
  const [present, setPresent] = useState<HistoryState>(initialData);
  const [future, setFuture] = useState<HistoryState[]>([]);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState(workspaceId);
  const dragStartStateRef = useRef<HistoryState | null>(null);
  const textEditStartStateRef = useRef<HistoryState | null>(null);

  const shapes = present.shapes;
  const editorState = present.editorState;
  const persistedEditorState = useMemo(
    () =>
      normalizePersistedWorkspaceState({
        tool: editorState.tool,
        selectedShapeIds: editorState.selectedShapeIds,
        camera: editorState.camera,
        shapeStyle: editorState.shapeStyle,
      }),
    [editorState.tool, editorState.selectedShapeIds, editorState.camera, editorState.shapeStyle]
  );
  const latestPersistedSnapshotRef = useRef({ shapes, state: persistedEditorState });

  useEffect(() => {
    latestPersistedSnapshotRef.current = { shapes, state: persistedEditorState };
  }, [persistedEditorState, shapes]);

  // Handle workspace switching
  useEffect(() => {
    if (workspaceId === loadedWorkspaceId) {
      return;
    }

    saveWorkspaceSnapshot(loadedWorkspaceId, latestPersistedSnapshotRef.current);

    const newWorkspace = getWorkspace(workspaceId);
    const newShapes = stripRuntimeStateFromShapes(normalizeDocumentShapes(newWorkspace?.shapes || []));
    const newState = normalizeEditorState(newWorkspace?.state);
    let didCancel = false;

    queueMicrotask(() => {
      if (didCancel) {
        return;
      }

      setPast([]);
      setPresent({ shapes: newShapes, editorState: newState });
      setFuture([]);
      setLoadedWorkspaceId(workspaceId);
      dragStartStateRef.current = null;
      textEditStartStateRef.current = null;
    });

    return () => {
      didCancel = true;
    };
  }, [getWorkspace, loadedWorkspaceId, saveWorkspaceSnapshot, workspaceId]);

  // Auto-save to workspace store through one coordinated snapshot path.
  useEffect(() => {
    if (loadedWorkspaceId !== workspaceId) {
      return;
    }

    const timeoutId = setTimeout(() => {
      saveWorkspaceSnapshot(workspaceId, {
        shapes,
        state: persistedEditorState,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [loadedWorkspaceId, persistedEditorState, saveWorkspaceSnapshot, shapes, workspaceId]);

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

  const addShape = useCallback(
    (shape: Shape) => {
      setPresent((prev) => {
        saveToHistory(prev.shapes, prev.editorState);
        return addShapeToDocument(prev, shape);
      });
    },
    [saveToHistory]
  );

  const updateShape = useCallback(
    (id: string, updates: Partial<Shape>) => {
      setPresent((prev) => {
        const isEditingActiveText = prev.editorState.editingTextId === id;
        const isSignificantUpdate =
          !isEditingActiveText && (!updates.bounds || (updates.bounds && !prev.editorState.isDragging));
        const nextState = updateShapeInDocument(prev, id, updates);
        if (nextState === prev) return prev;

        if (isSignificantUpdate) {
          saveToHistory(prev.shapes, prev.editorState);
        }

        return nextState;
      });
    },
    [saveToHistory]
  );

  const updateShapeBounds = useCallback(
    (id: string, updates: Partial<Shape['bounds']>) => {
      setPresent((prev) => {
        const nextState = updateShapeBoundsInDocument(prev, id, updates);
        if (nextState === prev) return prev;

        if (!prev.editorState.isDragging) {
          saveToHistory(prev.shapes, prev.editorState);
        }

        return nextState;
      });
    },
    [saveToHistory]
  );

  const deleteShape = useCallback(
    (id: string) => {
      setPresent((prev) => {
        const nextState = deleteShapeFromDocument(prev, id);
        if (nextState === prev) return prev;

        saveToHistory(prev.shapes, prev.editorState);
        return nextState;
      });
    },
    [saveToHistory]
  );

  const deleteSelectedShapes = useCallback(() => {
    if (editorState.selectedShapeIds.length === 0) return;

    setPresent((prev) => {
      const nextState = deleteSelectedShapesFromDocument(prev);
      if (nextState === prev) return prev;

      saveToHistory(prev.shapes, prev.editorState);
      return nextState;
    });
  }, [saveToHistory, editorState.selectedShapeIds]);

  const selectShapes = useCallback((ids: string[]) => {
    setPresent((prev) => {
      const normalizedIds = normalizeShapeIdsForSelection(ids, prev.shapes);

      return {
        ...prev,
        editorState: {
          ...prev.editorState,
          selectedShapeIds: normalizedIds,
        },
      };
    });
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
        const hasSelection = prev.editorState.selectedShapeIds.length > 0;
        const nextState = updateSelectedShapeStyleInDocument(prev, updates);
        if (nextState === prev) return prev;

        if (hasSelection) {
          saveToHistory(prev.shapes, prev.editorState);
        }

        return nextState;
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
    setPresent((prev) => {
      textEditStartStateRef.current = prev;

      return {
        ...prev,
        editorState: {
          ...prev.editorState,
          editingTextId: id,
          selectedShapeIds: [id],
        },
      };
    });
  }, []);

  const commitTextEdit = useCallback(() => {
    setPresent((prev) => {
      const textEditStartState = textEditStartStateRef.current;
      if (textEditStartState && textEditStartState.shapes !== prev.shapes) {
        saveToHistory(textEditStartState.shapes, textEditStartState.editorState);
      }
      textEditStartStateRef.current = null;

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
    textEditStartStateRef.current = null;

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
      const applicationResult = applyGenerationProposalToDocumentState(
        {
          shapes,
          editorState,
        },
        proposal,
        Date.now()
      );
      if (!applicationResult.success || !applicationResult.state) {
        return {
          success: false,
          error: applicationResult.error,
          appliedShapeIds: applicationResult.appliedShapeIds,
        };
      }
      const nextState = applicationResult.state;

      setPresent((prev) => {
        saveToHistory(prev.shapes, prev.editorState);
        return nextState;
      });

      return {
        success: true,
        error: null,
        appliedShapeIds: applicationResult.appliedShapeIds,
      };
    },
    [editorState, saveToHistory, shapes]
  );

  const applyMutationProposal = useCallback(
    (proposal: AgentMutationProposal) => {
      const applicationResult = applyMutationProposalToDocumentState(
        {
          shapes,
          editorState,
        },
        proposal,
        Date.now()
      );
      if (!applicationResult.success || !applicationResult.state) {
        return {
          success: false,
          error: applicationResult.error,
          appliedShapeIds: applicationResult.appliedShapeIds,
        };
      }
      const nextState = applicationResult.state;

      setPresent((prev) => {
        saveToHistory(prev.shapes, prev.editorState);
        return nextState;
      });

      return {
        success: true,
        error: null,
        appliedShapeIds: applicationResult.appliedShapeIds,
      };
    },
    [editorState, saveToHistory, shapes]
  );

  // GROUPING METHODS

  const groupShapes = useCallback(
    (shapeIds: string[]) => {
      setPresent((prev) => {
        const nextState = groupShapesInDocument(prev, shapeIds);
        if (nextState === prev) return prev;

        saveToHistory(prev.shapes, prev.editorState);
        return nextState;
      });
    },
    [saveToHistory]
  );

  const ungroupShapes = useCallback(
    (groupId: string) => {
      setPresent((prev) => {
        const nextState = ungroupShapesInDocument(prev, groupId);
        if (nextState === prev) return prev;

        saveToHistory(prev.shapes, prev.editorState);
        return nextState;
      });
    },
    [saveToHistory]
  );

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
        const nextState = bringShapesToFrontInDocument(prev, shapeIds);
        if (nextState === prev) return prev;

        saveToHistory(prev.shapes, prev.editorState);
        return nextState;
      });
    },
    [saveToHistory]
  );

  const sendShapesToBack = useCallback(
    (shapeIds: string[]) => {
      if (shapeIds.length === 0) return;

      setPresent((prev) => {
        const nextState = sendShapesToBackInDocument(prev, shapeIds);
        if (nextState === prev) return prev;

        saveToHistory(prev.shapes, prev.editorState);
        return nextState;
      });
    },
    [saveToHistory]
  );

  const alignShapes = useCallback(
    (shapeIds: string[], alignment: LayoutAlignment) => {
      setPresent((prev) => {
        const nextState = alignShapesInDocument(prev, shapeIds, alignment);
        if (nextState === prev) return prev;

        saveToHistory(prev.shapes, prev.editorState);
        return nextState;
      });
    },
    [saveToHistory]
  );

  const distributeShapes = useCallback(
    (shapeIds: string[], direction: DistributionDirection) => {
      setPresent((prev) => {
        const nextState = distributeShapesInDocument(prev, shapeIds, direction);
        if (nextState === prev) return prev;

        saveToHistory(prev.shapes, prev.editorState);
        return nextState;
      });
    },
    [saveToHistory]
  );

  const tidyShapes = useCallback(
    (shapeIds: string[]) => {
      setPresent((prev) => {
        const nextState = tidyShapesInDocument(prev, shapeIds);
        if (nextState === prev) return prev;

        saveToHistory(prev.shapes, prev.editorState);
        return nextState;
      });
    },
    [saveToHistory]
  );

  return {
    canvasRef,
    shapes,
    editorState,
    setEditorState: (action: React.SetStateAction<EditorState>) => {
      setPresent((prev) => {
        const nextEditorState = typeof action === 'function' ? action(prev.editorState) : action;
        const isStartingDrag = !prev.editorState.isDragging && nextEditorState.isDragging;
        const isEndingDrag = prev.editorState.isDragging && !nextEditorState.isDragging;

        if (isStartingDrag) {
          dragStartStateRef.current = prev;
        }

        if (isEndingDrag) {
          const dragStartState = dragStartStateRef.current;
          if (dragStartState && dragStartState.shapes !== prev.shapes) {
            saveToHistory(dragStartState.shapes, dragStartState.editorState);
          }
          dragStartStateRef.current = null;
        }

        return {
          ...prev,
          editorState: nextEditorState,
        };
      });
    },
    addShape,
    updateShape,
    updateShapeBounds,
    deleteShape,
    deleteSelectedShapes,
    selectShapes,
    clearSelection,
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
    applyMutationProposal,
    // Grouping
    groupShapes,
    ungroupShapes,
    getAllShapesInGroup,
    bringShapesToFront,
    sendShapesToBack,
    alignShapes,
    distributeShapes,
    tidyShapes,
  };
}
