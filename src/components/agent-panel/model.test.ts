import { describe, expect, it } from 'vitest';
import type { Shape } from '../../types';
import type { AgentGenerationProposal, AgentMutationProposal } from '../../types/agents';
import {
  buildCleanupActionId,
  buildCleanupPreview,
  buildGenerationPreview,
  buildMutationProposalSelection,
  buildPromptForWorkflow,
  buildRewritePreview,
  getConnectorLabel,
  getScopeForWorkflow,
} from './model';

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

const shapes: Shape[] = [
  {
    id: 'text-1',
    type: 'text',
    bounds: { x: 0, y: 0, width: 120, height: 24 },
    text: 'Original label',
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
    id: 'empty-text',
    type: 'text',
    bounds: { x: 0, y: 40, width: 120, height: 24 },
    text: '   ',
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
    id: 'rect-1',
    type: 'rectangle',
    bounds: { x: 20, y: 80, width: 100, height: 80 },
    style: shapeStyle,
    createdAt: 1,
    updatedAt: 1,
  },
];

describe('agent panel model', () => {
  it('should lock generated diagrams and rewrites to their required scopes', () => {
    expect(getScopeForWorkflow('generate-diagram', ['text-1'], 'selection')).toBe('full-board');
    expect(getScopeForWorkflow('rewrite-selection', [], 'visible-board')).toBe('selection');
    expect(getScopeForWorkflow('review', ['text-1'], null)).toBe('selection');
    expect(getScopeForWorkflow('review', [], null)).toBe('visible-board');
  });

  it('should build a structured prompt for diagram generation', () => {
    expect(
      buildPromptForWorkflow(
        'generate-diagram',
        '  Map the launch flow.  ',
        'process-flow',
        'Product leadership',
        'Explain the release gates'
      )
    ).toBe(
      [
        'Diagram type: Process Flow',
        'Prompt: Map the launch flow.',
        'Audience: Product leadership',
        'Presentation goal: Explain the release gates',
      ].join('\n')
    );
  });

  it('should derive node, connector, and label previews for generated diagrams', () => {
    const proposal: AgentGenerationProposal = {
      kind: 'generation',
      workflow: 'generate-diagram',
      summary: 'Drafted a diagram.',
      confidence: 'medium',
      sections: [],
      actions: [
        {
          type: 'create-shape',
          description: 'Create API node',
          shape: {
            id: 'node-api',
            type: 'rectangle',
            bounds: { x: 0, y: 0, width: 180, height: 80 },
            text: 'API Gateway',
          },
        },
        {
          type: 'create-connector',
          description: 'Connect client to API',
          connector: {
            id: 'connector-1',
            type: 'arrow',
            sourceId: 'client',
            targetId: 'node-api',
            start: { x: 0, y: 0 },
            end: { x: 100, y: 100 },
          },
        },
      ],
      presentationBrief: {
        title: 'Launch flow',
        objective: 'Explain the path.',
        audience: 'Team',
        summary: 'Short summary.',
        narrativeSteps: [],
        speakerNotes: [],
        assumptions: [],
        openQuestions: [],
      },
      warnings: [],
    };

    const preview = buildGenerationPreview(proposal);

    expect(preview.counts).toEqual({ shapes: 1, connectors: 1 });
    expect(preview.nodeLabelLookup.get('node-api')).toBe('API Gateway');
    expect(getConnectorLabel(preview.connectorActions[0], preview.nodeLabelLookup)).toBe(
      'client -> API Gateway'
    );
  });

  it('should derive rewrite previews from current text shapes', () => {
    const proposal: AgentMutationProposal = {
      kind: 'mutation',
      workflow: 'rewrite-selection',
      summary: 'Prepared 1 rewrite.',
      actions: [
        {
          type: 'update-shape',
          targetId: 'text-1',
          description: 'Shorten the label.',
          changes: {
            text: 'Launch',
          },
        },
      ],
    };

    expect(buildRewritePreview(proposal, shapes)).toEqual({
      textChanges: [
        {
          id: 'text-1',
          description: 'Shorten the label.',
          beforeText: 'Original label',
          afterText: 'Launch',
        },
      ],
    });
  });

  it('should derive cleanup rows and selected mutation proposals', () => {
    const proposal: AgentMutationProposal = {
      kind: 'mutation',
      workflow: 'cleanup',
      summary: 'Prepared 2 cleanup suggestions.',
      actions: [
        {
          type: 'update-shape',
          targetId: 'rect-1',
          description: 'Align and normalize stroke width.',
          changes: {
            bounds: { x: 24 },
            style: { strokeWidth: 2 },
          },
        },
        {
          type: 'delete-shape',
          targetId: 'empty-text',
          description: 'Delete the empty text block.',
        },
      ],
    };

    const preview = buildCleanupPreview(proposal, shapes);
    const selected = buildMutationProposalSelection(
      proposal,
      new Set([buildCleanupActionId(proposal.actions[0], 0)])
    );

    expect(preview.items).toMatchObject([
      {
        targetLabel: 'rectangle rect-1',
        fieldLabels: ['position', 'stroke width'],
        isDeletion: false,
      },
      {
        targetLabel: 'Untitled text block',
        fieldLabels: ['delete'],
        isDeletion: true,
      },
    ]);
    expect(preview.hasDeletion).toBe(true);
    expect(selected.summary).toBe('Prepared 1 selected cleanup suggestion.');
    expect(selected.actions).toEqual([proposal.actions[0]]);
  });
});
