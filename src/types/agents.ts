import type { Bounds, CameraState, Point, Shape, ShapeStyle } from './index';

export type AgentWorkflowType = 'review' | 'cleanup' | 'rewrite-selection' | 'generate-diagram';

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
export type AgentConfidence = 'low' | 'medium' | 'high';
export type AgentGeneratedShapeType = 'rectangle' | 'circle' | 'text';
export type AgentGeneratedConnectorType = 'arrow' | 'line';

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

export interface AgentGenerationWarning {
  id: string;
  severity: AgentFindingSeverity;
  message: string;
}

export interface AgentDiagramSection {
  id: string;
  title: string;
  summary: string;
  shapeIds: string[];
}

export interface AgentPresentationBrief {
  title: string;
  objective: string;
  audience: string;
  summary: string;
  narrativeSteps: string[];
  speakerNotes: string[];
  assumptions: string[];
  openQuestions: string[];
}

export interface AgentGeneratedShape {
  id: string;
  type: AgentGeneratedShapeType;
  bounds: Bounds;
  style?: Partial<ShapeStyle>;
  text?: string;
}

export interface AgentGeneratedConnector {
  id: string;
  type: AgentGeneratedConnectorType;
  start: Point;
  end: Point;
  sourceId?: string;
  targetId?: string;
  style?: Partial<ShapeStyle>;
  label?: string | null;
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

export interface AgentCreateShapeAction {
  type: 'create-shape';
  description: string;
  shape: AgentGeneratedShape;
}

export interface AgentCreateConnectorAction {
  type: 'create-connector';
  description: string;
  connector: AgentGeneratedConnector;
}

export type AgentAction =
  | AgentUpdateShapeAction
  | AgentDeleteShapeAction
  | AgentCreateShapeAction
  | AgentCreateConnectorAction;

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
  actions: Array<AgentUpdateShapeAction | AgentDeleteShapeAction>;
}

export interface AgentGenerationProposal {
  kind: 'generation';
  workflow: 'generate-diagram';
  summary: string;
  confidence: AgentConfidence;
  sections: AgentDiagramSection[];
  actions: Array<AgentCreateShapeAction | AgentCreateConnectorAction>;
  presentationBrief: AgentPresentationBrief;
  warnings: AgentGenerationWarning[];
}

export type AgentProposal = AgentReviewProposal | AgentMutationProposal | AgentGenerationProposal;

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
