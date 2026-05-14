import type { ReactElement } from 'react';
import type { AgentGenerationProposal, AgentMutationProposal, AgentReviewProposal } from '../../types/agents';
import {
  getConnectorLabel,
  getDiagramNodeLabel,
  REVIEW_CATEGORY_LABELS,
} from './model';
import type {
  AgentCleanupPreviewState,
  AgentGenerationPreviewState,
  AgentReviewFindingGroups,
  AgentRewritePreviewState,
} from './types';

function renderStringList(items: string[], fallback: string): ReactElement {
  const visibleItems = items.filter((item) => item.trim().length > 0);

  if (visibleItems.length === 0) {
    return <div className="agent-inline-empty-state">{fallback}</div>;
  }

  return (
    <ul className="agent-compact-list">
      {visibleItems.map((item) => (
        <li key={item} className="agent-compact-item">
          {item}
        </li>
      ))}
    </ul>
  );
}

interface AgentReviewPreviewProps {
  proposal: AgentReviewProposal;
  groupedFindings: AgentReviewFindingGroups;
}

export function AgentReviewPreview({
  proposal,
  groupedFindings,
}: AgentReviewPreviewProps): ReactElement {
  return (
    <div className="agent-inline-results">
      <div className="agent-results-summary">{proposal.summary}</div>

      {proposal.findings.length === 0 ? (
        <div className="agent-empty-state">No obvious issues found in this scope.</div>
      ) : (
        Array.from(groupedFindings.entries()).map(([category, findings]) => (
          <section key={category} className="agent-inline-section">
            <div className="agent-inline-section-header">
              <h3>{REVIEW_CATEGORY_LABELS[category]}</h3>
              <span>{findings.length}</span>
            </div>
            <ul className="agent-compact-list">
              {findings.map((finding) => (
                <li key={finding.id} className="agent-compact-item">
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
  );
}

interface AgentCleanupPreviewProps {
  proposal: AgentMutationProposal;
  preview: AgentCleanupPreviewState;
  selectedActionIds: string[];
  selectedProposal: AgentMutationProposal | null;
  confirmDeletion: boolean;
  includesSelectedDeletion: boolean;
  isApplyingDraft: boolean;
  onToggleAction: (actionId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onConfirmDeletionChange: (isConfirmed: boolean) => void;
  onApplySelected: () => void;
  onApplyAll: () => void;
}

export function AgentCleanupPreview({
  proposal,
  preview,
  selectedActionIds,
  selectedProposal,
  confirmDeletion,
  includesSelectedDeletion,
  isApplyingDraft,
  onToggleAction,
  onSelectAll,
  onClearSelection,
  onConfirmDeletionChange,
  onApplySelected,
  onApplyAll,
}: AgentCleanupPreviewProps): ReactElement {
  return (
    <div className="agent-inline-results">
      <div className="agent-results-summary">{proposal.summary}</div>

      <section className="agent-inline-section">
        <div className="agent-inline-section-header">
          <h3>Cleanup suggestions</h3>
          <span>{preview.items.length} suggestions</span>
        </div>

        {preview.items.length === 0 ? (
          <div className="agent-empty-state">
            No low-risk cleanup suggestions were returned for this scope.
          </div>
        ) : (
          <>
            <div className="agent-cleanup-toolbar">
              <button type="button" className="agent-inline-toggle" onClick={onSelectAll}>
                Select all
              </button>
              <button type="button" className="agent-inline-toggle" onClick={onClearSelection}>
                Clear
              </button>
            </div>

            <div className="agent-cleanup-list">
              {preview.items.map((item) => {
                const isSelected = selectedActionIds.includes(item.id);

                return (
                  <label key={item.id} className={`agent-cleanup-row${isSelected ? ' is-selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      aria-label={`Select cleanup suggestion for ${item.targetLabel}`}
                      onChange={() => onToggleAction(item.id)}
                    />
                    <div className="agent-cleanup-copy">
                      <div className="agent-finding-header">
                        <strong>{item.targetLabel}</strong>
                        <span className={`agent-severity agent-severity-${item.isDeletion ? 'high' : 'low'}`}>
                          {item.isDeletion ? 'delete' : 'update'}
                        </span>
                      </div>
                      <p>{item.action.description}</p>
                      <div className="agent-cleanup-meta">
                        <span>{item.targetType}</span>
                        {item.fieldLabels.map((field) => (
                          <span key={`${item.id}-${field}`}>{field}</span>
                        ))}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </section>

      {preview.hasDeletion && (
        <label className="agent-confirmation-row">
          <input
            type="checkbox"
            aria-label="I understand that applying cleanup suggestions can delete empty text blocks."
            checked={confirmDeletion}
            onChange={(event) => onConfirmDeletionChange(event.target.checked)}
          />
          <span>I understand that applying cleanup suggestions can delete empty text blocks.</span>
        </label>
      )}

      <div className="agent-inline-actions agent-inline-actions-dual">
        <button
          className="agent-secondary-button"
          onClick={onApplySelected}
          disabled={
            isApplyingDraft ||
            !selectedProposal ||
            selectedProposal.actions.length === 0 ||
            (includesSelectedDeletion && !confirmDeletion)
          }
        >
          {isApplyingDraft ? 'Applying...' : 'Apply selected'}
        </button>
        <button
          className="agent-primary-button"
          onClick={onApplyAll}
          disabled={
            isApplyingDraft ||
            proposal.actions.length === 0 ||
            (preview.hasDeletion && !confirmDeletion)
          }
        >
          {isApplyingDraft ? 'Applying...' : 'Apply all'}
        </button>
      </div>
    </div>
  );
}

interface AgentRewritePreviewProps {
  proposal: AgentMutationProposal;
  preview: AgentRewritePreviewState;
  isApplyingDraft: boolean;
  onApply: () => void;
}

export function AgentRewritePreview({
  proposal,
  preview,
  isApplyingDraft,
  onApply,
}: AgentRewritePreviewProps): ReactElement {
  return (
    <div className="agent-inline-results">
      <div className="agent-results-summary">{proposal.summary}</div>

      <section className="agent-inline-section">
        <div className="agent-inline-section-header">
          <h3>Rewrite preview</h3>
          <span>{preview.textChanges.length} changes</span>
        </div>
        {preview.textChanges.length === 0 ? (
          <div className="agent-empty-state">No text changes were proposed for this selection.</div>
        ) : (
          <div className="agent-rewrite-list">
            {preview.textChanges.map((change) => (
              <article key={change.id} className="agent-rewrite-row">
                <div className="agent-rewrite-row-header">
                  <strong>{change.description}</strong>
                </div>
                <div className="agent-rewrite-copy">
                  <div className="agent-rewrite-column">
                    <span className="agent-rewrite-label">Before</span>
                    <p>{change.beforeText || 'No text found.'}</p>
                  </div>
                  <div className="agent-rewrite-arrow" aria-hidden="true">
                    →
                  </div>
                  <div className="agent-rewrite-column">
                    <span className="agent-rewrite-label">After</span>
                    <p>{change.afterText}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="agent-inline-actions">
        <button
          className="agent-primary-button"
          onClick={onApply}
          disabled={isApplyingDraft || preview.textChanges.length === 0}
        >
          {isApplyingDraft ? 'Applying...' : 'Apply rewrite'}
        </button>
      </div>
    </div>
  );
}

interface AgentDiagramPreviewProps {
  proposal: AgentGenerationProposal;
  preview: AgentGenerationPreviewState;
  errorMessage: string | null;
  isApplyingDraft: boolean;
  onClose: () => void;
  onApply: () => void;
}

export function AgentDiagramPreview({
  proposal,
  preview,
  errorMessage,
  isApplyingDraft,
  onClose,
  onApply,
}: AgentDiagramPreviewProps): ReactElement {
  return (
    <div className="agent-preview-overlay" onClick={onClose}>
      <section
        className="agent-preview-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="agent-preview-header">
          <div>
            <p className="agent-panel-kicker">Diagram preview</p>
            <h2 id="agent-preview-title">Draft diagram</h2>
            <p>{proposal.summary}</p>
          </div>
          <button className="agent-close-button" onClick={onClose} aria-label="Close diagram preview">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errorMessage && (
          <div className="agent-inline-message" data-tone="error" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="agent-preview-metadata">
          <span>{preview.counts.shapes} planned nodes</span>
          <span>{preview.counts.connectors} planned connectors</span>
          <span>{proposal.sections.length} diagram sections</span>
          <span>{proposal.warnings.length} warnings</span>
        </div>

        <div className="agent-preview-body">
          <section className="agent-preview-section">
            <div className="agent-inline-section-header">
              <h3>Diagram plan</h3>
              <span>{proposal.sections.length} sections</span>
            </div>
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
            <section className="agent-preview-section">
              <div className="agent-inline-section-header">
                <h3>Planned nodes</h3>
                <span>{preview.nodeActions.length}</span>
              </div>
              {preview.nodeActions.length === 0 ? (
                <div className="agent-inline-empty-state">No nodes were generated for this draft.</div>
              ) : (
                <ul className="agent-compact-list">
                  {preview.nodeActions.map((action) => (
                    <li key={action.shape.id} className="agent-compact-item agent-preview-item">
                      <strong>{getDiagramNodeLabel(action)}</strong>
                      <span>{action.shape.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="agent-preview-section">
              <div className="agent-inline-section-header">
                <h3>Planned connectors</h3>
                <span>{preview.connectorActions.length}</span>
              </div>
              {preview.connectorActions.length === 0 ? (
                <div className="agent-inline-empty-state">No connectors were generated for this draft.</div>
              ) : (
                <ul className="agent-compact-list">
                  {preview.connectorActions.map((action) => (
                    <li key={action.connector.id} className="agent-compact-item agent-preview-item">
                      <strong>{getConnectorLabel(action, preview.nodeLabelLookup)}</strong>
                      <span>{action.connector.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="agent-preview-section">
            <div className="agent-inline-section-header">
              <h3>Presentation brief</h3>
              <span>{proposal.presentationBrief.title}</span>
            </div>

            <div className="agent-brief-overview">
              <article className="agent-brief-panel">
                <span className="agent-inline-label">Title</span>
                <strong>{proposal.presentationBrief.title}</strong>
              </article>
              <article className="agent-brief-panel">
                <span className="agent-inline-label">Audience</span>
                <strong>{proposal.presentationBrief.audience}</strong>
              </article>
              <article className="agent-brief-panel agent-brief-panel-wide">
                <span className="agent-inline-label">Objective</span>
                <p>{proposal.presentationBrief.objective}</p>
              </article>
              <article className="agent-brief-panel agent-brief-panel-wide">
                <span className="agent-inline-label">Summary</span>
                <p>{proposal.presentationBrief.summary}</p>
              </article>
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

          <section className="agent-preview-section">
            <div className="agent-inline-section-header">
              <h3>Warnings</h3>
              <span>{proposal.warnings.length}</span>
            </div>
            {proposal.warnings.length === 0 ? (
              <div className="agent-inline-empty-state">No warnings were returned for this draft.</div>
            ) : (
              <ul className="agent-compact-list">
                {proposal.warnings.map((warning) => (
                  <li key={warning.id} className="agent-compact-item">
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
        </div>

        <div className="agent-preview-footer">
          <button className="agent-secondary-button" onClick={onClose}>
            Back to setup
          </button>
          <button
            className="agent-primary-button"
            onClick={onApply}
            disabled={isApplyingDraft || proposal.actions.length === 0}
          >
            {isApplyingDraft ? 'Applying...' : 'Apply to board'}
          </button>
        </div>
      </section>
    </div>
  );
}
