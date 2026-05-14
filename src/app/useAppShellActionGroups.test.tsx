import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentOrchestrator } from '../agents/agentOrchestrator';
import type { EditorState, Shape, ShapeStyle, Workspace } from '../types';
import {
  createAgentPanelProps,
  getSelectedExportShapes,
  MAX_WORKSPACES,
  useAppShellMediaActions,
  useWorkspaceTabProps,
} from './useAppShellActionGroups';

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
  shapeStyle: baseStyle,
  editingTextId: null,
};

const workspace: Workspace = {
  id: 'workspace-1',
  name: 'Workspace 1',
  state: baseEditorState,
  shapes: [],
  createdAt: 1,
  updatedAt: 1,
};

function createRectangle(id: string, parentId?: string): Shape {
  return {
    id,
    type: 'rectangle',
    bounds: { x: 0, y: 0, width: 100, height: 80 },
    style: baseStyle,
    parentId,
    createdAt: 1,
    updatedAt: 1,
  };
}

function createGroup(id: string, parentId?: string): Shape {
  return {
    id,
    type: 'group',
    bounds: { x: 0, y: 0, width: 240, height: 120 },
    style: baseStyle,
    parentId,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('app shell action groups', () => {
  it('expands selected group exports to include nested descendants', () => {
    const shapes = [
      createGroup('group-root'),
      createRectangle('shape-a', 'group-root'),
      createGroup('group-nested', 'group-root'),
      createRectangle('shape-b', 'group-nested'),
      createRectangle('shape-outside'),
    ];

    expect(getSelectedExportShapes(shapes, ['group-root']).map((shape) => shape.id)).toEqual([
      'group-root',
      'shape-a',
      'group-nested',
      'shape-b',
    ]);
  });

  it('creates agent panel props only when the panel is open', () => {
    const orchestrator = new AgentOrchestrator([]);
    const onClose = vi.fn();
    const onApplyGenerationProposal = vi.fn(() => ({
      success: true,
      error: null,
      appliedShapeIds: [],
    }));
    const onApplyMutationProposal = vi.fn(() => ({
      success: true,
      error: null,
      appliedShapeIds: [],
    }));

    expect(
      createAgentPanelProps({
        isAgentPanelOpen: false,
        activeWorkspace: workspace,
        shapes: [],
        camera: baseEditorState.camera,
        selectedShapeIds: [],
        viewport: null,
        orchestrator,
        onApplyGenerationProposal,
        onApplyMutationProposal,
        onClose,
      })
    ).toBeNull();

    expect(
      createAgentPanelProps({
        isAgentPanelOpen: true,
        activeWorkspace: workspace,
        shapes: [createRectangle('shape-1')],
        camera: baseEditorState.camera,
        selectedShapeIds: ['shape-1'],
        viewport: { width: 800, height: 600 },
        orchestrator,
        onApplyGenerationProposal,
        onApplyMutationProposal,
        onClose,
      })
    ).toMatchObject({
      isOpen: true,
      workspaceId: 'workspace-1',
      workspaceName: 'Workspace 1',
      editorState: {
        camera: baseEditorState.camera,
        selectedShapeIds: ['shape-1'],
      },
      viewport: { width: 800, height: 600 },
    });
  });

  it('guards workspace creation at the workspace limit', () => {
    const addWorkspace = vi.fn();
    const workspaceStore = {
      workspaces: Array.from({ length: MAX_WORKSPACES }, (_, index) => ({
        ...workspace,
        id: `workspace-${index}`,
      })),
      activeWorkspaceId: 'workspace-1',
      addWorkspace,
      deleteWorkspace: vi.fn(),
      renameWorkspace: vi.fn(() => true),
      switchWorkspace: vi.fn(),
    };

    const { result } = renderHook(() => useWorkspaceTabProps({ workspaceStore }));

    act(() => {
      result.current.onAdd();
    });

    expect(addWorkspace).not.toHaveBeenCalled();
  });

  it('creates uploaded image shapes around the current viewport center and returns to select', () => {
    const addShape = vi.fn();
    const setEditorState = vi.fn();
    const canvasElement = {
      getBoundingClientRect: () => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        toJSON: () => ({}),
      }),
    } as HTMLCanvasElement;

    const { result } = renderHook(() =>
      useAppShellMediaActions({
        canvasRef: { current: canvasElement },
        editorState: baseEditorState,
        addShape,
        setEditorState,
      })
    );

    act(() => {
      result.current.onImageAdd('image://upload', false, 600, 300, baseStyle);
    });

    expect(addShape).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'image',
        bounds: { x: 250, y: 225, width: 300, height: 150 },
        src: 'image://upload',
        originalWidth: 600,
        originalHeight: 300,
      })
    );
    const update = setEditorState.mock.calls[0]?.[0] as (state: EditorState) => EditorState;
    expect(update({ ...baseEditorState, tool: 'image' }).tool).toBe('select');
  });
});
