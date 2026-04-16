import type { Workspace } from '../stores/workspaceStore';
import type { EditorState, Shape, TextShape } from '../types';
import type {
  AgentAction,
  AgentContextScope,
  AgentGeneratedConnector,
  AgentGeneratedShape,
  AgentGenerationProposal,
  AgentProposal,
  AgentProposalValidationResult,
  AgentProvider,
  AgentRequest,
  AgentRunResult,
  AgentShapeSummary,
  AgentViewport,
  AgentWorkflowType,
  AgentWorkspaceContext,
} from '../types/agents';

const GENERATED_SHAPE_TYPES = new Set<AgentGeneratedShape['type']>(['rectangle', 'circle', 'text']);
const GENERATED_CONNECTOR_TYPES = new Set<AgentGeneratedConnector['type']>(['arrow', 'line']);

export interface AgentOrchestratorInput {
  workflow: AgentWorkflowType;
  prompt: string;
  scope: AgentContextScope;
  workspace: Pick<Workspace, 'id' | 'name'>;
  shapes: Shape[];
  editorState: Pick<EditorState, 'camera' | 'selectedShapeIds'>;
  viewport?: AgentViewport | null;
}

function isTextShape(shape: Shape): shape is TextShape {
  return shape.type === 'text';
}

function isShapeVisible(
  shape: Shape,
  camera: EditorState['camera'],
  viewport: AgentViewport | null | undefined
): boolean {
  if (!viewport) return true;

  const left = (0 - camera.x) / camera.zoom;
  const top = (0 - camera.y) / camera.zoom;
  const right = (viewport.width - camera.x) / camera.zoom;
  const bottom = (viewport.height - camera.y) / camera.zoom;

  const shapeRight = shape.bounds.x + shape.bounds.width;
  const shapeBottom = shape.bounds.y + shape.bounds.height;

  return !(
    shapeRight < left ||
    shape.bounds.x > right ||
    shapeBottom < top ||
    shape.bounds.y > bottom
  );
}

export function summarizeShape(shape: Shape): AgentShapeSummary {
  return {
    id: shape.id,
    type: shape.type,
    bounds: { ...shape.bounds },
    style: { ...shape.style },
    text: isTextShape(shape) ? shape.text : null,
  };
}

export function getScopedShapes(
  shapes: Shape[],
  selectedShapeIds: string[],
  scope: AgentContextScope,
  camera: EditorState['camera'],
  viewport?: AgentViewport | null
): Shape[] {
  switch (scope) {
    case 'selection':
      return shapes.filter((shape) => selectedShapeIds.includes(shape.id));
    case 'visible-board':
      return shapes.filter((shape) => isShapeVisible(shape, camera, viewport));
    case 'full-board':
    default:
      return [...shapes];
  }
}

export function buildAgentContext(input: AgentOrchestratorInput): AgentWorkspaceContext {
  const scopedShapes = getScopedShapes(
    input.shapes,
    input.editorState.selectedShapeIds,
    input.scope,
    input.editorState.camera,
    input.viewport
  );
  const scopedShapeIds = new Set(scopedShapes.map((shape) => shape.id));
  const selectedShapeIds = input.editorState.selectedShapeIds.filter((id) => scopedShapeIds.has(id));
  const shapeSummaries = scopedShapes.map(summarizeShape);

  return {
    workspaceId: input.workspace.id,
    workspaceName: input.workspace.name,
    scope: input.scope,
    camera: { ...input.editorState.camera },
    viewport: input.viewport ? { ...input.viewport } : null,
    selectedShapeIds,
    shapeCount: shapeSummaries.length,
    shapes: shapeSummaries,
    textShapes: shapeSummaries.filter((shape) => shape.type === 'text'),
  };
}

export function buildAgentRequest(input: AgentOrchestratorInput): AgentRequest {
  return {
    workflow: input.workflow,
    prompt: input.prompt.trim(),
    context: buildAgentContext(input),
  };
}

