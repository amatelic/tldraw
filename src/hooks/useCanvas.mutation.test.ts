import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Shape } from '../types';
import type { AgentMutationProposal } from '../types/agents';
import { useCanvas } from './useCanvas';

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
          fillColor: '#ffffff',
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
    updateWorkspaceShapes: vi.fn(),
    updateWorkspaceState: vi.fn(),
  }),
}));

const workspaceId = 'test-workspace';

function createTextShape(id: string, text: string): Shape {
  return {
    id,
    type: 'text',
    bounds: { x: 0, y: 0, width: 200, height: 24 },
    text,
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    style: {
      color: '#000000',
      fillColor: '#ffffff',
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
    createdAt: 1,
    updatedAt: 1,
  };
}

const mutationProposal: AgentMutationProposal = {
  kind: 'mutation',
  workflow: 'rewrite-selection',
  summary: 'Prepared a rewrite for the selected text.',
  actions: [
    {
      type: 'update-shape',
      targetId: 'shape-1',
      description: 'Rewrite "Review this flow" for clarity.',
      changes: {
        text: 'Review Flow',
      },
    },
  ],
};

describe('useCanvas - mutation proposals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply a mutation proposal in one step and keep the target selected', () => {
    const { result } = renderHook(() => useCanvas(workspaceId));

    act(() => {
      result.current.addShape(createTextShape('shape-1', 'Review this flow'));
      result.current.addShape(createTextShape('shape-2', 'Leave this alone'));
    });

    let applyResult:
      | ReturnType<typeof result.current.applyMutationProposal>
      | undefined;

    act(() => {
      applyResult = result.current.applyMutationProposal(mutationProposal);
    });

    expect(applyResult).toEqual({
      success: true,
      error: null,
      appliedShapeIds: ['shape-1'],
    });
    expect(result.current.shapes.find((shape) => shape.id === 'shape-1' && shape.type === 'text')).toMatchObject({
      text: 'Review Flow',
    });
    expect(result.current.shapes.find((shape) => shape.id === 'shape-2' && shape.type === 'text')).toMatchObject({
      text: 'Leave this alone',
    });
    expect(result.current.editorState.selectedShapeIds).toEqual(['shape-1']);
  });

  it('should undo an applied rewrite in one history step', () => {
    const { result } = renderHook(() => useCanvas(workspaceId));

    act(() => {
      result.current.addShape(createTextShape('shape-1', 'Review this flow'));
    });

    act(() => {
      result.current.applyMutationProposal(mutationProposal);
    });

    expect(result.current.shapes.find((shape) => shape.id === 'shape-1' && shape.type === 'text')).toMatchObject({
      text: 'Review Flow',
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.shapes.find((shape) => shape.id === 'shape-1' && shape.type === 'text')).toMatchObject({
      text: 'Review this flow',
    });
  });

  it('should block invalid rewrite proposals without partially mutating the board', () => {
    const { result } = renderHook(() => useCanvas(workspaceId));

    act(() => {
      result.current.addShape(createTextShape('shape-1', 'Review this flow'));
    });

    const invalidProposal: AgentMutationProposal = {
      ...mutationProposal,
      actions: [
        {
          type: 'delete-shape',
          targetId: 'shape-1',
          description: 'Delete the selected text.',
        },
      ],
    };

    let applyResult:
      | ReturnType<typeof result.current.applyMutationProposal>
      | undefined;

    act(() => {
      applyResult = result.current.applyMutationProposal(invalidProposal);
    });

    expect(applyResult).toEqual({
      success: false,
      error: 'Selection rewrite only supports text updates in this first implementation slice.',
      appliedShapeIds: [],
    });
    expect(result.current.shapes.find((shape) => shape.id === 'shape-1' && shape.type === 'text')).toMatchObject({
      text: 'Review this flow',
    });
  });
});
