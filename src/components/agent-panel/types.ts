import type { AgentOrchestrator } from '../../agents/agentOrchestrator';
import type { EditorState, Shape } from '../../types';
import type {
  AgentGenerationProposal,
  AgentMutationProposal,
  AgentReviewFinding,
  AgentReviewFindingCategory,
  AgentViewport,
} from '../../types/agents';

export type DiagramPreset = 'architecture' | 'process-flow' | 'storyboard' | 'learning-journey';

export interface DiagramPresetOption {
  value: DiagramPreset;
  label: string;
  summary: string;
  examplePrompt: string;
}

export interface DiagramExample {
  label: string;
  preset: DiagramPreset;
  prompt: string;
  audience: string;
  goal: string;
}

export interface AgentPanelProps {
  isOpen: boolean;
  workspaceId: string;
  workspaceName: string;
  shapes: Shape[];
  editorState: Pick<EditorState, 'camera' | 'selectedShapeIds'>;
  viewport?: AgentViewport | null;
  orchestrator: AgentOrchestrator;
  onApplyGenerationProposal: (proposal: AgentGenerationProposal) => Promise<{
    success: boolean;
    error: string | null;
  }> | {
    success: boolean;
    error: string | null;
  };
  onApplyMutationProposal: (proposal: AgentMutationProposal) => Promise<{
    success: boolean;
    error: string | null;
  }> | {
    success: boolean;
    error: string | null;
  };
  onClose: () => void;
}

export interface AgentGenerationPreviewState {
  counts: {
    shapes: number;
    connectors: number;
  };
  nodeActions: Array<Extract<AgentGenerationProposal['actions'][number], { type: 'create-shape' }>>;
  connectorActions: Array<
    Extract<AgentGenerationProposal['actions'][number], { type: 'create-connector' }>
  >;
  nodeLabelLookup: Map<string, string>;
}

export interface AgentRewritePreviewState {
  textChanges: Array<{
    id: string;
    description: string;
    beforeText: string;
    afterText: string;
  }>;
}

export interface AgentCleanupPreviewItem {
  id: string;
  action: AgentMutationProposal['actions'][number];
  targetLabel: string;
  targetType: Shape['type'] | 'shape';
  fieldLabels: string[];
  isDeletion: boolean;
}

export interface AgentCleanupPreviewState {
  items: AgentCleanupPreviewItem[];
  hasDeletion: boolean;
}

export type AgentReviewFindingGroups = Map<
  AgentReviewFindingCategory,
  AgentReviewFinding[]
>;
