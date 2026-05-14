import { describe, expect, it } from 'vitest';
import type { DocumentCommandState } from '../document/commands';
import { DEFAULT_STYLE } from '../types';
import type { AgentGenerationProposal, AgentMutationProposal } from '../types/agents';
import {
  applyGenerationProposalToDocumentState,
  applyMutationProposalToDocumentState,
} from './documentApplication';

function createState(shapes: DocumentCommandState['shapes'] = []): DocumentCommandState {
  return {
    shapes,
    editorState: {
      tool: 'select',
      selectedShapeIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
      isDragging: false,
      isDrawing: false,
      shapeStyle: { ...DEFAULT_STYLE },
      editingTextId: null,
    },
  };
}

describe('agent document application', () => {
  it('validates and applies generation proposals through the document command layer', () => {
    const proposal: AgentGenerationProposal = {
      kind: 'generation',
      workflow: 'generate-diagram',
      summary: 'Draft a lightweight flow.',
      confidence: 'high',
      sections: [
        {
          id: 'section-1',
          title: 'Flow',
          summary: 'Main flow',
          shapeIds: ['generated-node'],
        },
      ],
      actions: [
        {
          type: 'create-shape',
          description: 'Create the main node.',
          shape: {
            id: 'generated-node',
            type: 'rectangle',
            bounds: { x: 80, y: 60, width: 160, height: 72 },
            text: 'Service',
          },
        },
      ],
      presentationBrief: {
        title: 'Flow overview',
        objective: 'Explain the main node.',
        audience: 'Engineering',
        summary: 'Walk through the service node.',
        narrativeSteps: ['Start with the generated node.'],
        speakerNotes: ['Keep this short.'],
        assumptions: ['This is a simplified diagram.'],
        openQuestions: ['Should we show a caller?'],
      },
      warnings: [],
    };

    const result = applyGenerationProposalToDocumentState(createState(), proposal, 10);

    expect(result).toMatchObject({
      success: true,
      error: null,
      appliedShapeIds: ['generated-node', 'generated-node-label'],
    });
    expect(result.state?.shapes.map((shape) => shape.id)).toEqual([
      'generated-node',
      'generated-node-label',
    ]);
  });

  it('rejects invalid generation proposals before document commands run', () => {
    const proposal: AgentGenerationProposal = {
      kind: 'generation',
      workflow: 'generate-diagram',
      summary: 'Broken draft.',
      confidence: 'medium',
      sections: [],
      actions: [
        {
          type: 'create-connector',
          description: 'Reference a missing target.',
          connector: {
            id: 'generated-connector',
            type: 'arrow',
            sourceId: 'shape-a',
            targetId: 'missing-shape',
            start: { x: 10, y: 10 },
            end: { x: 60, y: 60 },
          },
        },
      ],
      presentationBrief: {
        title: 'Broken flow',
        objective: 'Show the invalid connector.',
        audience: 'Engineering',
        summary: 'This should fail validation.',
        narrativeSteps: ['Point at the missing target.'],
        speakerNotes: ['Validation should stop apply.'],
        assumptions: ['This is invalid on purpose.'],
        openQuestions: ['None'],
      },
      warnings: [],
    };

    const result = applyGenerationProposalToDocumentState(createState(), proposal, 10);

    expect(result).toEqual({
      success: false,
      error: 'Generated connector "generated-connector" references unknown source "shape-a".',
      appliedShapeIds: [],
      state: null,
    });
  });

  it('validates and applies mutation proposals outside useCanvas', () => {
    const proposal: AgentMutationProposal = {
      kind: 'mutation',
      workflow: 'rewrite-selection',
      summary: 'Rewrite the selected label.',
      actions: [
        {
          type: 'update-shape',
          targetId: 'text-1',
          description: 'Clarify the label.',
          changes: {
            text: 'Review Flow',
          },
        },
      ],
    };

    const result = applyMutationProposalToDocumentState(
      createState([
        {
          id: 'text-1',
          type: 'text',
          bounds: { x: 0, y: 0, width: 180, height: 24 },
          text: 'Review this flow',
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          style: { ...DEFAULT_STYLE },
          createdAt: 1,
          updatedAt: 1,
        },
      ]),
      proposal,
      20
    );

    expect(result).toMatchObject({
      success: true,
      error: null,
      appliedShapeIds: ['text-1'],
    });
    expect(result.state?.shapes[0]).toMatchObject({
      id: 'text-1',
      text: 'Review Flow',
    });
  });
});
