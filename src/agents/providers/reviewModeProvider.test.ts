import { describe, expect, it } from 'vitest';
import { ReviewModeProvider } from './reviewModeProvider';
import { buildAgentRequest } from '../agentOrchestrator';
import type { Shape } from '../../types';

const shapeStyle = {
  color: '#111111',
  fillColor: '#ffffff',
  strokeWidth: 2,
  strokeStyle: 'solid' as const,
  fillStyle: 'none' as const,
  opacity: 1,
  fontSize: 16,
  fontFamily: 'sans-serif',
  fontWeight: 'normal' as const,
  fontStyle: 'normal' as const,
  textAlign: 'left' as const,
};

describe('ReviewModeProvider', () => {
  it('should return a missing-information finding when the board has shapes but no text', async () => {
    const provider = new ReviewModeProvider();
    const shapes: Shape[] = [
      {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        style: shapeStyle,
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const request = buildAgentRequest({
      workflow: 'review',
      prompt: '',
      scope: 'full-board',
      workspace: { id: 'workspace-1', name: 'Workspace 1' },
      shapes,
      editorState: {
        camera: { x: 0, y: 0, zoom: 1 },
        selectedShapeIds: [],
      },
    });

    const proposal = await provider.generate(request);

    expect(proposal.kind).toBe('review');
    expect(proposal.findings.some((finding) => finding.category === 'missing-information')).toBe(
      true
    );
  });

  it('should return an empty state summary when nothing obvious is wrong', async () => {
    const provider = new ReviewModeProvider();
    const shapes: Shape[] = [
      {
        id: 'shape-1',
        type: 'text',
        bounds: { x: 0, y: 0, width: 120, height: 24 },
        text: 'Ship checklist',
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
      workflow: 'review',
      prompt: '',
      scope: 'selection',
      workspace: { id: 'workspace-1', name: 'Workspace 1' },
      shapes,
      editorState: {
        camera: { x: 0, y: 0, zoom: 1 },
        selectedShapeIds: ['shape-1'],
      },
    });

    const proposal = await provider.generate(request);

    expect(proposal.findings).toHaveLength(0);
    expect(proposal.summary).toContain('No obvious issues found');
  });
});
