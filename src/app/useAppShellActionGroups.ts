import { useCallback, useMemo } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { AgentOrchestrator } from '../agents/agentOrchestrator';
import { screenToWorldPoint } from '../canvas/CanvasEngine';
import { downloadShapesAsPng, downloadShapesAsSvg, downloadViewportAsPng } from '../canvas/export';
import type { SelectionInspectorModel } from '../features/inspector/model/selectionInspectorModel';
import {
  createAudioShapeFromUpload,
  createEmbedShapeFromUrl,
  createImageShapeFromUpload,
} from '../document/shapeFactories';
import { normalizePersistedWorkspaceState } from '../stores/workspaceStore';
import type { Workspace, WorkspaceStore } from '../stores/workspaceStore';
import type { Bounds, EditorState, Shape, ShapeStyle } from '../types';
import type { AgentGenerationProposal, AgentMutationProposal, AgentViewport } from '../types/agents';
import { getGroupDescendants } from '../types/selection';
import {
  createWorkspaceExportFilename,
  downloadWorkspaceExport,
  serializeWorkspaceForExport,
} from '../utils/workspaceExport';
import type { AppHeaderExportAction, AppShellProps } from './AppShell';

export const MAX_WORKSPACES = 10;
export const LAYOUT_EDITABLE_SHAPE_TYPES: Shape['type'][] = [
  'rectangle',
  'image',
  'audio',
  'text',
  'embed',
];

