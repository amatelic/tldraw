import { describe, expect, it } from 'vitest';
import {
  AgentOrchestrator,
  buildAgentContext,
  validateAgentProposal,
  validateGenerationProposalForCanvas,
} from './agentOrchestrator';
import type { Shape } from '../types';
import type { AgentGenerationProposal, AgentProvider } from '../types/agents';

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
  {
    id: 'shape-b',
    type: 'text',
    bounds: { x: 30, y: 30, width: 120, height: 24 },
    text: 'Launch notes',
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    style: {
      color: '#222222',
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
  {
    id: 'shape-c',
    type: 'circle',
    bounds: { x: 900, y: 900, width: 80, height: 80 },
    center: { x: 940, y: 940 },
    radius: 40,
    style: {
      color: '#333333',
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

describe('buildAgentContext', () => {
  it('should package only the current selection when selection scope is used', () => {
    const context = buildAgentContext({
      workflow: 'review',
      prompt: '',
      scope: 'selection',
      workspace: { id: 'workspace-1', name: 'Workspace 1' },
      shapes: baseShapes,
      editorState: {
        camera: { x: 0, y: 0, zoom: 1 },
        selectedShapeIds: ['shape-b'],
      },
      viewport: { width: 500, height: 400 },
    });

    expect(context.shapeCount).toBe(1);
    expect(context.selectedShapeIds).toEqual(['shape-b']);
    expect(context.shapes.map((shape) => shape.id)).toEqual(['shape-b']);
    expect(context.textShapes.map((shape) => shape.id)).toEqual(['shape-b']);
  });

  it('should package only visible shapes when visible-board scope is used', () => {
    const context = buildAgentContext({
      workflow: 'review',
      prompt: '',
      scope: 'visible-board',
      workspace: { id: 'workspace-1', name: 'Workspace 1' },
      shapes: baseShapes,
      editorState: {
        camera: { x: 0, y: 0, zoom: 1 },
        selectedShapeIds: [],
      },
      viewport: { width: 500, height: 400 },
    });

    expect(context.shapes.map((shape) => shape.id)).toEqual(['shape-a', 'shape-b']);
  });
});

describe('validateAgentProposal', () => {
  const request = {
    workflow: 'review' as const,
    prompt: '',
    context: buildAgentContext({
      workflow: 'review',
      prompt: '',
      scope: 'full-board',
      workspace: { id: 'workspace-1', name: 'Workspace 1' },
      shapes: baseShapes,
      editorState: {
        camera: { x: 0, y: 0, zoom: 1 },
        selectedShapeIds: ['shape-b'],
      },
    }),
  };

  it('should reject review findings that target missing shapes', () => {
    const result = validateAgentProposal(
      {
        kind: 'review',
        workflow: 'review',
        summary: 'Invalid',
        findings: [
          {
            id: 'finding-1',
            category: 'clarity',
            severity: 'medium',
            title: 'Broken reference',
            detail: 'This shape does not exist.',
            targetIds: ['missing-shape'],
          },
        ],
      },
      request
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('unknown shape');
  });

  it('should reject text mutations on non-text shapes', () => {
    const result = validateAgentProposal(
      {
        kind: 'mutation',
        workflow: 'cleanup',
        summary: 'Invalid cleanup',
        actions: [
          {
            type: 'update-shape',
            targetId: 'shape-a',
            description: 'Attempt to write text onto a rectangle',
            changes: {
              text: 'Nope',
            },
          },
        ],
      },
      {
        ...request,
        workflow: 'cleanup',
      }
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Only text shapes can receive text updates');
  });

  it('should validate a diagram generation proposal with create actions and a presentation brief', () => {
    const result = validateAgentProposal(
      {
        kind: 'generation',
        workflow: 'generate-diagram',
        summary: 'Drafted a lightweight architecture diagram.',
        confidence: 'medium',
        sections: [
          {
            id: 'section-1',
            title: 'Core Flow',
            summary: 'Main request path.',
            shapeIds: ['generated-service'],
          },
        ],
        actions: [
          {
            type: 'create-shape',
            description: 'Create the service node',
            shape: {
              id: 'generated-service',
              type: 'rectangle',
              bounds: { x: 200, y: 100, width: 180, height: 80 },
              text: 'Service',
            },
          },
          {
            type: 'create-connector',
            description: 'Connect the existing client to the service',
            connector: {
              id: 'generated-connector',
              type: 'arrow',
              sourceId: 'shape-a',
              targetId: 'generated-service',
              start: { x: 110, y: 50 },
              end: { x: 200, y: 140 },
            },
          },
        ],
        presentationBrief: {
          title: 'Architecture overview',
          objective: 'Explain the main request path.',
          audience: 'Engineering',
          summary: 'Walk through the client, service, and follow-up actions.',
          narrativeSteps: ['Start with the client entry point.'],
          speakerNotes: ['Keep the explanation high level.'],
          assumptions: ['The service handles authentication upstream.'],
          openQuestions: ['Do we need to show monitoring explicitly?'],
        },
        warnings: [],
      } satisfies AgentGenerationProposal,
      {
        ...request,
        workflow: 'generate-diagram',
      }
    );

    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('should reject generated connectors that reference unknown shapes', () => {
    const result = validateAgentProposal(
      {
        kind: 'generation',
        workflow: 'generate-diagram',
        summary: 'Invalid diagram',
        confidence: 'medium',
        sections: [],
        actions: [
          {
            type: 'create-connector',
            description: 'Create a broken connector',
            connector: {
              id: 'generated-connector',
              type: 'arrow',
              sourceId: 'shape-a',
              targetId: 'missing-shape',
              start: { x: 10, y: 10 },
              end: { x: 50, y: 50 },
            },
          },
        ],
        presentationBrief: {
          title: 'Architecture overview',
          objective: 'Explain the main request path.',
          audience: 'Engineering',
          summary: 'Walk through the flow.',
          narrativeSteps: ['Start with the client entry point.'],
          speakerNotes: ['Keep the explanation high level.'],
          assumptions: ['This is a first draft.'],
          openQuestions: ['What should be expanded later?'],
        },
        warnings: [],
      } satisfies AgentGenerationProposal,
      {
        ...request,
        workflow: 'generate-diagram',
      }
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('unknown target');
  });

  it('should validate generation proposals before they are applied to the canvas', () => {
    const result = validateGenerationProposalForCanvas(
      {
        kind: 'generation',
        workflow: 'generate-diagram',
        summary: 'Drafted a lightweight architecture diagram.',
        confidence: 'medium',
        sections: [
          {
            id: 'section-1',
            title: 'Core Flow',
            summary: 'Main request path.',
            shapeIds: ['generated-service'],
          },
        ],
        actions: [
          {
            type: 'create-shape',
            description: 'Create the service node',
            shape: {
              id: 'generated-service',
              type: 'rectangle',
              bounds: { x: 200, y: 100, width: 180, height: 80 },
            },
          },
        ],
        presentationBrief: {
          title: 'Architecture overview',
          objective: 'Explain the main request path.',
          audience: 'Engineering',
          summary: 'Walk through the client, service, and follow-up actions.',
          narrativeSteps: ['Start with the client entry point.'],
          speakerNotes: ['Keep the explanation high level.'],
          assumptions: ['The service handles authentication upstream.'],
          openQuestions: ['Do we need to show monitoring explicitly?'],
        },
        warnings: [],
      },
      baseShapes.map((shape) => shape.id)
    );

    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('should reject invalid generation proposals before canvas apply starts', () => {
    const result = validateGenerationProposalForCanvas(
      {
        kind: 'generation',
        workflow: 'generate-diagram',
        summary: 'Invalid diagram',
        confidence: 'medium',
        sections: [],
        actions: [
          {
            type: 'create-connector',
            description: 'Create a broken connector',
            connector: {
              id: 'generated-connector',
              type: 'arrow',
              sourceId: 'shape-a',
              targetId: 'missing-shape',
              start: { x: 10, y: 10 },
              end: { x: 50, y: 50 },
            },
          },
        ],
        presentationBrief: {
          title: 'Architecture overview',
          objective: 'Explain the main request path.',
          audience: 'Engineering',
          summary: 'Walk through the flow.',
          narrativeSteps: ['Start with the client entry point.'],
          speakerNotes: ['Keep the explanation high level.'],
          assumptions: ['This is a first draft.'],
          openQuestions: ['What should be expanded later?'],
        },
        warnings: [],
      },
      baseShapes.map((shape) => shape.id)
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('unknown target');
  });
});

describe('AgentOrchestrator', () => {
  it('should reject runs for unsupported workflows', async () => {
    const reviewOnlyProvider: AgentProvider = {
      id: 'review-provider',
      workflow: 'review',
      async generate(request) {
        return {
          kind: 'review',
          workflow: request.workflow,
          summary: 'ok',
          findings: [],
        };
      },
    };

    const orchestrator = new AgentOrchestrator([reviewOnlyProvider]);

    await expect(
      orchestrator.run({
        workflow: 'cleanup',
        prompt: '',
        scope: 'full-board',
        workspace: { id: 'workspace-1', name: 'Workspace 1' },
        shapes: baseShapes,
        editorState: {
          camera: { x: 0, y: 0, zoom: 1 },
          selectedShapeIds: [],
        },
      })
    ).rejects.toThrow('not available yet');
  });
});
