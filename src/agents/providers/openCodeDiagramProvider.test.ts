import { describe, expect, it, vi } from 'vitest';
import { MockOpenCodeTransport, OpenCodeClient } from '../openCodeClient';
import { buildAgentRequest, AgentOrchestrator } from '../agentOrchestrator';
import { OpenCodeDiagramProvider } from './openCodeDiagramProvider';
import type { OpenCodeTransport } from '../openCodeClient';
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

const baseShapes: Shape[] = [
  {
    id: 'shape-a',
    type: 'rectangle',
    bounds: { x: 10, y: 10, width: 120, height: 80 },
    style: shapeStyle,
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

function createProviderWithMockTransport() {
  return new OpenCodeDiagramProvider({
    client: new OpenCodeClient({
      transport: new MockOpenCodeTransport(),
      fallbackTransport: null,
    }),
  });
}

describe('OpenCodeDiagramProvider', () => {
  it('should send structured request data through the OpenCode client', async () => {
    const transport: OpenCodeTransport = {
      send: vi.fn().mockResolvedValue({
        workflow: 'generate-diagram',
        summary: 'Drafted a simple diagram.',
        confidence: 'medium',
        sections: [
          {
            id: 'section-1',
            title: 'Main Flow',
            summary: 'Primary flow.',
            shapeIds: ['generated-node'],
          },
        ],
        shapes: [
          {
            id: 'generated-node',
            type: 'rectangle',
            bounds: { x: 100, y: 100, width: 180, height: 80 },
            text: 'Generated node',
          },
        ],
        connectors: [],
        presentationBrief: {
          title: 'Diagram',
          objective: 'Explain the flow.',
          audience: 'Engineering',
          summary: 'Walk through the main steps.',
          narrativeSteps: ['Start with the first node.'],
          speakerNotes: ['Keep it concise.'],
          assumptions: ['This is a first draft.'],
          openQuestions: ['Should we add failure states?'],
        },
      }),
    };

    const provider = new OpenCodeDiagramProvider({
      client: new OpenCodeClient({
        transport,
        fallbackTransport: null,
      }),
    });

    const request = buildGenerateDiagramRequest('Create a process flow for launching a new feature.');
    const proposal = await provider.generate(request);

    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'generate-diagram',
        prompt: request.prompt,
        context: expect.objectContaining({
          workspaceId: 'workspace-1',
          shapeCount: 1,
        }),
      })
    );
    expect(proposal.workflow).toBe('generate-diagram');
    expect(proposal.actions).toHaveLength(1);
  });

  it('should keep the messaging-app backend example stable for provider-level regression coverage', async () => {
    const provider = createProviderWithMockTransport();

    const proposal = await provider.generate(
      buildGenerateDiagramRequest('Create a backend architecture for a messaging app.')
    );

    expect(proposal.summary).toContain('backend architecture for a messaging app');
    expect(proposal.sections.map((section) => section.title)).toEqual([
      'Clients',
      'Core Services',
      'Data & Delivery',
    ]);
    expect(proposal.actions.filter((action) => action.type === 'create-shape')).toHaveLength(7);
    expect(proposal.actions.filter((action) => action.type === 'create-connector')).toHaveLength(6);
    expect(proposal.presentationBrief.title).toBe('Messaging App Backend Architecture');
    expect(proposal.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'warning-realtime' })])
    );
  });

  it('should keep the storytelling storyboard example stable for provider-level regression coverage', async () => {
    const provider = createProviderWithMockTransport();

    const proposal = await provider.generate(
      buildGenerateDiagramRequest('Create a storyboard for how to learn storytelling.')
    );

    expect(proposal.summary).toContain('storyboard');
    expect(proposal.sections.map((section) => section.title)).toEqual([
      'Foundations',
      'Practice',
      'Delivery',
    ]);
    expect(proposal.actions.filter((action) => action.type === 'create-shape')).toHaveLength(6);
    expect(proposal.actions.filter((action) => action.type === 'create-connector')).toHaveLength(5);
    expect(proposal.presentationBrief.title).toBe('Storyboard for Learning Storytelling');
    expect(proposal.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'warning-depth' })])
    );
  });

  it('should surface low-confidence responses as warnings instead of silent success', async () => {
    const transport: OpenCodeTransport = {
      send: vi.fn().mockResolvedValue({
        workflow: 'generate-diagram',
        summary: 'Drafted a lightweight diagram.',
        confidence: 'low',
        sections: [],
        shapes: [],
        connectors: [],
        presentationBrief: {
          title: 'Diagram',
          objective: 'Explain the flow.',
          audience: 'Team',
          summary: 'A light draft.',
          narrativeSteps: ['Start with the goal.'],
          speakerNotes: ['Mention this is provisional.'],
          assumptions: ['The scope is intentionally narrow.'],
          openQuestions: ['What should be expanded?'],
        },
        warnings: [],
      }),
    };

    const provider = new OpenCodeDiagramProvider({
      client: new OpenCodeClient({
        transport,
        fallbackTransport: null,
      }),
    });

    const proposal = await provider.generate(buildGenerateDiagramRequest('Create a lightweight concept map.'));

    expect(proposal.warnings.map((warning) => warning.id)).toContain('warning-low-confidence');
    expect(proposal.warnings.map((warning) => warning.id)).toContain('warning-empty-draft');
  });

  it('should be rejected by the orchestrator when the provider returns malformed connector references', async () => {
    const transport: OpenCodeTransport = {
      send: vi.fn().mockResolvedValue({
        workflow: 'generate-diagram',
        summary: 'Drafted a broken diagram.',
        confidence: 'medium',
        sections: [],
        shapes: [],
        connectors: [
          {
            id: 'connector-1',
            type: 'arrow',
            sourceId: 'shape-a',
            targetId: 'missing-shape',
            start: { x: 50, y: 50 },
            end: { x: 150, y: 150 },
          },
        ],
        presentationBrief: {
          title: 'Diagram',
          objective: 'Explain the flow.',
          audience: 'Engineering',
          summary: 'Walk through the main steps.',
          narrativeSteps: ['Start with the first node.'],
          speakerNotes: ['Keep it concise.'],
          assumptions: ['This is a first draft.'],
          openQuestions: ['Should we add failure states?'],
        },
      }),
    };

    const provider = new OpenCodeDiagramProvider({
      client: new OpenCodeClient({
        transport,
        fallbackTransport: null,
      }),
    });
    const orchestrator = new AgentOrchestrator([provider]);

    await expect(
      orchestrator.run({
        workflow: 'generate-diagram',
        prompt: 'Create a backend architecture for a messaging app.',
        scope: 'full-board',
        workspace: { id: 'workspace-1', name: 'Workspace 1' },
        shapes: baseShapes,
        editorState: {
          camera: { x: 0, y: 0, zoom: 1 },
          selectedShapeIds: [],
        },
      })
    ).rejects.toThrow('unknown target');
  });
});