interface AppCanvasActionController {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  shapes: Shape[];
  editorState: EditorState;
  setEditorState: Dispatch<SetStateAction<EditorState>>;
  addShape: (shape: Shape) => void;
  updateShapeBounds: (id: string, updates: Partial<Shape['bounds']>) => void;
  groupShapes: (shapeIds: string[]) => void;
  ungroupShapes: (groupId: string) => void;
  bringShapesToFront: (shapeIds: string[]) => void;
  sendShapesToBack: (shapeIds: string[]) => void;
  alignShapes: (shapeIds: string[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeShapes: (shapeIds: string[], direction: 'horizontal' | 'vertical') => void;
  tidyShapes: (shapeIds: string[]) => void;
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
}

interface WorkspaceActionStore {
  workspaces: WorkspaceStore['workspaces'];
  activeWorkspaceId: WorkspaceStore['activeWorkspaceId'];
  addWorkspace: WorkspaceStore['addWorkspace'];
  deleteWorkspace: WorkspaceStore['deleteWorkspace'];
  renameWorkspace: WorkspaceStore['renameWorkspace'];
  switchWorkspace: WorkspaceStore['switchWorkspace'];
}

interface CanvasSize {
  width: number;
  height: number;
}

type LayoutAlignment = Parameters<AppCanvasActionController['alignShapes']>[1];
type LayoutDistributionDirection = Parameters<AppCanvasActionController['distributeShapes']>[1];

export interface UseAppShellExportActionsOptions {
  activeWorkspace: Workspace;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  shapes: Shape[];
  editorState: EditorState;
  normalizedSelectedShapeIds: string[];
  canvasSize: CanvasSize;
}

export interface UseAppShellExportActionsResult {
  exportActions: AppHeaderExportAction[];
  onExportWorkspace: () => void;
  selectedExportShapes: Shape[];
}

export interface UseAppShellMediaActionsOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  editorState: EditorState;
  addShape: (shape: Shape) => void;
  setEditorState: Dispatch<SetStateAction<EditorState>>;
}

export interface UseAppShellMediaActionsResult {
  onImageAdd: AppShellProps['imageDialogProps']['onImageAdd'];
  onAudioAdd: AppShellProps['audioDialogProps']['onAudioAdd'];
  onEmbedAdd: AppShellProps['embedDialogProps']['onEmbedAdd'];
}

export interface UseWorkspaceTabPropsOptions {
  workspaceStore: WorkspaceActionStore;
}

export interface UseSelectionActionPropsOptions {
  canvas: AppCanvasActionController;
  inspectorModel: SelectionInspectorModel;
  normalizedSelectedShapeIds: string[];
  canEditSelectedLayout: boolean;
}

export interface UseSelectionActionPropsResult {
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onBringSelectedToFront: () => void;
  onSendSelectedToBack: () => void;
  onAlign: (alignment: LayoutAlignment) => void;
  onDistribute: (direction: LayoutDistributionDirection) => void;
  onTidy: () => void;
  onLayoutBoundsChange: (updates: Partial<Bounds>) => void;
}

export interface CreateAgentPanelPropsOptions {
  isAgentPanelOpen: boolean;
  activeWorkspace: Workspace;
  shapes: Shape[];
  camera: EditorState['camera'];
  selectedShapeIds: string[];
  viewport: AgentViewport | null;
  orchestrator: AgentOrchestrator;
  onApplyGenerationProposal: AppCanvasActionController['applyGeneratedDiagram'];
  onApplyMutationProposal: AppCanvasActionController['applyMutationProposal'];
  onClose: () => void;
}

export function getSelectedExportShapes(shapes: Shape[], normalizedSelectedShapeIds: string[]): Shape[] {
  const selectedIds = new Set(normalizedSelectedShapeIds);

  for (const selectedId of normalizedSelectedShapeIds) {
    const selectedShape = shapes.find((shape) => shape.id === selectedId);
    if (selectedShape?.type === 'group') {
      for (const descendant of getGroupDescendants(selectedShape.id, shapes)) {
        selectedIds.add(descendant.id);
      }
    }
  }

  return shapes.filter((shape) => selectedIds.has(shape.id));
}

export function useAppShellExportActions({
  activeWorkspace,
  canvasRef,
  shapes,
  editorState,
  normalizedSelectedShapeIds,
  canvasSize,
}: UseAppShellExportActionsOptions): UseAppShellExportActionsResult {
  const selectedExportShapes = useMemo(
    () => getSelectedExportShapes(shapes, normalizedSelectedShapeIds),
    [normalizedSelectedShapeIds, shapes]
  );

  const onExportWorkspace = useCallback(() => {
    const exportDocument = serializeWorkspaceForExport({
      ...activeWorkspace,
      shapes,
      state: normalizePersistedWorkspaceState({
        tool: editorState.tool,
        selectedShapeIds: normalizedSelectedShapeIds,
        camera: editorState.camera,
        shapeStyle: editorState.shapeStyle,
      }),
    });
    const filename = createWorkspaceExportFilename(activeWorkspace.name);
    downloadWorkspaceExport(exportDocument, filename);
  }, [activeWorkspace, editorState, normalizedSelectedShapeIds, shapes]);

  const handleExportViewportPng = useCallback(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) {
      return;
    }

    downloadViewportAsPng({
      canvas: canvasElement,
      camera: editorState.camera,
      shapes,
      workspaceName: activeWorkspace.name,
    });
  }, [activeWorkspace.name, canvasRef, editorState.camera, shapes]);

  const handleExportAllShapesPng = useCallback(() => {
    downloadShapesAsPng({
      shapes,
      workspaceName: activeWorkspace.name,
      scope: 'all',
    });
  }, [activeWorkspace.name, shapes]);

  const handleExportSelectedShapesPng = useCallback(() => {
    downloadShapesAsPng({
      shapes: selectedExportShapes,
      workspaceName: activeWorkspace.name,
      scope: 'selected',
    });
  }, [activeWorkspace.name, selectedExportShapes]);

  const handleExportAllShapesSvg = useCallback(() => {
    downloadShapesAsSvg({
      shapes,
      workspaceName: activeWorkspace.name,
      scope: 'all',
    });
  }, [activeWorkspace.name, shapes]);

  const handleExportSelectedShapesSvg = useCallback(() => {
    downloadShapesAsSvg({
      shapes: selectedExportShapes,
      workspaceName: activeWorkspace.name,
      scope: 'selected',
    });
  }, [activeWorkspace.name, selectedExportShapes]);

  const exportActions = useMemo(
    () => [
      {
        id: 'viewport-png',
        label: 'Current viewport PNG',
        onSelect: handleExportViewportPng,
        disabled: canvasSize.width <= 0 || canvasSize.height <= 0,
      },
      {
        id: 'all-png',
        label: 'All shapes PNG',
        onSelect: handleExportAllShapesPng,
        disabled: shapes.length === 0,
      },
      {
        id: 'selected-png',
        label: 'Selected PNG',
        onSelect: handleExportSelectedShapesPng,
        disabled: selectedExportShapes.length === 0,
      },
      {
        id: 'all-svg',
        label: 'All shapes SVG',
        onSelect: handleExportAllShapesSvg,
        disabled: shapes.length === 0,
      },
      {
        id: 'selected-svg',
        label: 'Selected SVG',
        onSelect: handleExportSelectedShapesSvg,
        disabled: selectedExportShapes.length === 0,
      },
    ],
    [
      canvasSize.height,
      canvasSize.width,
      handleExportAllShapesPng,
      handleExportAllShapesSvg,
      handleExportSelectedShapesPng,
      handleExportSelectedShapesSvg,
      handleExportViewportPng,
      selectedExportShapes.length,
      shapes.length,
    ]
  );

  return {
    exportActions,
    onExportWorkspace,
    selectedExportShapes,
  };
}

