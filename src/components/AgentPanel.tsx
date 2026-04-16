import { useMemo, useState } from 'react';
import type { AgentOrchestrator } from '../agents/agentOrchestrator';
import type { EditorState, Shape } from '../types';
import type {
  AgentContextScope,
  AgentGenerationProposal,
  AgentLifecycleState,
  AgentProposal,
  AgentReviewFinding,
  AgentReviewFindingCategory,
  AgentViewport,
  AgentWorkflowType,
} from '../types/agents';

type DiagramPreset = 'architecture' | 'process-flow' | 'storyboard' | 'learning-journey';

interface DiagramPresetOption {
  value: DiagramPreset;
  label: string;
  summary: string;
  examplePrompt: string;
}

interface AgentPanelProps {
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
  onClose: () => void;
}

const WORKFLOW_OPTIONS: Array<{ value: AgentWorkflowType; label: string }> = [
  { value: 'review', label: 'Review Mode' },
  { value: 'cleanup', label: 'Cleanup Suggestions' },
  { value: 'rewrite-selection', label: 'Selection Rewrite' },
  { value: 'generate-diagram', label: 'Diagram Generator' },
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

const DIAGRAM_PRESETS: DiagramPresetOption[] = [
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

const DIAGRAM_EXAMPLES = [
  {
    label: 'Messaging App Backend',
    preset: 'architecture' as const,
    prompt: 'Create a backend architecture for a messaging app.',
    audience: 'Engineering and product stakeholders',
    goal: 'Explain the request, storage, and delivery path in one pass.',
  },
  {
    label: 'Storytelling Storyboard',
    preset: 'storyboard' as const,
    prompt: 'Create a storyboard for how to learn storytelling.',
    audience: 'Learners or workshop attendees',
    goal: 'Turn the learning path into a simple presentation sequence.',
  },
];

function getDefaultScope(selectedShapeIds: string[]): AgentContextScope {
  return selectedShapeIds.length > 0 ? 'selection' : 'visible-board';
}

function getScopeForWorkflow(
  workflow: AgentWorkflowType,
  selectedShapeIds: string[],
  scopeOverride: AgentContextScope | null
): AgentContextScope {
  if (workflow === 'generate-diagram') {
    return 'full-board';
  }

  return scopeOverride ?? getDefaultScope(selectedShapeIds);
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

function getPromptPlaceholder(workflow: AgentWorkflowType, diagramPreset: DiagramPreset): string {
  if (workflow !== 'generate-diagram') {
    return 'Optional: focus the review on clarity, structure, or another goal.';
  }

  const preset = DIAGRAM_PRESETS.find((option) => option.value === diagramPreset);
  return `Describe the work diagram you want to create. Example: ${preset?.examplePrompt ?? 'Create a simple architecture diagram.'}`;
}

function buildPromptForWorkflow(
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

function getWorkflowScaffoldMessage(workflow: AgentWorkflowType): string | null {
  switch (workflow) {
    case 'cleanup':
    case 'rewrite-selection':
      return 'Cleanup Suggestions and Selection Rewrite are scaffolded in the UI, but only Review Mode is wired in this first implementation slice.';
    case 'generate-diagram':
      return 'Diagram Generator now sends structured requests through the OpenCode-backed provider. Full preview UI lands next, so this step focuses on provider wiring and validation.';
    case 'review':
    default:
      return null;
  }
}

function groupFindings(findings: AgentReviewFinding[]): Map<AgentReviewFindingCategory, AgentReviewFinding[]> {
  return findings.reduce((groups, finding) => {
    const nextGroup = groups.get(finding.category) ?? [];
    nextGroup.push(finding);
    groups.set(finding.category, nextGroup);
    return groups;
  }, new Map<AgentReviewFindingCategory, AgentReviewFinding[]>());
}

function getGenerationCounts(proposal: AgentGenerationProposal) {
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

function getDiagramNodeLabel(action: Extract<AgentGenerationProposal['actions'][number], { type: 'create-shape' }>): string {
  const text = action.shape.text?.trim();
  if (text) {
    return text;
  }

  return action.shape.id;
}

function getConnectorLabel(
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

function renderStringList(items: string[], fallback: string) {
  const visibleItems = items.filter((item) => item.trim().length > 0);

  if (visibleItems.length === 0) {
    return <div className="agent-inline-empty-state">{fallback}</div>;
  }

  return (
    <ul>
      {visibleItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function AgentPanel({
  isOpen,
  workspaceId,
  workspaceName,
  shapes,
  editorState,
  viewport,
  orchestrator,
  onApplyGenerationProposal,
  onClose,
}: AgentPanelProps) {
  const [workflow, setWorkflow] = useState<AgentWorkflowType>('review');
  const [scopeOverride, setScopeOverride] = useState<AgentContextScope | null>(null);
  const [prompt, setPrompt] = useState('');
  const [diagramPreset, setDiagramPreset] = useState<DiagramPreset>('architecture');
  const [audience, setAudience] = useState('');
  const [presentationGoal, setPresentationGoal] = useState('');
  const [status, setStatus] = useState<AgentLifecycleState>('idle');
  const [proposal, setProposal] = useState<AgentProposal | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApplyingDraft, setIsApplyingDraft] = useState(false);
  const scope = getScopeForWorkflow(workflow, editorState.selectedShapeIds, scopeOverride);
  const workflowMessage = getWorkflowScaffoldMessage(workflow);
  const isDiagramWorkflow = workflow === 'generate-diagram';

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

  const generationPreview = useMemo(() => {
    if (proposal?.kind !== 'generation') {
      return null;
    }

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
  }, [proposal]);

  if (!isOpen) {
    return null;
  }

  const handleWorkflowChange = (nextWorkflow: AgentWorkflowType) => {
    setWorkflow(nextWorkflow);
    setScopeOverride(nextWorkflow === 'generate-diagram' ? 'full-board' : null);
    setProposal(null);
    setErrorMessage(null);
    setStatus('idle');
  };

  const handleExampleApply = (example: (typeof DIAGRAM_EXAMPLES)[number]) => {
    setWorkflow('generate-diagram');
    setScopeOverride('full-board');
    setDiagramPreset(example.preset);
    setPrompt(example.prompt);
    setAudience(example.audience);
    setPresentationGoal(example.goal);
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
        prompt: buildPromptForWorkflow(workflow, prompt, diagramPreset, audience, presentationGoal),
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

  const handleApplyDraft = async () => {
    if (proposal?.kind !== 'generation') {
      return;
    }

    setErrorMessage(null);
    setIsApplyingDraft(true);

    try {
      const result = await onApplyGenerationProposal(proposal);

      if (!result.success) {
        setErrorMessage(result.error ?? 'The generated diagram could not be applied.');
        return;
      }

      onClose();
    } finally {
      setIsApplyingDraft(false);
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
              disabled={isDiagramWorkflow}
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

        {isDiagramWorkflow && (
          <>
            <div className="agent-diagram-callout">
              <strong>Diagram draft + presentation brief</strong>
              <p>
                This workflow prepares a simple work diagram and the talk track you can use to
                present it. Context is locked to the full board for the first generation pass.
              </p>
            </div>

            <div className="agent-preset-grid" role="list" aria-label="Diagram presets">
              {DIAGRAM_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`agent-preset-card${diagramPreset === preset.value ? ' is-active' : ''}`}
                  onClick={() => setDiagramPreset(preset.value)}
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.summary}</span>
                </button>
              ))}
            </div>

            <div className="agent-form-grid">
              <label className="agent-field">
                <span>Audience</span>
                <input
                  aria-label="Audience"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  placeholder="Who will you present this to?"
                />
              </label>

              <label className="agent-field">
                <span>Presentation Goal</span>
                <input
                  aria-label="Presentation Goal"
                  value={presentationGoal}
                  onChange={(event) => setPresentationGoal(event.target.value)}
                  placeholder="What should the audience understand?"
                />
              </label>
            </div>

            <div className="agent-example-section">
              <div className="agent-example-header">
                <strong>Starter examples</strong>
                <span>Use one as a fast starting point, then edit the prompt.</span>
              </div>
              <div className="agent-example-grid" role="list" aria-label="Diagram examples">
                {DIAGRAM_EXAMPLES.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    className="agent-example-card"
                    onClick={() => handleExampleApply(example)}
                  >
                    <strong>{example.label}</strong>
                    <span>{example.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <label className="agent-field">
          <span>Prompt</span>
          <textarea
            aria-label="Prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={getPromptPlaceholder(workflow, diagramPreset)}
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
              {isDiagramWorkflow ? 'Generate draft' : 'Run'}
            </button>
          </div>
        </div>

        {workflowMessage && (
          <div className="agent-message-card" data-tone="info">
            {workflowMessage}
          </div>
        )}

        {errorMessage && (
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

        {status === 'preview-ready' && proposal?.kind === 'generation' && generationPreview && (
          <div className="agent-results">
            <div className="agent-results-summary">{proposal.summary}</div>

            <div className="agent-stat-grid">
              <div className="agent-stat-card">
                <strong>{generationPreview.counts.shapes}</strong>
                <span>Planned nodes</span>
              </div>
              <div className="agent-stat-card">
                <strong>{generationPreview.counts.connectors}</strong>
                <span>Planned connectors</span>
              </div>
              <div className="agent-stat-card">
                <strong>{proposal.sections.length}</strong>
                <span>Diagram sections</span>
              </div>
              <div className="agent-stat-card">
                <strong>{proposal.warnings.length}</strong>
                <span>Warnings</span>
              </div>
            </div>

            <section className="agent-result-group">
              <h3>Diagram plan</h3>
              {proposal.sections.length === 0 ? (
                <div className="agent-inline-empty-state">No explicit sections were generated for this draft.</div>
              ) : (
                <div className="agent-section-list">
                  {proposal.sections.map((section) => (
                    <article key={section.id} className="agent-section-card">
                      <div className="agent-section-header">
                        <strong>{section.title}</strong>
                        <span>{section.shapeIds.length} node{section.shapeIds.length === 1 ? '' : 's'}</span>
                      </div>
                      <p>{section.summary}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="agent-preview-grid">
              <section className="agent-result-group">
                <h3>Planned nodes</h3>
                {generationPreview.nodeActions.length === 0 ? (
                  <div className="agent-inline-empty-state">No nodes were generated for this draft.</div>
                ) : (
                  <ul>
                    {generationPreview.nodeActions.map((action) => (
                      <li key={action.shape.id} className="agent-preview-item">
                        <strong>{getDiagramNodeLabel(action)}</strong>
                        <span>{action.shape.type}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="agent-result-group">
                <h3>Planned connectors</h3>
                {generationPreview.connectorActions.length === 0 ? (
                  <div className="agent-inline-empty-state">No connectors were generated for this draft.</div>
                ) : (
                  <ul>
                    {generationPreview.connectorActions.map((action) => (
                      <li key={action.connector.id} className="agent-preview-item">
                        <strong>{getConnectorLabel(action, generationPreview.nodeLabelLookup)}</strong>
                        <span>{action.connector.type}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="agent-result-group">
              <h3>Presentation brief</h3>
              <div className="agent-brief-grid">
                <div className="agent-brief-card">
                  <span className="agent-brief-label">Title</span>
                  <strong>{proposal.presentationBrief.title}</strong>
                </div>
                <div className="agent-brief-card">
                  <span className="agent-brief-label">Audience</span>
                  <strong>{proposal.presentationBrief.audience}</strong>
                </div>
                <div className="agent-brief-card agent-brief-card-wide">
                  <span className="agent-brief-label">Objective</span>
                  <p>{proposal.presentationBrief.objective}</p>
                </div>
                <div className="agent-brief-card agent-brief-card-wide">
                  <span className="agent-brief-label">Summary</span>
                  <p>{proposal.presentationBrief.summary}</p>
                </div>
              </div>

              <div className="agent-preview-grid">
                <section className="agent-preview-subgroup">
                  <h4>Narrative order</h4>
                  {renderStringList(
                    proposal.presentationBrief.narrativeSteps,
                    'No narrative order was provided.'
                  )}
                </section>

                <section className="agent-preview-subgroup">
                  <h4>Speaker notes</h4>
                  {renderStringList(
                    proposal.presentationBrief.speakerNotes,
                    'No speaker notes were provided.'
                  )}
                </section>

                <section className="agent-preview-subgroup">
                  <h4>Assumptions</h4>
                  {renderStringList(
                    proposal.presentationBrief.assumptions,
                    'No assumptions were included.'
                  )}
                </section>

                <section className="agent-preview-subgroup">
                  <h4>Open questions</h4>
                  {renderStringList(
                    proposal.presentationBrief.openQuestions,
                    'No open questions were included.'
                  )}
                </section>
              </div>
            </section>

            <section className="agent-result-group">
              <h3>Warnings</h3>
              {proposal.warnings.length === 0 ? (
                <div className="agent-inline-empty-state">No warnings were returned for this draft.</div>
              ) : (
                <ul>
                  {proposal.warnings.map((warning) => (
                    <li key={warning.id} className="agent-finding">
                      <div className="agent-finding-header">
                        <strong>{warning.message}</strong>
                        <span className={`agent-severity agent-severity-${warning.severity}`}>
                          {warning.severity}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="agent-panel-actions agent-panel-actions-inline">
              <div className="agent-button-row">
                <button
                  className="agent-primary-button"
                  onClick={handleApplyDraft}
                  disabled={isApplyingDraft || proposal.actions.length === 0}
                >
                  {isApplyingDraft ? 'Applying...' : 'Apply to board'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
