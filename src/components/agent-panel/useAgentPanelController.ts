import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AgentContextScope,
  AgentGenerationProposal,
  AgentLifecycleState,
  AgentMutationProposal,
  AgentProposal,
  AgentWorkflowType,
} from '../../types/agents';
import {
  buildCleanupActionId,
  buildCleanupPreview,
  buildGenerationPreview,
  buildMutationProposalSelection,
  buildPromptForWorkflow,
  buildRewritePreview,
  getScopeForWorkflow,
  getWorkflowScaffoldMessage,
  groupFindings,
  isTextShape,
} from './model';
import type {
  AgentCleanupPreviewState,
  AgentGenerationPreviewState,
  AgentPanelProps,
  AgentReviewFindingGroups,
  AgentRewritePreviewState,
  DiagramExample,
  DiagramPreset,
} from './types';

export interface AgentPanelController {
  workflow: AgentWorkflowType;
  scope: AgentContextScope;
  prompt: string;
  diagramPreset: DiagramPreset;
  audience: string;
  presentationGoal: string;
  showDiagramDetails: boolean;
  status: AgentLifecycleState;
  proposal: AgentProposal | null;
  errorMessage: string | null;
  isApplyingDraft: boolean;
  isDiagramWorkflow: boolean;
  isSelectionRewriteWorkflow: boolean;
  isScopeLockedWorkflow: boolean;
  workflowMessage: string | null;
  scopeShapeCount: number;
  selectedTextShapes: Array<Extract<AgentPanelProps['shapes'][number], { type: 'text' }>>;
  groupedFindings: AgentReviewFindingGroups;
  generationPreview: AgentGenerationPreviewState | null;
  rewritePreview: AgentRewritePreviewState | null;
  cleanupPreview: AgentCleanupPreviewState | null;
  selectedCleanupActionIds: string[];
  selectedCleanupItems: AgentCleanupPreviewState['items'];
  selectedCleanupProposal: AgentMutationProposal | null;
  cleanupSelectionIncludesDeletion: boolean;
  confirmCleanupDeletion: boolean;
  isDiagramPreviewVisible: boolean;
  setScopeOverride: (scope: AgentContextScope) => void;
  setPrompt: (prompt: string) => void;
  setDiagramPreset: (preset: DiagramPreset) => void;
  setAudience: (audience: string) => void;
  setPresentationGoal: (goal: string) => void;
  setShowDiagramDetails: (updater: boolean | ((current: boolean) => boolean)) => void;
  setConfirmCleanupDeletion: (isConfirmed: boolean) => void;
  setIsDiagramPreviewOpen: (isOpen: boolean) => void;
  handleClose: () => void;
  handleWorkflowChange: (workflow: AgentWorkflowType) => void;
  handleExampleApply: (example: DiagramExample) => void;
  handleRun: () => Promise<void>;
  handleApplyDraft: () => Promise<void>;
  handleApplySelectedCleanup: () => Promise<void>;
  toggleCleanupAction: (actionId: string) => void;
  selectAllCleanupActions: () => void;
  clearCleanupActions: () => void;
}

