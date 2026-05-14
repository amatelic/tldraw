import type { Shape } from '../../types';
import type {
  AgentContextScope,
  AgentGenerationProposal,
  AgentLifecycleState,
  AgentMutationProposal,
  AgentReviewFinding,
  AgentReviewFindingCategory,
  AgentWorkflowType,
} from '../../types/agents';
import type {
  AgentCleanupPreviewState,
  AgentGenerationPreviewState,
  AgentRewritePreviewState,
  DiagramExample,
  DiagramPreset,
  DiagramPresetOption,
} from './types';

export const WORKFLOW_OPTIONS: Array<{ value: AgentWorkflowType; label: string }> = [
  { value: 'review', label: 'Review Mode' },
  { value: 'cleanup', label: 'Cleanup Suggestions' },
  { value: 'rewrite-selection', label: 'Selection Rewrite' },
  { value: 'generate-diagram', label: 'Diagram Generator' },
];

export const SCOPE_OPTIONS: Array<{ value: AgentContextScope; label: string }> = [
  { value: 'selection', label: 'Selection' },
  { value: 'visible-board', label: 'Visible board' },
  { value: 'full-board', label: 'Full board' },
];

export const REVIEW_CATEGORY_LABELS: Record<AgentReviewFindingCategory, string> = {
  clarity: 'Clarity Issues',
  'missing-information': 'Missing Information',
  consistency: 'Consistency Issues',
  'suggested-next-edits': 'Suggested Next Edits',
};

export const STATUS_LABELS: Record<AgentLifecycleState, string> = {
  idle: 'Idle',
  'collecting-context': 'Collecting context',
  generating: 'Generating',
  'preview-ready': 'Preview ready',
  failed: 'Failed',
};

export const DIAGRAM_PRESETS: DiagramPresetOption[] = [
  {
    value: 'architecture',
    label: 'Architecture Diagram',
    summary: 'Services, storage, queues, and system boundaries.',
    examplePrompt: 'Create a backend architecture for a messaging app.',
  },
  {
    value: 'process-flow',
    label: 'Process Flow',
    summary: 'Sequential steps, decisions, and handoffs.',
    examplePrompt: 'Create a process flow for launching a new feature from kickoff to release.',
  },
  {
    value: 'storyboard',
    label: 'Storyboard',
    summary: 'Narrative frames or scenes that explain an idea over time.',
    examplePrompt: 'Create a storyboard for how to learn storytelling.',
  },
  {
    value: 'learning-journey',
    label: 'Learning Journey',
    summary: 'Progressive stages, milestones, and feedback loops.',
    examplePrompt: 'Create a learning journey for onboarding a new product designer.',
  },
];

export const DIAGRAM_EXAMPLES: DiagramExample[] = [
  {
    label: 'Messaging App Backend',
    preset: 'architecture',
    prompt: 'Create a backend architecture for a messaging app.',
    audience: 'Engineering and product stakeholders',
    goal: 'Explain the request, storage, and delivery path in one pass.',
  },
  {
    label: 'Storytelling Storyboard',
    preset: 'storyboard',
    prompt: 'Create a storyboard for how to learn storytelling.',
    audience: 'Learners or workshop attendees',
    goal: 'Turn the learning path into a simple presentation sequence.',
  },
];

export function isTextShape(shape: Shape): shape is Extract<Shape, { type: 'text' }> {
  return shape.type === 'text';
}

export function getDefaultScope(selectedShapeIds: string[]): AgentContextScope {
  return selectedShapeIds.length > 0 ? 'selection' : 'visible-board';
}

export function getScopeForWorkflow(
  workflow: AgentWorkflowType,
  selectedShapeIds: string[],
  scopeOverride: AgentContextScope | null
): AgentContextScope {
  if (workflow === 'generate-diagram') {
    return 'full-board';
  }

  if (workflow === 'rewrite-selection') {
    return 'selection';
  }

  return scopeOverride ?? getDefaultScope(selectedShapeIds);
}

export function getScopeDescription(scope: AgentContextScope, shapeCount: number): string {
  if (scope === 'selection') {
    return `Using your current selection (${shapeCount} shape${shapeCount === 1 ? '' : 's'}).`;
  }

  if (scope === 'visible-board') {
    return 'Using the part of the board that is currently visible on screen.';
  }

  return 'Using the full workspace, even if some content is outside the current viewport.';
}

