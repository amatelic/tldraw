import { describe, expect, it } from 'vitest';
import { AgentOrchestrator, buildAgentContext, validateAgentProposal } from './agentOrchestrator';
import type { Shape } from '../types';
import type { AgentProvider } from '../types/agents';

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