export function validateAgentProposal(
  proposal: AgentProposal,
  request: AgentRequest
): AgentProposalValidationResult {
  const shapeLookup = new Map(request.context.shapes.map((shape) => [shape.id, shape]));

  if (proposal.workflow !== request.workflow) {
    return {
      isValid: false,
      error: `Expected a ${request.workflow} proposal but received ${proposal.workflow}.`,
    };
  }

  if (proposal.kind === 'review') {
    for (const finding of proposal.findings) {
      for (const targetId of finding.targetIds) {
        if (!shapeLookup.has(targetId)) {
          return {
            isValid: false,
            error: `Review finding references unknown shape "${targetId}".`,
          };
        }
      }
    }

    return { isValid: true, error: null };
  }

  if (proposal.kind === 'generation') {
    return validateGenerationProposal(proposal, shapeLookup);
  }

  for (const action of proposal.actions) {
    const targetShape = shapeLookup.get(action.targetId);
    if (!targetShape) {
      return {
        isValid: false,
        error: `Mutation action references unknown shape "${action.targetId}".`,
      };
    }

    if (action.type === 'update-shape' && typeof action.changes.text === 'string') {
      if (targetShape.type !== 'text') {
        return {
          isValid: false,
          error: `Only text shapes can receive text updates. Invalid target "${action.targetId}".`,
        };
      }
    }
  }

  return { isValid: true, error: null };
}

function isFinitePoint(point: AgentGeneratedConnector['start']): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function isValidGeneratedShape(shape: AgentGeneratedShape): boolean {
  return (
    GENERATED_SHAPE_TYPES.has(shape.type) &&
    Number.isFinite(shape.bounds.x) &&
    Number.isFinite(shape.bounds.y) &&
    Number.isFinite(shape.bounds.width) &&
    Number.isFinite(shape.bounds.height) &&
    shape.bounds.width >= 0 &&
    shape.bounds.height >= 0
  );
}

function isNonEmptyText(value: string): boolean {
  return value.trim().length > 0;
}

function validateGenerationActions(
  actions: AgentGenerationProposal['actions'],
  existingShapeIds: Set<string>
): AgentProposalValidationResult {
  const knownShapeIds = new Set(existingShapeIds);
  const knownConnectorIds = new Set<string>();

  for (const action of actions) {
    if (!isNonEmptyText(action.description)) {
      return {
        isValid: false,
        error: 'Generation actions must include a non-empty description.',
      };
    }

    if (action.type === 'create-shape') {
      if (!isValidGeneratedShape(action.shape)) {
        return {
          isValid: false,
          error: `Generated shape "${action.shape.id}" is invalid or unsupported.`,
        };
      }

      if (knownShapeIds.has(action.shape.id) || knownConnectorIds.has(action.shape.id)) {
        return {
          isValid: false,
          error: `Generated shape id "${action.shape.id}" is duplicated.`,
        };
      }

      if (action.shape.type === 'text' && !isNonEmptyText(action.shape.text ?? '')) {
        return {
          isValid: false,
          error: `Generated text shape "${action.shape.id}" must include text.`,
        };
      }

      knownShapeIds.add(action.shape.id);
      continue;
    }

    if (!GENERATED_CONNECTOR_TYPES.has(action.connector.type)) {
      return {
        isValid: false,
        error: `Generated connector "${action.connector.id}" uses an unsupported type.`,
      };
    }

    if (knownShapeIds.has(action.connector.id) || knownConnectorIds.has(action.connector.id)) {
      return {
        isValid: false,
        error: `Generated connector id "${action.connector.id}" is duplicated.`,
      };
    }

    if (!isFinitePoint(action.connector.start) || !isFinitePoint(action.connector.end)) {
      return {
        isValid: false,
        error: `Generated connector "${action.connector.id}" includes invalid points.`,
      };
    }

    if (action.connector.sourceId && !knownShapeIds.has(action.connector.sourceId)) {
      return {
        isValid: false,
        error: `Generated connector "${action.connector.id}" references unknown source "${action.connector.sourceId}".`,
      };
    }

    if (action.connector.targetId && !knownShapeIds.has(action.connector.targetId)) {
      return {
        isValid: false,
        error: `Generated connector "${action.connector.id}" references unknown target "${action.connector.targetId}".`,
      };
    }

    knownConnectorIds.add(action.connector.id);
  }

  return { isValid: true, error: null };
}