export function useAppShellMediaActions({
  canvasRef,
  editorState,
  addShape,
  setEditorState,
}: UseAppShellMediaActionsOptions): UseAppShellMediaActionsResult {
  const getViewportCenter = useCallback(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return { x: 100, y: 100 };
    const rect = canvasElement.getBoundingClientRect();
    return screenToWorldPoint({ x: rect.width / 2, y: rect.height / 2 }, editorState.camera);
  }, [canvasRef, editorState.camera]);

  const returnToSelect = useCallback(() => {
    setEditorState((prev) => ({ ...prev, tool: 'select' }));
  }, [setEditorState]);

  const onImageAdd = useCallback(
    (src: string, isBase64: boolean, width: number, height: number, style: ShapeStyle) => {
      addShape(
        createImageShapeFromUpload({
          src,
          isBase64,
          originalWidth: width,
          originalHeight: height,
          center: getViewportCenter(),
          style,
        })
      );
      returnToSelect();
    },
    [addShape, getViewportCenter, returnToSelect]
  );

  const onAudioAdd = useCallback(
    (
      src: string,
      isBase64: boolean,
      duration: number,
      waveformData: number[],
      style: ShapeStyle
    ) => {
      addShape(
        createAudioShapeFromUpload({
          src,
          isBase64,
          duration,
          waveformData,
          center: getViewportCenter(),
          style,
        })
      );
      returnToSelect();
    },
    [addShape, getViewportCenter, returnToSelect]
  );

  const onEmbedAdd = useCallback(
    (
      url: string,
      embedType: 'youtube' | 'website',
      embedSrc: string,
      style: ShapeStyle
    ) => {
      addShape(
        createEmbedShapeFromUrl({
          url,
          embedType,
          embedSrc,
          center: getViewportCenter(),
          style,
        })
      );
      returnToSelect();
    },
    [addShape, getViewportCenter, returnToSelect]
  );

  return {
    onImageAdd,
    onAudioAdd,
    onEmbedAdd,
  };
}

export function useWorkspaceTabProps({
  workspaceStore,
}: UseWorkspaceTabPropsOptions): AppShellProps['workspaceTabsProps'] {
  const handleAddWorkspace = useCallback(() => {
    if (workspaceStore.workspaces.length < MAX_WORKSPACES) {
      workspaceStore.addWorkspace();
    }
  }, [workspaceStore]);

  const handleDeleteWorkspace = useCallback(
    (id: string) => {
      workspaceStore.deleteWorkspace(id);
    },
    [workspaceStore]
  );

  const handleRenameWorkspace = useCallback(
    (id: string, name: string) => {
      return workspaceStore.renameWorkspace(id, name);
    },
    [workspaceStore]
  );

  return useMemo(
    () => ({
      workspaces: workspaceStore.workspaces,
      activeId: workspaceStore.activeWorkspaceId,
      onSwitch: workspaceStore.switchWorkspace,
      onAdd: handleAddWorkspace,
      onDelete: handleDeleteWorkspace,
      onRename: handleRenameWorkspace,
      maxWorkspaces: MAX_WORKSPACES,
    }),
    [
      handleAddWorkspace,
      handleDeleteWorkspace,
      handleRenameWorkspace,
      workspaceStore.activeWorkspaceId,
      workspaceStore.switchWorkspace,
      workspaceStore.workspaces,
    ]
  );
}

