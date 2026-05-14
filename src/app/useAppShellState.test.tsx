import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentOrchestrator } from '../agents/agentOrchestrator';
import type { EditorState, Shape, ShapeStyle } from '../types';
import { useAppShellState } from './useAppShellState';

const {
  serializeWorkspaceForExport,
  createWorkspaceExportFilename,
  downloadWorkspaceExport,
} = vi.hoisted(() => ({
  serializeWorkspaceForExport: vi.fn(() => ({ format: 'tldraw-workspace-export', version: 1 })),
  createWorkspaceExportFilename: vi.fn(() => 'shell-demo.json'),
  downloadWorkspaceExport: vi.fn(),
}));

vi.mock('../hooks/useElementSize', () => ({
  useElementSize: () => ({ width: 1200, height: 800 }),
}));

vi.mock('../utils/workspaceExport', () => ({
  serializeWorkspaceForExport,
  createWorkspaceExportFilename,
  downloadWorkspaceExport,
}));

type UseAppShellStateArgs = Parameters<typeof useAppShellState>[0];
type AppCanvasController = UseAppShellStateArgs['canvas'];
type AppWorkspaceStore = UseAppShellStateArgs['workspaceStore'];

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

const baseEditorState: EditorState = {
  tool: 'select',
  selectedShapeIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  isDragging: false,
  isDrawing: false,
  shapeStyle: { ...baseStyle },
  editingTextId: null,
};

function createRectangle(id: string): Shape {
  return {
    id,
    type: 'rectangle',
    bounds: { x: 40, y: 80, width: 160, height: 120 },
    style: { ...baseStyle },
    createdAt: 1,
    updatedAt: 1,
  };
}

function createWorkspaceStore(): AppWorkspaceStore {
  return {
    workspaces: [],
    activeWorkspaceId: 'workspace-1',
    addWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    renameWorkspace: vi.fn(),
    switchWorkspace: vi.fn(),
  };
}

function createCanvasController(overrides: Partial<AppCanvasController> = {}): AppCanvasController {
  return {
    canvasRef: { current: null },
    shapes: [],
    editorState: { ...baseEditorState },
    setEditorState: vi.fn(),
    addShape: vi.fn(),
    updateShape: vi.fn(),
    updateShapeBounds: vi.fn(),
    deleteShape: vi.fn(),
    deleteSelectedShapes: vi.fn(),
    selectShapes: vi.fn(),
    clearSelection: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    resetZoom: vi.fn(),
    zoomAt: vi.fn(),
    pan: vi.fn(),
    updateShapeStyle: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    startTextEdit: vi.fn(),
    commitTextEdit: vi.fn(),
    cancelTextEdit: vi.fn(),
    applyGeneratedDiagram: vi.fn(() => ({ success: true, error: null, appliedShapeIds: [] })),
    applyMutationProposal: vi.fn(() => ({ success: true, error: null, appliedShapeIds: [] })),
    groupShapes: vi.fn(),
    ungroupShapes: vi.fn(),
    bringShapesToFront: vi.fn(),
    sendShapesToBack: vi.fn(),
    alignShapes: vi.fn(),
    distributeShapes: vi.fn(),
    tidyShapes: vi.fn(),
    ...overrides,
  };
}

