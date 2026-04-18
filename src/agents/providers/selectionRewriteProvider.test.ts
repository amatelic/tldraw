import { describe, expect, it } from 'vitest';
import { buildAgentRequest } from '../agentOrchestrator';
import { SelectionRewriteProvider } from './selectionRewriteProvider';
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

describe('SelectionRewriteProvider', () => {
  it('should rewrite only the selected text shapes', async () => {
    const provider = new SelectionRewriteProvider();
    const shapes: Shape[] = [
      {
        id: 'shape-1',
        type: 'text',
        bounds: { x: 0, y: 0, width: 200, height: 24 },
        text: 'Review this flow',
        fontSize: 16,
        fontFamily: 'sans-serif',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        style: shapeStyle,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'shape-2',
        type: 'text',
        bounds: { x: 0, y: 40, width: 200, height: 24 },
        text: 'Do not rewrite this',
        fontSize: 16,
        fontFamily: 'sans-serif',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        style: shapeStyle,
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const request = buildAgentRequest({
      workflow: 'rewrite-selection',
      prompt: 'Shorten these labels for presentation slides.',
      scope: 'selection',
      workspace: { id: 'workspace-1', name: 'Workspace 1' },
      shapes,
      editorState: {
        camera: { x: 0, y: 0, zoom: 1 },
        selectedShapeIds: ['shape-1'],
      },
    });

    const proposal = await provider.generate(request);

    expect(proposal.kind).toBe('mutation');
    expect(proposal.workflow).toBe('rewrite-selection');
    expect(proposal.actions).toEqual([
      {
        type: 'update-shape',
        targetId: 'shape-1',
        description: 'Rewrite "Review this flow" for clarity.',
        changes: {
          text: 'Review Flow',
        },
      },
    ]);
  });

  it('should reject requests that do not include selected text shapes', async () => {
    const provider = new SelectionRewriteProvider();
    const shapes: Shape[] = [
      {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 120, height: 80 },
        style: shapeStyle,
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const request = buildAgentRequest({
      workflow: 'rewrite-selection',
      prompt: 'Shorten these labels.',
      scope: 'selection',
      workspace: { id: 'workspace-1', name: 'Workspace 1' },
      shapes,
      editorState: {
        camera: { x: 0, y: 0, zoom: 1 },
        selectedShapeIds: ['shape-1'],
      },
    });

    await expect(provider.generate(request)).rejects.toThrow(
      'Selection Rewrite needs at least one selected text shape.'
    );
  });
});
