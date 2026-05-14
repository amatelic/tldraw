import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { AgentOrchestrator } from '../agents/agentOrchestrator';
import { buildSelectionInspectorModel } from '../features/inspector/model/selectionInspectorModel';
import { useElementSize } from '../hooks/useElementSize';
import type { Workspace, WorkspaceStore } from '../stores/workspaceStore';
import type { EditorState, Shape, ShapeStyle, ToolType } from '../types';
import type { AgentGenerationProposal, AgentMutationProposal } from '../types/agents';
import { normalizeShapeIdsForSelection } from '../types/selection';
import {
  createAgentPanelProps,
  LAYOUT_EDITABLE_SHAPE_TYPES,
  useAppShellExportActions,
  useAppShellMediaActions,
  useSelectionActionProps,
  useWorkspaceTabProps,
} from './useAppShellActionGroups';
import type { AppShellProps } from './AppShell';

interface AppCanvasController {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  shapes: Shape[];
  editorState: EditorState;
  setEditorState: Dispatch<SetStateAction<EditorState>>;
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
  zoomAt: (screenPoint: { x: number; y: number }, factor: number) => void;
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
  groupShapes: (shapeIds: string[]) => void;
  ungroupShapes: (groupId: string) => void;
  bringShapesToFront: (shapeIds: string[]) => void;
  sendShapesToBack: (shapeIds: string[]) => void;
  alignShapes: (shapeIds: string[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeShapes: (shapeIds: string[], direction: 'horizontal' | 'vertical') => void;
  tidyShapes: (shapeIds: string[]) => void;
}

interface AppWorkspaceStore {
  workspaces: WorkspaceStore['workspaces'];
  activeWorkspaceId: WorkspaceStore['activeWorkspaceId'];
  addWorkspace: WorkspaceStore['addWorkspace'];
  deleteWorkspace: WorkspaceStore['deleteWorkspace'];
  renameWorkspace: WorkspaceStore['renameWorkspace'];
  switchWorkspace: WorkspaceStore['switchWorkspace'];
}

interface UseAppShellStateArgs {
  activeWorkspace: Workspace;
  workspaceStore: AppWorkspaceStore;
  canvas: AppCanvasController;
  agentOrchestrator: AgentOrchestrator;
}

export interface AppShellKeyboardBindings {
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  clearSelection: () => void;
  setTool: (tool: ToolType) => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
}

export interface UseAppShellStateResult {
  shellProps: AppShellProps;
  keyboardBindings: AppShellKeyboardBindings;
}

export function useAppShellState({
  activeWorkspace,
  workspaceStore,
  canvas,
  agentOrchestrator,
}: UseAppShellStateArgs): UseAppShellStateResult {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);

  const canvasSize = useElementSize(canvas.canvasRef);
  const agentViewport =
    canvasSize.width > 0 && canvasSize.height > 0
      ? { width: canvasSize.width, height: canvasSize.height }
      : null;

  const normalizedSelectedShapeIds = useMemo(
    () => normalizeShapeIdsForSelection(canvas.editorState.selectedShapeIds, canvas.shapes),
    [canvas.editorState.selectedShapeIds, canvas.shapes]
  );

  const inspectorModel = useMemo(
    () =>
      buildSelectionInspectorModel({
        defaultStyle: canvas.editorState.shapeStyle,
        selectedIds: normalizedSelectedShapeIds,
        shapes: canvas.shapes,
      }),
    [canvas.editorState.shapeStyle, normalizedSelectedShapeIds, canvas.shapes]
  );

  const singleSelectedShape = inspectorModel.singleSelectedShape;
  const canEditSelectedLayout =
    singleSelectedShape !== null && LAYOUT_EDITABLE_SHAPE_TYPES.includes(singleSelectedShape.type);
  const showPropertiesPanel = inspectorModel.selectedCount > 0 && !isAgentPanelOpen;
  const workspaceTabsProps = useWorkspaceTabProps({ workspaceStore });
  const { exportActions, onExportWorkspace } = useAppShellExportActions({
    activeWorkspace,
    canvasRef: canvas.canvasRef,
    shapes: canvas.shapes,
    editorState: canvas.editorState,
    normalizedSelectedShapeIds,
    canvasSize,
  });
  const mediaActions = useAppShellMediaActions({
    canvasRef: canvas.canvasRef,
    editorState: canvas.editorState,
    addShape: canvas.addShape,
    setEditorState: canvas.setEditorState,
  });
  const selectionActions = useSelectionActionProps({
    canvas,
    inspectorModel,
    normalizedSelectedShapeIds,
    canEditSelectedLayout,
  });

  const handleToolChange = useCallback(
    (tool: ToolType) => {
      if (tool === 'image') {
        setShowImageDialog(true);
        return;
      }
      if (tool === 'audio') {
        setShowAudioDialog(true);
        return;
      }
      if (tool === 'embed') {
        setShowEmbedDialog(true);
        return;
      }

      canvas.setEditorState((prev) => ({ ...prev, tool }));
      if (tool !== 'select') {
        canvas.clearSelection();
      }
    },
    [canvas]
  );

  const handleDraggingChange = useCallback(
    (isDragging: boolean) => {
      canvas.setEditorState((prev) => ({ ...prev, isDragging }));
    },
    [canvas]
  );

  const handleDrawingChange = useCallback(
    (isDrawing: boolean) => {
      canvas.setEditorState((prev) => ({ ...prev, isDrawing }));
    },
    [canvas]
  );

  const handleCreationComplete = useCallback(() => {
    canvas.setEditorState((prev) => ({ ...prev, tool: 'select' }));
  }, [canvas]);

  const handleTextEditCommit = useCallback(() => {
    canvas.commitTextEdit();
    canvas.setEditorState((prev) => ({ ...prev, tool: 'select' }));
  }, [canvas]);

  const handleTextEditCancel = useCallback(() => {
    canvas.cancelTextEdit();
    canvas.setEditorState((prev) => ({ ...prev, tool: 'select' }));
  }, [canvas]);

  const shellProps: AppShellProps = {
    workspaceTabsProps,
    headerActions: {
      isAgentPanelOpen,
      onExportWorkspace,
      exportActions,
      onToggleAgentPanel: () => setIsAgentPanelOpen((current) => !current),
      onUndo: canvas.undo,
      onRedo: canvas.redo,
      onDeleteSelected: canvas.deleteSelectedShapes,
      canUndo: canvas.canUndo,
      canRedo: canvas.canRedo,
      hasSelection: normalizedSelectedShapeIds.length > 0,
    },
    toolbarProps: {
      currentTool: canvas.editorState.tool,
      onToolChange: handleToolChange,
    },
    canvasProps: {
      canvasRef: canvas.canvasRef,
      shapes: canvas.shapes,
      selectedIds: normalizedSelectedShapeIds,
      tool: canvas.editorState.tool,
      style: canvas.editorState.shapeStyle,
      camera: canvas.editorState.camera,
      isDragging: canvas.editorState.isDragging,
      isDrawing: canvas.editorState.isDrawing,
      editingTextId: canvas.editorState.editingTextId,
      onShapeAdd: canvas.addShape,
      onShapeUpdate: canvas.updateShape,
      onShapeDelete: canvas.deleteShape,
      onSelectionChange: canvas.selectShapes,
      onDraggingChange: handleDraggingChange,
      onDrawingChange: handleDrawingChange,
      onPan: canvas.pan,
      onZoomAt: canvas.zoomAt,
      onTextEditStart: canvas.startTextEdit,
      onTextEditCommit: handleTextEditCommit,
      onTextEditCancel: handleTextEditCancel,
      onCreationComplete: handleCreationComplete,
      onDeleteSelected: canvas.deleteSelectedShapes,
      onGroupSelected: selectionActions.onGroupSelected,
      onUngroupSelected: selectionActions.onUngroupSelected,
      onBringToFront: selectionActions.onBringSelectedToFront,
      onSendToBack: selectionActions.onSendSelectedToBack,
      canGroupSelection: inspectorModel.canGroup,
      canUngroupSelection: inspectorModel.canUngroup,
    },
    zoomControlsProps: {
      zoom: canvas.editorState.camera.zoom,
      onZoomIn: canvas.zoomIn,
      onZoomOut: canvas.zoomOut,
      onReset: canvas.resetZoom,
    },
    propertiesPanelProps: showPropertiesPanel
      ? {
          style: inspectorModel.style,
          mixedStyleKeys: inspectorModel.mixedStyleKeys,
          onChange: canvas.updateShapeStyle,
          layoutBounds: inspectorModel.selectedLayoutBounds,
          onLayoutBoundsChange: canEditSelectedLayout
            ? selectionActions.onLayoutBoundsChange
            : undefined,
          hasTextSelection: inspectorModel.hasTextSelection,
          selectedItems: inspectorModel.selectedItems,
          onAlign: selectionActions.onAlign,
          onDistribute: selectionActions.onDistribute,
          onTidy: selectionActions.onTidy,
          selectedCount: inspectorModel.selectedCount,
          onGroup: selectionActions.onGroupSelected,
          onUngroup: selectionActions.onUngroupSelected,
          canGroup: inspectorModel.canGroup,
          canUngroup: inspectorModel.canUngroup,
        }
      : null,
    agentPanelProps: createAgentPanelProps({
      isAgentPanelOpen,
      activeWorkspace,
      shapes: canvas.shapes,
      camera: canvas.editorState.camera,
      selectedShapeIds: normalizedSelectedShapeIds,
      viewport: agentViewport,
      orchestrator: agentOrchestrator,
      onApplyGenerationProposal: canvas.applyGeneratedDiagram,
      onApplyMutationProposal: canvas.applyMutationProposal,
      onClose: () => setIsAgentPanelOpen(false),
    }),
    imageDialogProps: {
      isOpen: showImageDialog,
      onClose: () => setShowImageDialog(false),
      onImageAdd: mediaActions.onImageAdd,
      style: canvas.editorState.shapeStyle,
    },
    audioDialogProps: {
      isOpen: showAudioDialog,
      onClose: () => setShowAudioDialog(false),
      onAudioAdd: mediaActions.onAudioAdd,
      style: canvas.editorState.shapeStyle,
    },
    leftSidebarProps: {
      shapes: canvas.shapes,
      selectedIds: normalizedSelectedShapeIds,
      onShapeSelect: (id: string) => canvas.selectShapes([id]),
    },
    embedDialogProps: {
      isOpen: showEmbedDialog,
      onClose: () => setShowEmbedDialog(false),
      onEmbedAdd: mediaActions.onEmbedAdd,
      style: canvas.editorState.shapeStyle,
    },
  };

  return {
    shellProps,
    keyboardBindings: {
      undo: canvas.undo,
      redo: canvas.redo,
      deleteSelected: canvas.deleteSelectedShapes,
      clearSelection: canvas.clearSelection,
      setTool: handleToolChange,
      groupSelected: selectionActions.onGroupSelected,
      ungroupSelected: selectionActions.onUngroupSelected,
    },
  };
}