describe('useAppShellState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports JSON from the live canvas state instead of the debounced workspace snapshot', () => {
    const staleShape = createRectangle('stale-shape');
    const liveShape = createRectangle('live-shape');
    const canvas = createCanvasController({
      shapes: [liveShape],
      editorState: {
        ...baseEditorState,
        selectedShapeIds: [liveShape.id],
        camera: { x: 80, y: 48, zoom: 1.5 },
      },
    });
    const { result } = renderHook(() =>
      useAppShellState({
        activeWorkspace: {
          id: 'workspace-1',
          name: 'Shell Demo',
          state: {
            ...baseEditorState,
            camera: { x: 0, y: 0, zoom: 1 },
          },
          shapes: [staleShape],
          createdAt: 1,
          updatedAt: 2,
        },
        workspaceStore: createWorkspaceStore(),
        canvas,
        agentOrchestrator: new AgentOrchestrator([]),
      })
    );

    act(() => {
      result.current.shellProps.headerActions.onExportWorkspace();
    });

    expect(serializeWorkspaceForExport).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workspace-1',
        name: 'Shell Demo',
        shapes: [liveShape],
        state: expect.objectContaining({
          selectedShapeIds: [liveShape.id],
          camera: { x: 80, y: 48, zoom: 1.5 },
        }),
      })
    );
    expect(createWorkspaceExportFilename).toHaveBeenCalledWith('Shell Demo');
    expect(downloadWorkspaceExport).toHaveBeenCalledWith(
      { format: 'tldraw-workspace-export', version: 1 },
      'shell-demo.json'
    );
  });

  it('opens the image dialog instead of switching tools immediately', () => {
    const canvas = createCanvasController();
    const { result } = renderHook(() =>
      useAppShellState({
        activeWorkspace: {
          id: 'workspace-1',
          name: 'Shell Demo',
          state: baseEditorState,
          shapes: [],
          createdAt: 1,
          updatedAt: 1,
        },
        workspaceStore: createWorkspaceStore(),
        canvas,
        agentOrchestrator: new AgentOrchestrator([]),
      })
    );

    act(() => {
      result.current.shellProps.toolbarProps.onToolChange('image');
    });

    expect(result.current.shellProps.imageDialogProps.isOpen).toBe(true);
    expect(canvas.setEditorState).not.toHaveBeenCalled();
    expect(canvas.clearSelection).not.toHaveBeenCalled();
  });

  it('switches back to select after a canvas creation completes', () => {
    const canvas = createCanvasController({
      editorState: {
        ...baseEditorState,
        tool: 'rectangle',
      },
    });
    const { result } = renderHook(() =>
      useAppShellState({
        activeWorkspace: {
          id: 'workspace-1',
          name: 'Shell Demo',
          state: baseEditorState,
          shapes: [],
          createdAt: 1,
          updatedAt: 1,
        },
        workspaceStore: createWorkspaceStore(),
        canvas,
        agentOrchestrator: new AgentOrchestrator([]),
      })
    );

    act(() => {
      result.current.shellProps.canvasProps.onCreationComplete?.();
    });

    const update = vi.mocked(canvas.setEditorState).mock.calls[0]?.[0];
    expect(typeof update).toBe('function');
    expect((update as (state: EditorState) => EditorState)(canvas.editorState).tool).toBe('select');
  });

  it('commits text edits and returns to select', () => {
    const canvas = createCanvasController({
      editorState: {
        ...baseEditorState,
        tool: 'text',
        editingTextId: 'text-1',
      },
    });
    const { result } = renderHook(() =>
      useAppShellState({
        activeWorkspace: {
          id: 'workspace-1',
          name: 'Shell Demo',
          state: baseEditorState,
          shapes: [],
          createdAt: 1,
          updatedAt: 1,
        },
        workspaceStore: createWorkspaceStore(),
        canvas,
        agentOrchestrator: new AgentOrchestrator([]),
      })
    );

    act(() => {
      result.current.shellProps.canvasProps.onTextEditCommit();
    });

    expect(canvas.commitTextEdit).toHaveBeenCalled();
    const update = vi.mocked(canvas.setEditorState).mock.calls[0]?.[0];
    expect(typeof update).toBe('function');
    expect((update as (state: EditorState) => EditorState)(canvas.editorState).tool).toBe('select');
  });

  it('switches the right rail from inspector to agent mode when toggled', () => {
    const selectedShape = createRectangle('shape-1');
    const canvas = createCanvasController({
      shapes: [selectedShape],
      editorState: {
        ...baseEditorState,
        selectedShapeIds: ['shape-1'],
      },
    });

    const { result } = renderHook(() =>
      useAppShellState({
        activeWorkspace: {
          id: 'workspace-1',
          name: 'Shell Demo',
          state: baseEditorState,
          shapes: [selectedShape],
          createdAt: 1,
          updatedAt: 1,
        },
        workspaceStore: createWorkspaceStore(),
        canvas,
        agentOrchestrator: new AgentOrchestrator([]),
      })
    );

    expect(result.current.shellProps.propertiesPanelProps).not.toBeNull();
    expect(result.current.shellProps.agentPanelProps).toBeNull();

    act(() => {
      result.current.shellProps.headerActions.onToggleAgentPanel();
    });

    expect(result.current.shellProps.propertiesPanelProps).toBeNull();
    expect(result.current.shellProps.agentPanelProps).not.toBeNull();
  });

  it('clamps inspector layout edits before forwarding bounds updates', () => {
    const selectedShape = createRectangle('shape-1');
    const canvas = createCanvasController({
      shapes: [selectedShape],
      editorState: {
        ...baseEditorState,
        selectedShapeIds: ['shape-1'],
      },
    });

    const { result } = renderHook(() =>
      useAppShellState({
        activeWorkspace: {
          id: 'workspace-1',
          name: 'Shell Demo',
          state: baseEditorState,
          shapes: [selectedShape],
          createdAt: 1,
          updatedAt: 1,
        },
        workspaceStore: createWorkspaceStore(),
        canvas,
        agentOrchestrator: new AgentOrchestrator([]),
      })
    );

    act(() => {
      result.current.shellProps.propertiesPanelProps?.onLayoutBoundsChange?.({
        width: -20,
        height: 0,
      });
    });

    expect(canvas.updateShapeBounds).toHaveBeenCalledWith('shape-1', {
      x: 40,
      y: 80,
      width: 1,
      height: 1,
    });
  });
});
