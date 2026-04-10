import type { Bounds, CameraState, Shape, ShapeStyle } from './index';

export type AgentWorkflowType = 'review' | 'cleanup' | 'rewrite-selection';

export type AgentContextScope = 'selection' | 'visible-board' | 'full-board';

export type AgentLifecycleState =
  | 'idle'
  | 'collecting-context'
  | 'generating'
  | 'preview-ready'
  | 'failed';

export type AgentReviewFindingCategory =
  | 'clarity'
  | 'missing-information'
  | 'consistency'
  | 'suggested-next-edits';

export type AgentFindingSeverity = 'low' | 'medium' | 'high';

export interface AgentViewport {
  width: number;
  height: number;
}

export interface AgentShapeSummary {
  id: string;
  type: Shape['type'];
  bounds: Bounds;
  style: ShapeStyle;
  text: string | null;
}

export interface AgentWorkspaceContext {
  workspaceId: string;
  workspaceName: string;
  scope: AgentContextScope;
  camera: CameraState;
  viewport: AgentViewport | null;
  selectedShapeIds: string[];
  shapeCount: number;
  shapes: AgentShapeSummary[];
  textShapes: AgentShapeSummary[];
}

export interface AgentRequest {
  workflow: AgentWorkflowType;
  prompt: string;
  context: AgentWorkspaceContext;
}

export interface AgentReviewFinding {
  id: string;
  category: AgentReviewFindingCategory;
  severity: AgentFindingSeverity;
  title: string;
  detail: string;
  targetIds: string[];
}

export interface AgentUpdateShapeAction {
  type: 'update-shape';
  targetId: string;
  description: string;
  changes: {
    bounds?: Partial<Bounds>;
    style?: Partial<ShapeStyle>;
    text?: string;
  };
}

export interface AgentDeleteShapeAction {
  type: 'delete-shape';
  targetId: string;
  description: string;
}

export type AgentAction = AgentUpdateShapeAction | AgentDeleteShapeAction;

export interface AgentReviewProposal {
  kind: 'review';
  workflow: 'review';
  summary: string;
  findings: AgentReviewFinding[];
}

export interface AgentMutationProposal {
  kind: 'mutation';
  workflow: Extract<AgentWorkflowType, 'cleanup' | 'rewrite-selection'>;
  summary: string;
  actions: AgentAction[];
}

export type AgentProposal = AgentReviewProposal | AgentMutationProposal;

export interface AgentProposalValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface AgentRunResult {
  providerId: string;
  request: AgentRequest;
  proposal: AgentProposal;
}

export interface AgentProvider {
  id: string;
  workflow: AgentWorkflowType;
  generate(request: AgentRequest): Promise<AgentProposal>;
}