export function useAgentPanelController({
  isOpen,
  workspaceId,
  workspaceName,
  shapes,
  editorState,
  viewport,
  orchestrator,
  onApplyGenerationProposal,
  onApplyMutationProposal,
  onClose,
}: AgentPanelProps): AgentPanelController {
  const [workflow, setWorkflow] = useState<AgentWorkflowType>('review');
  const [scopeOverride, setScopeOverrideState] = useState<AgentContextScope | null>(null);
  const [prompt, setPrompt] = useState('');
  const [diagramPreset, setDiagramPreset] = useState<DiagramPreset>('architecture');
  const [audience, setAudience] = useState('');
  const [presentationGoal, setPresentationGoal] = useState('');
  const [showDiagramDetails, setShowDiagramDetails] = useState(false);
  const [status, setStatus] = useState<AgentLifecycleState>('idle');
  const [proposal, setProposal] = useState<AgentProposal | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApplyingDraft, setIsApplyingDraft] = useState(false);
  const [isDiagramPreviewOpen, setIsDiagramPreviewOpen] = useState(false);
  const [selectedCleanupActionIds, setSelectedCleanupActionIds] = useState<string[]>([]);
  const [confirmCleanupDeletion, setConfirmCleanupDeletion] = useState(false);
  const runRequestIdRef = useRef(0);
  const applyRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const invalidateRequests = useCallback((): void => {
    runRequestIdRef.current += 1;
    applyRequestIdRef.current += 1;
  }, []);

  const isCurrentRun = useCallback((requestId: number): boolean => {
    return isMountedRef.current && runRequestIdRef.current === requestId;
  }, []);

  const isCurrentApply = useCallback((requestId: number): boolean => {
    return isMountedRef.current && applyRequestIdRef.current === requestId;
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      invalidateRequests();
    };
  }, [invalidateRequests]);

  useEffect(() => {
    if (!isOpen) {
      invalidateRequests();
      setIsDiagramPreviewOpen(false);
    }
  }, [invalidateRequests, isOpen]);

  const scope = getScopeForWorkflow(workflow, editorState.selectedShapeIds, scopeOverride);
  const workflowMessage = getWorkflowScaffoldMessage(workflow);
  const isDiagramWorkflow = workflow === 'generate-diagram';
  const isSelectionRewriteWorkflow = workflow === 'rewrite-selection';
  const isScopeLockedWorkflow = isDiagramWorkflow || isSelectionRewriteWorkflow;

  const selectedTextShapes = useMemo(
    () =>
      shapes.filter(
        (shape): shape is Extract<AgentPanelProps['shapes'][number], { type: 'text' }> =>
          editorState.selectedShapeIds.includes(shape.id) && isTextShape(shape)
      ),
    [editorState.selectedShapeIds, shapes]
  );

  const scopeShapeCount = useMemo(() => {
    if (scope === 'selection') {
      return editorState.selectedShapeIds.length;
    }

    return shapes.length;
  }, [editorState.selectedShapeIds.length, scope, shapes.length]);

  const groupedFindings = useMemo(() => {
    if (proposal?.kind !== 'review') {
      return new Map();
    }

    return groupFindings(proposal.findings);
  }, [proposal]);

  const generationPreview = useMemo(() => {
    if (proposal?.kind !== 'generation') {
      return null;
    }

    return buildGenerationPreview(proposal);
  }, [proposal]);

  const rewritePreview = useMemo(() => {
    if (proposal?.kind !== 'mutation' || proposal.workflow !== 'rewrite-selection') {
      return null;
    }

    return buildRewritePreview(proposal, shapes);
  }, [proposal, shapes]);

  const cleanupPreview = useMemo(() => {
    if (proposal?.kind !== 'mutation' || proposal.workflow !== 'cleanup') {
      return null;
    }

    return buildCleanupPreview(proposal, shapes);
  }, [proposal, shapes]);

  const selectedCleanupItems = useMemo(() => {
    if (!cleanupPreview) {
      return [];
    }

    const selectedIds = new Set(selectedCleanupActionIds);
    return cleanupPreview.items.filter((item) => selectedIds.has(item.id));
  }, [cleanupPreview, selectedCleanupActionIds]);

  const isDiagramPreviewVisible =
    status === 'preview-ready' &&
    proposal?.kind === 'generation' &&
    generationPreview !== null &&
    isDiagramPreviewOpen;

  const selectedCleanupProposal = useMemo(() => {
    if (proposal?.kind !== 'mutation' || proposal.workflow !== 'cleanup') {
      return null;
    }

    return buildMutationProposalSelection(proposal, new Set(selectedCleanupActionIds));
  }, [proposal, selectedCleanupActionIds]);

  const cleanupSelectionIncludesDeletion = selectedCleanupItems.some((item) => item.isDeletion);

  const setScopeOverride = useCallback((scopeValue: AgentContextScope): void => {
    setScopeOverrideState(scopeValue);
  }, []);

  const handleClose = useCallback((): void => {
    invalidateRequests();
    onClose();
  }, [invalidateRequests, onClose]);

  const handleWorkflowChange = useCallback(
    (nextWorkflow: AgentWorkflowType): void => {
      invalidateRequests();
      setWorkflow(nextWorkflow);
      setScopeOverrideState(
        nextWorkflow === 'generate-diagram'
          ? 'full-board'
          : nextWorkflow === 'rewrite-selection'
            ? 'selection'
            : null
      );
      setProposal(null);
      setErrorMessage(null);
      setStatus('idle');
      setSelectedCleanupActionIds([]);
      setConfirmCleanupDeletion(false);
      if (nextWorkflow !== 'generate-diagram') {
        setShowDiagramDetails(false);
      }
      setIsDiagramPreviewOpen(false);
    },
    [invalidateRequests]
  );

  const handleExampleApply = useCallback(
    (example: DiagramExample): void => {
      invalidateRequests();
      setWorkflow('generate-diagram');
      setScopeOverrideState('full-board');
      setDiagramPreset(example.preset);
      setPrompt(example.prompt);
      setAudience(example.audience);
      setPresentationGoal(example.goal);
      setShowDiagramDetails(true);
      setProposal(null);
      setErrorMessage(null);
      setStatus('idle');
      setIsDiagramPreviewOpen(false);
    },
    [invalidateRequests]
  );

  const handleRun = useCallback(async (): Promise<void> => {
    if (workflow === 'rewrite-selection' && selectedTextShapes.length === 0) {
      setProposal(null);
      setStatus('failed');
      setErrorMessage('Selection Rewrite needs at least one selected text shape.');
      return;
    }

    const requestId = runRequestIdRef.current + 1;
    runRequestIdRef.current = requestId;

    setProposal(null);
    setErrorMessage(null);
    setStatus('collecting-context');
    setIsDiagramPreviewOpen(false);

    await Promise.resolve();
    if (!isCurrentRun(requestId)) {
      return;
    }

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

      if (!isCurrentRun(requestId)) {
        return;
      }

      if (result.proposal.kind === 'mutation' && result.proposal.workflow === 'cleanup') {
        setSelectedCleanupActionIds(
          result.proposal.actions.map((action, index) => buildCleanupActionId(action, index))
        );
        setConfirmCleanupDeletion(false);
      } else {
        setSelectedCleanupActionIds([]);
        setConfirmCleanupDeletion(false);
      }

      setProposal(result.proposal);
      setStatus('preview-ready');
      setIsDiagramPreviewOpen(result.proposal.kind === 'generation');
    } catch (error) {
      if (!isCurrentRun(requestId)) {
        return;
      }

      setStatus('failed');
      setErrorMessage(error instanceof Error ? error.message : 'The agent request failed.');
    }
  }, [
    audience,
    diagramPreset,
    editorState,
    isCurrentRun,
    orchestrator,
    presentationGoal,
    prompt,
    scope,
    selectedTextShapes.length,
    shapes,
    viewport,
    workflow,
    workspaceId,
    workspaceName,
  ]);

  const applyProposal = useCallback(
    async (proposalToApply: AgentGenerationProposal | AgentMutationProposal): Promise<void> => {
      if (proposalToApply.kind !== 'generation' && proposalToApply.kind !== 'mutation') {
        return;
      }

      const requestId = applyRequestIdRef.current + 1;
      applyRequestIdRef.current = requestId;

      setErrorMessage(null);
      setIsApplyingDraft(true);

      try {
        const result =
          proposalToApply.kind === 'generation'
            ? await onApplyGenerationProposal(proposalToApply)
            : await onApplyMutationProposal(proposalToApply);

        if (!isCurrentApply(requestId)) {
          return;
        }

        if (!result.success) {
          setErrorMessage(result.error ?? 'The proposed changes could not be applied.');
          return;
        }

        handleClose();
      } finally {
        if (isCurrentApply(requestId)) {
          setIsApplyingDraft(false);
        }
      }
    },
    [handleClose, isCurrentApply, onApplyGenerationProposal, onApplyMutationProposal]
  );

  const handleApplyDraft = useCallback(async (): Promise<void> => {
    if (!proposal || (proposal.kind !== 'generation' && proposal.kind !== 'mutation')) {
      return;
    }

    await applyProposal(proposal);
  }, [applyProposal, proposal]);

  const handleApplySelectedCleanup = useCallback(async (): Promise<void> => {
    if (!selectedCleanupProposal || selectedCleanupProposal.actions.length === 0) {
      return;
    }

    await applyProposal(selectedCleanupProposal);
  }, [applyProposal, selectedCleanupProposal]);

  const toggleCleanupAction = useCallback((actionId: string): void => {
    setSelectedCleanupActionIds((current) =>
      current.includes(actionId) ? current.filter((id) => id !== actionId) : [...current, actionId]
    );
  }, []);

  const selectAllCleanupActions = useCallback((): void => {
    if (!cleanupPreview) {
      return;
    }

    setSelectedCleanupActionIds(cleanupPreview.items.map((item) => item.id));
  }, [cleanupPreview]);

  const clearCleanupActions = useCallback((): void => {
    setSelectedCleanupActionIds([]);
  }, []);

  return {
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
    selectedCleanupItems,
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
  };
}
