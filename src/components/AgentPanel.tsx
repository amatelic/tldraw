import type { ReactElement } from 'react';
import {
  AgentCleanupPreview,
  AgentDiagramPreview,
  AgentReviewPreview,
  AgentRewritePreview,
} from './agent-panel/AgentPanelPreviews';
import {
  DIAGRAM_EXAMPLES,
  DIAGRAM_PRESETS,
  getPromptPlaceholder,
  getScopeDescription,
  SCOPE_OPTIONS,
  STATUS_LABELS,
  WORKFLOW_OPTIONS,
} from './agent-panel/model';
import type { AgentPanelProps } from './agent-panel/types';
import { useAgentPanelController } from './agent-panel/useAgentPanelController';

export function AgentPanel(props: AgentPanelProps): ReactElement | null {
  const { isOpen, workspaceName } = props;
  const {
    workflow,
    scope,
    prompt,
    diagramPreset,
    audience,
    presentationGoal,
    showDiagramDetails,
    status,
    proposal,
    errorMessage,
    isApplyingDraft,
    isDiagramWorkflow,
    isSelectionRewriteWorkflow,
    isScopeLockedWorkflow,
    workflowMessage,
    scopeShapeCount,
    selectedTextShapes,
    groupedFindings,
    generationPreview,
    rewritePreview,
    cleanupPreview,
    selectedCleanupActionIds,
    selectedCleanupProposal,
    cleanupSelectionIncludesDeletion,
    confirmCleanupDeletion,
    isDiagramPreviewVisible,
    setScopeOverride,
    setPrompt,
    setDiagramPreset,
    setAudience,
    setPresentationGoal,
    setShowDiagramDetails,
    setConfirmCleanupDeletion,
    setIsDiagramPreviewOpen,
    handleClose,
    handleWorkflowChange,
    handleExampleApply,
    handleRun,
    handleApplyDraft,
    handleApplySelectedCleanup,
    toggleCleanupAction,
    selectAllCleanupActions,
    clearCleanupActions,
  } = useAgentPanelController(props);

  if (!isOpen) {
    return null;
  }

  const reviewPreview =
    status === 'preview-ready' && proposal?.kind === 'review' ? (
      <AgentReviewPreview proposal={proposal} groupedFindings={groupedFindings} />
    ) : null;

  const cleanupSuggestionsPreview =
    status === 'preview-ready' &&
    proposal?.kind === 'mutation' &&
    proposal.workflow === 'cleanup' &&
    cleanupPreview ? (
      <AgentCleanupPreview
        proposal={proposal}
        preview={cleanupPreview}
        selectedActionIds={selectedCleanupActionIds}
        selectedProposal={selectedCleanupProposal}
        confirmDeletion={confirmCleanupDeletion}
        includesSelectedDeletion={cleanupSelectionIncludesDeletion}
        isApplyingDraft={isApplyingDraft}
        onToggleAction={toggleCleanupAction}
        onSelectAll={selectAllCleanupActions}
        onClearSelection={clearCleanupActions}
        onConfirmDeletionChange={setConfirmCleanupDeletion}
        onApplySelected={handleApplySelectedCleanup}
        onApplyAll={handleApplyDraft}
      />
    ) : null;

  const selectionRewritePreview =
    status === 'preview-ready' &&
    proposal?.kind === 'mutation' &&
    proposal.workflow === 'rewrite-selection' &&
    rewritePreview ? (
      <AgentRewritePreview
        proposal={proposal}
        preview={rewritePreview}
        isApplyingDraft={isApplyingDraft}
        onApply={handleApplyDraft}
      />
    ) : null;

  const diagramPreview =
    status === 'preview-ready' &&
    proposal?.kind === 'generation' &&
    generationPreview &&
    isDiagramPreviewVisible ? (
      <AgentDiagramPreview
        proposal={proposal}
        preview={generationPreview}
        errorMessage={errorMessage}
        isApplyingDraft={isApplyingDraft}
        onClose={() => setIsDiagramPreviewOpen(false)}
        onApply={handleApplyDraft}
      />
    ) : null;

  return (
    <>
      <section className="agent-sidebar" aria-labelledby="agent-panel-title">
        <div className="agent-sidebar-header">
          <div className="agent-sidebar-copy">
            <p className="agent-panel-kicker">Workspace assistant</p>
            <h2 id="agent-panel-title">Agent</h2>
            <p>Compose a focused helper flow for {workspaceName}.</p>
          </div>
          <button className="agent-close-button" onClick={handleClose} aria-label="Close agent panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="agent-sidebar-body">
          <div className="agent-workflow-switcher" role="group" aria-label="Workflow">
            {WORKFLOW_OPTIONS.map((option) => {
              const isDisabled = option.value === 'rewrite-selection' && selectedTextShapes.length === 0;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`agent-workflow-chip${workflow === option.value ? ' is-active' : ''}`}
                  aria-pressed={workflow === option.value}
                  disabled={isDisabled}
                  onClick={() => handleWorkflowChange(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="agent-context-row">
            <div className="agent-context-copy">
              <span className="agent-inline-label">Context</span>
              <p>{getScopeDescription(scope, scopeShapeCount)}</p>
            </div>
            <label className="agent-inline-select">
              <span>Context</span>
              <select
                aria-label="Context"
                value={scope}
                disabled={isScopeLockedWorkflow}
                onChange={(event) => setScopeOverride(event.target.value as typeof scope)}
              >
                {SCOPE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {workflowMessage && (
            <div className="agent-inline-message" data-tone="info">
              {workflowMessage}
            </div>
          )}

          {isSelectionRewriteWorkflow && (
            <div className="agent-helper-copy">
              <strong>Selection rewrite</strong>
              <p>
                Only the selected text changes. You will get a before-and-after preview before
                anything is applied.
              </p>
            </div>
          )}

          {workflow === 'cleanup' && (
            <div className="agent-helper-copy">
              <strong>Cleanup suggestions</strong>
              <p>
                Review low-risk alignment, spacing, blank-text, and style fixes before applying
                them in one undoable cleanup pass.
              </p>
            </div>
          )}

          {isDiagramWorkflow && (
            <section className="agent-compose-section">
              <div className="agent-section-heading">
                <strong>Diagram type</strong>
                <span>Pick a structure first, then focus the prompt on the story you need to tell.</span>
              </div>

              <div className="agent-chip-grid" role="list" aria-label="Diagram presets">
                {DIAGRAM_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`agent-compact-option${diagramPreset === preset.value ? ' is-active' : ''}`}
                    onClick={() => setDiagramPreset(preset.value)}
                  >
                    <strong>{preset.label}</strong>
                    <span>{preset.summary}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="agent-inline-toggle"
                aria-expanded={showDiagramDetails}
                onClick={() => setShowDiagramDetails((current) => !current)}
              >
                {showDiagramDetails ? 'Hide setup details' : 'Show setup details'}
              </button>

              {showDiagramDetails && (
                <div className="agent-detail-stack">
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

                  <div className="agent-section-heading">
                    <strong>Starter examples</strong>
                    <span>Use one as a fast starting point, then refine the prompt.</span>
                  </div>
                  <div className="agent-example-chip-row" role="list" aria-label="Diagram examples">
                    {DIAGRAM_EXAMPLES.map((example) => (
                      <button
                        key={example.label}
                        type="button"
                        className="agent-example-chip"
                        onClick={() => handleExampleApply(example)}
                      >
                        <strong>{example.label}</strong>
                        <span>{example.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
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

          {errorMessage && !isDiagramPreviewVisible && (
            <div className="agent-inline-message" data-tone="error" role="alert">
              {errorMessage}
            </div>
          )}

          {reviewPreview}
          {cleanupSuggestionsPreview}
          {selectionRewritePreview}
        </div>

        <div className="agent-sidebar-footer">
          <div className="agent-sidebar-status">
            <span className={`agent-status agent-status-${status}`}>{STATUS_LABELS[status]}</span>
            {status === 'preview-ready' && proposal?.kind === 'generation' && !isDiagramPreviewVisible && (
              <button
                type="button"
                className="agent-inline-toggle"
                onClick={() => setIsDiagramPreviewOpen(true)}
              >
                Open preview
              </button>
            )}
          </div>
          <div className="agent-button-row">
            <button className="agent-secondary-button" onClick={handleClose}>
              Close
            </button>
            <button
              className="agent-primary-button"
              onClick={handleRun}
              disabled={isSelectionRewriteWorkflow && selectedTextShapes.length === 0}
            >
              {isDiagramWorkflow
                ? 'Generate draft'
                : isSelectionRewriteWorkflow
                  ? 'Draft rewrite'
                  : workflow === 'cleanup'
                    ? 'Draft cleanup'
                    : 'Run'}
            </button>
          </div>
        </div>
      </section>

      {diagramPreview}
    </>
  );
}
