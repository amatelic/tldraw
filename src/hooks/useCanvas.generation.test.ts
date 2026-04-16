import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentGenerationProposal } from '../types/agents';
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

const generationProposal: AgentGenerationProposal = {
  kind: 'generation',
  workflow: 'generate-diagram',
  summary: 'Draft a simple flow.',
  confidence: 'high',
  sections: [
    {
      id: 'section-1',
      title: 'Flow',
      summary: 'Main diagram flow.',
      shapeIds: ['generated-node-1', 'generated-node-2'],
    },
  ],
  actions: [
    {
      type: 'create-shape',
      description: 'Create the entry node',
      shape: {
        id: 'generated-node-1',
        type: 'rectangle',
        bounds: { x: 100, y: 100, width: 160, height: 72 },
        text: 'Client',
      },
    },
    {
      type: 'create-shape',
      description: 'Create the destination node',
      shape: {
        id: 'generated-node-2',
        type: 'text',
        bounds: { x: 340, y: 116, width: 120, height: 32 },
        text: 'Service',
      },
    },
    {
      type: 'create-connector',
      description: 'Connect the two nodes',
      connector: {
        id: 'generated-connector-1',
        type: 'arrow',
        sourceId: 'generated-node-1',
        targetId: 'generated-node-2',
        start: { x: 260, y: 136 },
        end: { x: 340, y: 132 },
      },
    },
  ],
  presentationBrief: {
    title: 'Simple flow',
    objective: 'Explain the basic path.',
    audience: 'Engineering',
    summary: 'Walk through the two main nodes.',
    narrativeSteps: ['Start with the client request.'],
    speakerNotes: ['Keep the explanation brief.'],
    assumptions: ['This is a first-pass draft.'],
    openQuestions: ['Should storage be shown here?'],
  },
  warnings: [],
};

describe('useCanvas - generated diagrams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply generated shapes and connectors to the canvas and select them', () => {
    const { result } = renderHook(() => useCanvas(workspaceId));

    let applyResult:
      | ReturnType<typeof result.current.applyGeneratedDiagram>
      | undefined;

    act(() => {
      applyResult = result.current.applyGeneratedDiagram(generationProposal);
    });

    expect(applyResult).toEqual({
      success: true,
      error: null,
      appliedShapeIds: [
        'generated-node-1',
        'generated-node-1-label',
        'generated-node-2',
        'generated-connector-1',
      ],
    });
    expect(result.current.shapes.map((shape) => shape.id)).toEqual([
      'generated-node-1',
      'generated-node-1-label',
      'generated-node-2',
      'generated-connector-1',
    ]);
    expect(result.current.editorState.selectedShapeIds).toEqual([
      'generated-node-1',
      'generated-node-1-label',
      'generated-node-2',
      'generated-connector-1',
    ]);
  });

  it('should undo the full generated diagram in one history step', () => {
    const { result } = renderHook(() => useCanvas(workspaceId));

    act(() => {
      result.current.applyGeneratedDiagram(generationProposal);
    });

    expect(result.current.shapes).toHaveLength(4);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.shapes).toHaveLength(0);
    expect(result.current.editorState.selectedShapeIds).toEqual([]);
    expect(result.current.canRedo).toBe(true);
  });

  it('should block invalid generated diagrams without leaving partial shapes behind', () => {
    const { result } = renderHook(() => useCanvas(workspaceId));

    const invalidProposal: AgentGenerationProposal = {
      ...generationProposal,
      actions: [
        generationProposal.actions[0],
        {
          type: 'create-connector',
          description: 'Reference a missing target',
          connector: {
            id: 'broken-connector',
            type: 'arrow',
            sourceId: 'generated-node-1',
            targetId: 'missing-node',
            start: { x: 260, y: 136 },
            end: { x: 340, y: 132 },
          },
        },
      ],
    };

    let applyResult:
      | ReturnType<typeof result.current.applyGeneratedDiagram>
      | undefined;

    act(() => {
      applyResult = result.current.applyGeneratedDiagram(invalidProposal);
    });

    expect(applyResult).toEqual({
      success: false,
      error:
        'Generated connector "broken-connector" references unknown target "missing-node".',
      appliedShapeIds: [],
    });
    expect(result.current.shapes).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
  });
});
