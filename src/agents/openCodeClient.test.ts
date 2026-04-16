import { describe, expect, it, vi } from 'vitest';
import { OpenCodeClient, MockOpenCodeTransport, normalizeOpenCodeDiagramResponse } from './openCodeClient';
import { buildAgentRequest } from './agentOrchestrator';
import type { OpenCodeTransport } from './openCodeClient';
import type { Shape } from '../types';

const baseShapes: Shape[] = [
  {
    id: 'shape-a',
    type: 'rectangle',
    bounds: { x: 10, y: 10, width: 100, height: 80 },
    style: {
      color: '#111111',
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
  },
];

function buildGenerateDiagramRequest(prompt: string) {
  return buildAgentRequest({
    workflow: 'generate-diagram',
    prompt,
    scope: 'full-board',
    workspace: { id: 'workspace-1', name: 'Workspace 1' },
    shapes: baseShapes,
    editorState: {
      camera: { x: 0, y: 0, zoom: 1 },
      selectedShapeIds: [],
    },
    viewport: { width: 1200, height: 800 },
  });
}

describe('normalizeOpenCodeDiagramResponse', () => {
  it('should convert a raw OpenCode response into a generation proposal', () => {
    const proposal = normalizeOpenCodeDiagramResponse({
      workflow: 'generate-diagram',
      summary: 'Drafted a flow.',
      confidence: 'high',
      sections: [
        {
          id: 'section-1',
          title: 'Main Flow',
          summary: 'Primary steps.',
          shapeIds: ['shape-generated'],
        },
      ],
      shapes: [
        {
          id: 'shape-generated',
          type: 'text',
          bounds: { x: 100, y: 100, width: 180, height: 32 },
          text: 'Start here',
        },
      ],
      connectors: [
        {
          id: 'connector-1',
          type: 'arrow',
          sourceId: 'shape-a',
          targetId: 'shape-generated',
          start: { x: 60, y: 50 },
          end: { x: 100, y: 116 },
        },
      ],
      presentationBrief: {
        title: 'Flow overview',
        objective: 'Explain the sequence.',
        audience: 'Design review',
        summary: 'Use the generated flow as the talk track.',
        narrativeSteps: ['Introduce the entry point.'],
        speakerNotes: ['Keep examples concrete.'],
        assumptions: ['This is a first draft.'],
        openQuestions: ['Should we add failure states?'],
      },
      warnings: [
        {
          id: 'warning-1',
          severity: 'low',
          message: 'This is a lightweight first draft.',
        },
      ],
    });

    expect(proposal.kind).toBe('generation');
    expect(proposal.actions).toHaveLength(2);
    expect(proposal.sections[0]?.shapeIds).toEqual(['shape-generated']);
    expect(proposal.presentationBrief.title).toBe('Flow overview');
    expect(proposal.warnings[0]?.message).toContain('first draft');
  });
});

describe('OpenCodeClient', () => {
  it('should fall back to the mock transport when the primary transport fails', async () => {
    const primaryTransport: OpenCodeTransport = {
      send: vi.fn().mockRejectedValue(new Error('Primary transport unavailable')),
    };

    const client = new OpenCodeClient({
      transport: primaryTransport,
      fallbackTransport: new MockOpenCodeTransport(),
    });

    const proposal = await client.request(buildGenerateDiagramRequest('Create a backend architecture for a messaging app.'));

    expect(primaryTransport.send).toHaveBeenCalledTimes(1);
    expect(proposal.workflow).toBe('generate-diagram');
    expect(proposal.actions.length).toBeGreaterThan(0);
    expect(proposal.presentationBrief.title).toContain('Messaging App');
  });

  it('should reject unsupported workflows before calling OpenCode', async () => {
    const transport: OpenCodeTransport = {
      send: vi.fn(),
    };

    const client = new OpenCodeClient({
      transport,
      fallbackTransport: null,
    });

    const request = buildAgentRequest({
      workflow: 'review',
      prompt: 'Review this board',
      scope: 'full-board',
      workspace: { id: 'workspace-1', name: 'Workspace 1' },
      shapes: baseShapes,
      editorState: {
        camera: { x: 0, y: 0, zoom: 1 },
        selectedShapeIds: [],
      },
      viewport: { width: 1200, height: 800 },
    });

    await expect(client.request(request)).rejects.toThrow('only supports "generate-diagram"');
    expect(transport.send).not.toHaveBeenCalled();
  });
});
