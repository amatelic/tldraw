import { describe, expect, it } from 'vitest';
import { buildAgentRequest } from '../agentOrchestrator';
import { CleanupSuggestionsProvider } from './cleanupSuggestionsProvider';
import type { Shape } from '../../types';

const shapeStyle = {
  color: '#111111',
  fillColor: '#ffffff',
  strokeWidth: 2,
  strokeStyle: 'solid' as const,
  fillStyle: 'none' as const,
  opacity: 1,
  blendMode: 'source-over' as const,
  shadows: [],
  fontSize: 16,
  fontFamily: 'sans-serif',
  fontWeight: 'normal' as const,
  fontStyle: 'normal' as const,
  textAlign: 'left' as const,
};

function createRectangleShape(
  id: string,
  bounds: Shape['bounds'],
  styleOverrides?: Partial<typeof shapeStyle>
): Shape {
  return {
    id,
    type: 'rectangle',
    bounds,
    style: {
      ...shapeStyle,
      ...styleOverrides,
    },
    createdAt: 1,
    updatedAt: 1,
  };
}

function createTextShape(id: string, text: string, x: number, y: number): Shape {
  return {
    id,
    type: 'text',
    bounds: { x, y, width: 180, height: 24 },
    text,
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    style: shapeStyle,
    createdAt: 1,
    updatedAt: 1,
  };
}

function buildCleanupRequest(shapes: Shape[]) {
  return buildAgentRequest({
    workflow: 'cleanup',
    prompt: 'Tighten the board before review.',
    scope: 'full-board',
    workspace: { id: 'workspace-1', name: 'Workspace 1' },
    shapes,
    editorState: {
      camera: { x: 0, y: 0, zoom: 1 },
      selectedShapeIds: [],
    },
    viewport: { width: 1200, height: 800 },
  });
}

describe('CleanupSuggestionsProvider', () => {
  it('should suggest low-risk cleanup actions for blank text and row/style inconsistencies', async () => {
    const provider = new CleanupSuggestionsProvider();
    const proposal = await provider.generate(
      buildCleanupRequest([
        createRectangleShape('shape-a', { x: 0, y: 100, width: 100, height: 80 }),
        createRectangleShape(
          'shape-b',
          { x: 150, y: 112, width: 100, height: 80 },
          { color: '#d62839', strokeWidth: 4 }
        ),
        createRectangleShape('shape-c', { x: 340, y: 100, width: 100, height: 80 }),
        createTextShape('shape-empty', '   ', 20, 240),
      ])
    );

    expect(proposal.workflow).toBe('cleanup');
    expect(proposal.summary).toContain('2 cleanup suggestions');
    expect(proposal.actions).toHaveLength(2);

    expect(proposal.actions.find((action) => action.type === 'delete-shape')).toMatchObject({
      targetId: 'shape-empty',
      description: expect.stringContaining('Delete the empty text block'),
    });

    expect(
      proposal.actions.find(
        (action): action is Extract<(typeof proposal.actions)[number], { type: 'update-shape' }> =>
          action.type === 'update-shape' && action.targetId === 'shape-b'
      )
    ).toMatchObject({
      targetId: 'shape-b',
      changes: {
        bounds: { x: 170, y: 100 },
        style: { color: '#111111', strokeWidth: 2 },
      },
    });
  });

  it('should return an empty cleanup proposal when the board already looks consistent', async () => {
    const provider = new CleanupSuggestionsProvider();
    const proposal = await provider.generate(
      buildCleanupRequest([
        createRectangleShape('shape-a', { x: 0, y: 100, width: 100, height: 80 }),
        createRectangleShape('shape-b', { x: 140, y: 100, width: 100, height: 80 }),
        createRectangleShape('shape-c', { x: 280, y: 100, width: 100, height: 80 }),
        createTextShape('shape-note', 'Explain the handoff', 20, 240),
      ])
    );

    expect(proposal.actions).toEqual([]);
    expect(proposal.summary).toContain('No obvious low-risk cleanup suggestions');
  });
});