export function getPromptPlaceholder(workflow: AgentWorkflowType, diagramPreset: DiagramPreset): string {
  if (workflow === 'rewrite-selection') {
    return 'Describe how to rewrite the selected text. Example: Shorten these labels for presentation slides.';
  }

  if (workflow === 'cleanup') {
    return 'Optional: focus cleanup on spacing, alignment, empty labels, or inconsistent styling.';
  }

  if (workflow !== 'generate-diagram') {
    return 'Optional: focus the review on clarity, structure, or another goal.';
  }

  const preset = DIAGRAM_PRESETS.find((option) => option.value === diagramPreset);
  return `Describe the work diagram you want to create. Example: ${preset?.examplePrompt ?? 'Create a simple architecture diagram.'}`;
}

export function buildPromptForWorkflow(
  workflow: AgentWorkflowType,
  prompt: string,
  diagramPreset: DiagramPreset,
  audience: string,
  presentationGoal: string
): string {
  if (workflow !== 'generate-diagram') {
    return prompt;
  }

  const presetLabel = DIAGRAM_PRESETS.find((option) => option.value === diagramPreset)?.label ?? 'Diagram';
  const sections = [
    `Diagram type: ${presetLabel}`,
    `Prompt: ${prompt.trim() || 'Create a simple work diagram.'}`,
  ];

  if (audience.trim()) {
    sections.push(`Audience: ${audience.trim()}`);
  }

  if (presentationGoal.trim()) {
    sections.push(`Presentation goal: ${presentationGoal.trim()}`);
  }

  return sections.join('\n');
}

export function getWorkflowScaffoldMessage(workflow: AgentWorkflowType): string | null {
  switch (workflow) {
    case 'cleanup':
      return 'Cleanup Suggestions proposes low-risk alignment, spacing, blank-text, and style fixes that you can preview before applying.';
    case 'generate-diagram':
      return 'Diagram Generator sends structured requests through the OpenCode-backed provider and opens a larger preview only after draft generation.';
    case 'review':
    case 'rewrite-selection':
    default:
      return null;
  }
}

export function groupFindings(
  findings: AgentReviewFinding[]
): Map<AgentReviewFindingCategory, AgentReviewFinding[]> {
  return findings.reduce((groups, finding) => {
    const nextGroup = groups.get(finding.category) ?? [];
    nextGroup.push(finding);
    groups.set(finding.category, nextGroup);
    return groups;
  }, new Map<AgentReviewFindingCategory, AgentReviewFinding[]>());
}

export function getGenerationCounts(proposal: AgentGenerationProposal): {
  shapes: number;
  connectors: number;
} {
  return proposal.actions.reduce(
    (counts, action) => {
      if (action.type === 'create-shape') {
        counts.shapes += 1;
      } else {
        counts.connectors += 1;
      }

      return counts;
    },
    { shapes: 0, connectors: 0 }
  );
}

export function getDiagramNodeLabel(
  action: Extract<AgentGenerationProposal['actions'][number], { type: 'create-shape' }>
): string {
  const text = action.shape.text?.trim();
  if (text) {
    return text;
  }

  return action.shape.id;
}

export function getConnectorLabel(
  action: Extract<AgentGenerationProposal['actions'][number], { type: 'create-connector' }>,
  nodeLabelLookup: Map<string, string>
): string {
  const label = action.connector.label?.trim();
  if (label) {
    return label;
  }

  const source = action.connector.sourceId
    ? nodeLabelLookup.get(action.connector.sourceId) ?? action.connector.sourceId
    : 'Start';
  const target = action.connector.targetId
    ? nodeLabelLookup.get(action.connector.targetId) ?? action.connector.targetId
    : 'End';

  return `${source} -> ${target}`;
}

export function buildGenerationPreview(
  proposal: AgentGenerationProposal
): AgentGenerationPreviewState {
  const counts = getGenerationCounts(proposal);
  const nodeActions = proposal.actions.filter(
    (action): action is Extract<AgentGenerationProposal['actions'][number], { type: 'create-shape' }> =>
      action.type === 'create-shape'
  );
  const connectorActions = proposal.actions.filter(
    (action): action is Extract<AgentGenerationProposal['actions'][number], { type: 'create-connector' }> =>
      action.type === 'create-connector'
  );
  const nodeLabelLookup = new Map(nodeActions.map((action) => [action.shape.id, getDiagramNodeLabel(action)]));

  return {
    counts,
    nodeActions,
    connectorActions,
    nodeLabelLookup,
  };
}

