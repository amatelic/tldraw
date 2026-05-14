import type { DocumentCommandState } from '../document/commands';
import {
  applyGeneratedDiagramToDocument,
  applyMutationProposalToDocument,
} from '../document/commands';
import type { AgentGenerationProposal, AgentMutationProposal } from '../types/agents';
import {
  validateGenerationProposalForCanvas,
  validateMutationProposalForCanvas,
} from './agentOrchestrator';

export interface AgentDocumentApplicationResult {
  success: boolean;
  error: string | null;
  appliedShapeIds: string[];
  state: DocumentCommandState | null;
}

function buildFailureResult(error: string): AgentDocumentApplicationResult {
  return {
    success: false,
    error,
    appliedShapeIds: [],
    state: null,
  };
}

export function applyGenerationProposalToDocumentState(
  state: DocumentCommandState,
  proposal: AgentGenerationProposal,
  timestamp: number = Date.now()
): AgentDocumentApplicationResult {
  if (proposal.actions.length === 0) {
    return buildFailureResult('This draft does not include any shapes or connectors to apply.');
  }

  const validation = validateGenerationProposalForCanvas(
    proposal,
    state.shapes.map((shape) => shape.id)
  );
  if (!validation.isValid) {
    return buildFailureResult(validation.error ?? 'The generated diagram is invalid.');
  }

  const commandResult = applyGeneratedDiagramToDocument(state, proposal, timestamp);
  return {
    success: true,
    error: null,
    appliedShapeIds: commandResult.appliedShapeIds,
    state: commandResult.state,
  };
}

export function applyMutationProposalToDocumentState(
  state: DocumentCommandState,
  proposal: AgentMutationProposal,
  timestamp: number = Date.now()
): AgentDocumentApplicationResult {
  if (proposal.actions.length === 0) {
    return buildFailureResult('This proposal does not include any changes to apply.');
  }

  const validation = validateMutationProposalForCanvas(proposal, state.shapes);
  if (!validation.isValid) {
    return buildFailureResult(validation.error ?? 'The proposed changes are invalid.');
  }

  const commandResult = applyMutationProposalToDocument(state, proposal, timestamp);
  return {
    success: true,
    error: null,
    appliedShapeIds: commandResult.appliedShapeIds,
    state: commandResult.state,
  };
}
