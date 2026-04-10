import type { Workspace } from '../stores/workspaceStore';
import type { EditorState, Shape, TextShape } from '../types';
import type {
  AgentContextScope,
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
