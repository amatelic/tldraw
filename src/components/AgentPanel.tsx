import { useMemo, useState } from 'react';
import type { AgentOrchestrator } from '../agents/agentOrchestrator';
import type { EditorState, Shape } from '../types';
import type {
  AgentContextScope,
  AgentLifecycleState,
  AgentProposal,
  AgentReviewFinding,
  AgentReviewFindingCategory,
  AgentViewport,
  AgentWorkflowType,
} from '../types/agents';

interface AgentPanelProps {
  isOpen: boolean;
  workspaceId: string;
  workspaceName: string;
  shapes: Shape[];
  editorState: Pick<EditorState, 'camera' | 'selectedShapeIds'>;
  viewport?: AgentViewport | null;
  orchestrator: AgentOrchestrator;
  onClose: () => void;
}

const WORKFLOW_OPTIONS: Array<{ value: AgentWorkflowType; label: string }> = [
  { value: 'review', label: 'Review Mode' },
  { value: 'cleanup', label: 'Cleanup Suggestions' },
  { value: 'rewrite-selection', label: 'Selection Rewrite' },
];

const SCOPE_OPTIONS: Array<{ value: AgentContextScope; label: string }> = [
  { value: 'selection', label: 'Selection' },
  { value: 'visible-board', label: 'Visible board' },
  { value: 'full-board', label: 'Full board' },
];

const REVIEW_CATEGORY_LABELS: Record<AgentReviewFindingCategory, string> = {
  clarity: 'Clarity Issues',
  'missing-information': 'Missing Information',
  consistency: 'Consistency Issues',
  'suggested-next-edits': 'Suggested Next Edits',
};

const STATUS_LABELS: Record<AgentLifecycleState, string> = {
  idle: 'Idle',
  'collecting-context': 'Collecting context',
  generating: 'Generating',
  'preview-ready': 'Preview ready',
  failed: 'Failed',
};

function getDefaultScope(selectedShapeIds: string[]): AgentContextScope {
  return selectedShapeIds.length > 0 ? 'selection' : 'visible-board';
}

function getScopeDescription(scope: AgentContextScope, shapeCount: number): string {
  if (scope === 'selection') {
    return `Using your current selection (${shapeCount} shape${shapeCount === 1 ? '' : 's'}).`;
  }

  if (scope === 'visible-board') {
    return 'Using the part of the board that is currently visible on screen.';
  }

  return 'Using the full workspace, even if some content is outside the current viewport.';
}

function groupFindings(findings: AgentReviewFinding[]): Map<AgentReviewFindingCategory, AgentReviewFinding[]> {
  return findings.reduce((groups, finding) => {
    const nextGroup = groups.get(finding.category) ?? [];
    nextGroup.push(finding);
    groups.set(finding.category, nextGroup);
    return groups;
  }, new Map<AgentReviewFindingCategory, AgentReviewFinding[]>());
}

export function AgentPanel({
  isOpen,
  workspaceId,
  workspaceName,
  shapes,
  editorState,
  viewport,
  orchestrator,
  onClose,
}: AgentPanelProps) {
  const [workflow, setWorkflow] = useState<AgentWorkflowType>('review');
  const [scopeOverride, setScopeOverride] = useState<AgentContextScope | null>(null);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<AgentLifecycleState>('idle');
  const [proposal, setProposal] = useState<AgentProposal | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scope = scopeOverride ?? getDefaultScope(editorState.selectedShapeIds);

  const scopeShapeCount = useMemo(() => {
    if (scope === 'selection') {
      return editorState.selectedShapeIds.length;
    }

    return shapes.length;
  }, [editorState.selectedShapeIds.length, scope, shapes.length]);

  const groupedFindings = useMemo(() => {
    if (proposal?.kind !== 'review') {
      return new Map<AgentReviewFindingCategory, AgentReviewFinding[]>();
    }

    return groupFindings(proposal.findings);
  }, [proposal]);

  if (!isOpen) {
    return null;
  }

  const handleWorkflowChange = (nextWorkflow: AgentWorkflowType) => {
    setWorkflow(nextWorkflow);
    setProposal(null);
    setErrorMessage(null);
    setStatus('idle');
  };

  const handleRun = async () => {
    setProposal(null);
    setErrorMessage(null);
    setStatus('collecting-context');

    await Promise.resolve();
    setStatus('generating');

    try {
      const result = await orchestrator.run({
        workflow,
        prompt,
        scope,
        workspace: { id: workspaceId, name: workspaceName },
        shapes,
        editorState,
        viewport,
      });

      setProposal(result.proposal);
      setStatus('preview-ready');
    } catch (error) {
      setStatus('failed');
      setErrorMessage(error instanceof Error ? error.message : 'The agent request failed.');
    }
  };

  return (
    <div className="agent-backdrop" onClick={onClose}>
      <section
        className="agent-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="agent-panel-header">
          <div>
            <h2 id="agent-panel-title">Agent</h2>
            <p>Run a focused helper flow for {workspaceName}.</p>
          </div>
          <button className="agent-close-button" onClick={onClose} aria-label="Close agent panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="agent-form-grid">
          <label className="agent-field">
            <span>Workflow</span>
            <select
              aria-label="Workflow"
              value={workflow}
              onChange={(event) => handleWorkflowChange(event.target.value as AgentWorkflowType)}
            >
              {WORKFLOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="agent-field">
            <span>Context</span>
            <select
              aria-label="Context"
              value={scope}
              onChange={(event) => setScopeOverride(event.target.value as AgentContextScope)}
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="agent-context-summary">{getScopeDescription(scope, scopeShapeCount)}</div>

        <label className="agent-field">
          <span>Prompt</span>
          <textarea
            aria-label="Prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Optional: focus the review on clarity, structure, or another goal."
            rows={4}
          />
        </label>

        <div className="agent-panel-actions">
          <span className={`agent-status agent-status-${status}`}>{STATUS_LABELS[status]}</span>
          <div className="agent-button-row">
            <button className="agent-secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button className="agent-primary-button" onClick={handleRun}>
              Run
            </button>
          </div>
        </div>

        {workflow !== 'review' && (
          <div className="agent-message-card" data-tone="info">
            Cleanup Suggestions and Selection Rewrite are scaffolded in the UI, but only Review
            Mode is wired in this first implementation slice.
          </div>
        )}

        {status === 'failed' && errorMessage && (
          <div className="agent-message-card" data-tone="error" role="alert">
            {errorMessage}
          </div>
        )}

        {status === 'preview-ready' && proposal?.kind === 'review' && (
          <div className="agent-results">
            <div className="agent-results-summary">{proposal.summary}</div>

            {proposal.findings.length === 0 ? (
              <div className="agent-empty-state">No obvious issues found in this scope.</div>
            ) : (
              Array.from(groupedFindings.entries()).map(([category, findings]) => (
                <section key={category} className="agent-result-group">
                  <h3>{REVIEW_CATEGORY_LABELS[category]}</h3>
                  <ul>
                    {findings.map((finding) => (
                      <li key={finding.id} className="agent-finding">
                        <div className="agent-finding-header">
                          <strong>{finding.title}</strong>
                          <span className={`agent-severity agent-severity-${finding.severity}`}>
                            {finding.severity}
                          </span>
                        </div>
                        <p>{finding.detail}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