export function getShapePreviewLabel(shape: Shape | undefined, targetId: string): string {
  if (shape?.type === 'text') {
    const text = shape.text.trim();
    return text || 'Untitled text block';
  }

  if (shape) {
    return `${shape.type} ${shape.id}`;
  }

  return targetId;
}

export function getCleanupFieldLabels(
  action: Extract<AgentMutationProposal['actions'][number], { type: 'update-shape' }>
): string[] {
  const labels: string[] = [];

  if (action.changes.bounds?.x !== undefined || action.changes.bounds?.y !== undefined) {
    labels.push('position');
  }

  if (action.changes.bounds?.width !== undefined || action.changes.bounds?.height !== undefined) {
    labels.push('size');
  }

  if (typeof action.changes.text === 'string') {
    labels.push('text');
  }

  if (action.changes.style) {
    const styleLabels: Array<[keyof Shape['style'], string]> = [
      ['color', 'stroke color'],
      ['fillColor', 'fill color'],
      ['strokeWidth', 'stroke width'],
      ['strokeStyle', 'stroke style'],
      ['fillStyle', 'fill style'],
      ['opacity', 'opacity'],
      ['fontSize', 'font size'],
      ['fontFamily', 'font family'],
      ['fontWeight', 'font weight'],
      ['fontStyle', 'font style'],
      ['textAlign', 'text align'],
      ['blendMode', 'blend mode'],
      ['shadows', 'shadows'],
    ];

    styleLabels.forEach(([key, label]) => {
      if (action.changes.style?.[key] !== undefined) {
        labels.push(label);
      }
    });
  }

  return [...new Set(labels)];
}

export function buildCleanupActionId(action: AgentMutationProposal['actions'][number], index: number): string {
  return `${action.type}:${action.targetId}:${index}`;
}

export function buildCleanupPreview(
  proposal: AgentMutationProposal,
  shapes: Shape[]
): AgentCleanupPreviewState {
  const shapeLookup = new Map(shapes.map((shape) => [shape.id, shape]));
  const items = proposal.actions.map((action, index) => {
    const targetShape = shapeLookup.get(action.targetId);
    const targetType: Shape['type'] | 'shape' = targetShape?.type ?? 'shape';
    const id = buildCleanupActionId(action, index);

    if (action.type === 'delete-shape') {
      return {
        id,
        action,
        targetLabel: getShapePreviewLabel(targetShape, action.targetId),
        targetType,
        fieldLabels: ['delete'],
        isDeletion: true,
      };
    }

    return {
      id,
      action,
      targetLabel: getShapePreviewLabel(targetShape, action.targetId),
      targetType,
      fieldLabels: getCleanupFieldLabels(action),
      isDeletion: false,
    };
  });

  return {
    items,
    hasDeletion: items.some((item) => item.isDeletion),
  };
}

export function buildRewritePreview(
  proposal: AgentMutationProposal,
  shapes: Shape[]
): AgentRewritePreviewState {
  const shapeLookup = new Map(shapes.map((shape) => [shape.id, shape]));
  const textChanges = proposal.actions
    .filter(
      (action): action is Extract<AgentMutationProposal['actions'][number], { type: 'update-shape' }> =>
        action.type === 'update-shape' && typeof action.changes.text === 'string'
    )
    .map((action) => {
      const targetShape = shapeLookup.get(action.targetId);
      const beforeText = targetShape && isTextShape(targetShape) ? targetShape.text : '';

      return {
        id: action.targetId,
        description: action.description,
        beforeText,
        afterText: action.changes.text ?? '',
      };
    });

  return {
    textChanges,
  };
}

export function buildMutationProposalSelection(
  proposal: AgentMutationProposal,
  selectedActionIds: Set<string>
): AgentMutationProposal {
  const actions = proposal.actions.filter((action, index) =>
    selectedActionIds.has(buildCleanupActionId(action, index))
  );

  if (actions.length === proposal.actions.length) {
    return proposal;
  }

  return {
    ...proposal,
    summary: `Prepared ${actions.length} selected cleanup suggestion${actions.length === 1 ? '' : 's'}.`,
    actions,
  };
}