function validatePresentationBrief(proposal: AgentGenerationProposal): AgentProposalValidationResult {
  const { presentationBrief } = proposal;
  const listFields: Array<[string, string[]]> = [
    ['narrative steps', presentationBrief.narrativeSteps],
    ['speaker notes', presentationBrief.speakerNotes],
    ['assumptions', presentationBrief.assumptions],
    ['open questions', presentationBrief.openQuestions],
  ];

  const requiredFields: Array<[string, string]> = [
    ['title', presentationBrief.title],
    ['objective', presentationBrief.objective],
    ['audience', presentationBrief.audience],
    ['summary', presentationBrief.summary],
  ];

  for (const [label, value] of requiredFields) {
    if (!isNonEmptyText(value)) {
      return {
        isValid: false,
        error: `Presentation brief is missing a ${label}.`,
      };
    }
  }

  for (const [label, values] of listFields) {
    if (values.length === 0 || values.some((value) => !isNonEmptyText(value))) {
      return {
        isValid: false,
        error: `Presentation brief must include non-empty ${label}.`,
      };
    }
  }

  return { isValid: true, error: null };
}

function validateGenerationSections(
  proposal: AgentGenerationProposal,
  availableShapeIds: Set<string>
): AgentProposalValidationResult {
  const seenSectionIds = new Set<string>();

  for (const section of proposal.sections) {
    if (!isNonEmptyText(section.id) || seenSectionIds.has(section.id)) {
      return {
        isValid: false,
        error: 'Diagram sections must have unique ids.',
      };
    }

    if (!isNonEmptyText(section.title) || !isNonEmptyText(section.summary)) {
      return {
        isValid: false,
        error: `Diagram section "${section.id}" is missing a title or summary.`,
      };
    }

    for (const shapeId of section.shapeIds) {
      if (!availableShapeIds.has(shapeId)) {
        return {
          isValid: false,
          error: `Diagram section "${section.id}" references unknown shape "${shapeId}".`,
        };
      }
    }

    seenSectionIds.add(section.id);
  }

  return { isValid: true, error: null };
}

function getCreatedShapeIds(actions: AgentGenerationProposal['actions']): Set<string> {
  return new Set(
    actions
      .filter((action): action is Extract<AgentAction, { type: 'create-shape' }> => action.type === 'create-shape')
      .map((action) => action.shape.id)
  );
}

function validateGenerationProposal(
  proposal: AgentGenerationProposal,
  shapeLookup: Map<string, AgentShapeSummary>
): AgentProposalValidationResult {
  if (!isNonEmptyText(proposal.summary)) {
    return {
      isValid: false,
      error: 'Generation proposals must include a non-empty summary.',
    };
  }

  const actionValidation = validateGenerationActions(proposal.actions, new Set(shapeLookup.keys()));
  if (!actionValidation.isValid) {
    return actionValidation;
  }

  const presentationValidation = validatePresentationBrief(proposal);
  if (!presentationValidation.isValid) {
    return presentationValidation;
  }

  const availableShapeIds = new Set([...shapeLookup.keys(), ...getCreatedShapeIds(proposal.actions)]);
  return validateGenerationSections(proposal, availableShapeIds);
}

export class AgentOrchestrator {
  private readonly providers: Partial<Record<AgentWorkflowType, AgentProvider>>;

  public constructor(providers: AgentProvider[]) {
    this.providers = providers.reduce<Partial<Record<AgentWorkflowType, AgentProvider>>>(
      (registry, provider) => {
        registry[provider.workflow] = provider;
        return registry;
      },
      {}
    );
  }

  public async run(input: AgentOrchestratorInput): Promise<AgentRunResult> {
    const provider = this.providers[input.workflow];
    if (!provider) {
      throw new Error(`Workflow "${input.workflow}" is not available yet.`);
    }

    const request = buildAgentRequest(input);
    const proposal = await provider.generate(request);
    const validation = validateAgentProposal(proposal, request);

    if (!validation.isValid) {
      throw new Error(validation.error ?? 'The agent returned an invalid proposal.');
    }

    return {
      providerId: provider.id,
      request,
      proposal,
    };
  }
}