export function useSelectionActionProps({
  canvas,
  inspectorModel,
  normalizedSelectedShapeIds,
  canEditSelectedLayout,
}: UseSelectionActionPropsOptions): UseSelectionActionPropsResult {
  const singleSelectedShape = inspectorModel.singleSelectedShape;

  const onGroupSelected = useCallback(() => {
    if (inspectorModel.canGroup) {
      canvas.groupShapes(normalizedSelectedShapeIds);
    }
  }, [canvas, inspectorModel.canGroup, normalizedSelectedShapeIds]);

  const onUngroupSelected = useCallback(() => {
    if (inspectorModel.canUngroup && inspectorModel.singleSelectedShape?.type === 'group') {
      canvas.ungroupShapes(inspectorModel.singleSelectedShape.id);
    }
  }, [canvas, inspectorModel.canUngroup, inspectorModel.singleSelectedShape]);

  const onBringSelectedToFront = useCallback(() => {
    if (normalizedSelectedShapeIds.length === 0) return;
    canvas.bringShapesToFront(normalizedSelectedShapeIds);
  }, [canvas, normalizedSelectedShapeIds]);

  const onSendSelectedToBack = useCallback(() => {
    if (normalizedSelectedShapeIds.length === 0) return;
    canvas.sendShapesToBack(normalizedSelectedShapeIds);
  }, [canvas, normalizedSelectedShapeIds]);

  const onAlign = useCallback(
    (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      canvas.alignShapes(normalizedSelectedShapeIds, alignment);
    },
    [canvas, normalizedSelectedShapeIds]
  );

  const onDistribute = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      canvas.distributeShapes(normalizedSelectedShapeIds, direction);
    },
    [canvas, normalizedSelectedShapeIds]
  );

  const onTidy = useCallback(() => {
    canvas.tidyShapes(normalizedSelectedShapeIds);
  }, [canvas, normalizedSelectedShapeIds]);

  const onLayoutBoundsChange = useCallback(
    (updates: Partial<Bounds>) => {
      if (!singleSelectedShape || !canEditSelectedLayout) {
        return;
      }

      const nextBounds: Bounds = {
        ...singleSelectedShape.bounds,
        ...updates,
      };

      nextBounds.width = Math.max(1, nextBounds.width);
      nextBounds.height = Math.max(1, nextBounds.height);

      canvas.updateShapeBounds(singleSelectedShape.id, nextBounds);
    },
    [canEditSelectedLayout, canvas, singleSelectedShape]
  );

  return {
    onGroupSelected,
    onUngroupSelected,
    onBringSelectedToFront,
    onSendSelectedToBack,
    onAlign,
    onDistribute,
    onTidy,
    onLayoutBoundsChange,
  };
}

export function createAgentPanelProps({
  isAgentPanelOpen,
  activeWorkspace,
  shapes,
  camera,
  selectedShapeIds,
  viewport,
  orchestrator,
  onApplyGenerationProposal,
  onApplyMutationProposal,
  onClose,
}: CreateAgentPanelPropsOptions): AppShellProps['agentPanelProps'] {
  if (!isAgentPanelOpen) {
    return null;
  }

  return {
    isOpen: isAgentPanelOpen,
    workspaceId: activeWorkspace.id,
    workspaceName: activeWorkspace.name,
    shapes,
    editorState: {
      camera,
      selectedShapeIds,
    },
    viewport,
    orchestrator,
    onApplyGenerationProposal,
    onApplyMutationProposal,
    onClose,
  };
}
