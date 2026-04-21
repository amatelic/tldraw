import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Workspace, WorkspaceRenameResult } from '../stores/workspaceStore';
import { WorkspaceTab } from './WorkspaceTab';

interface WorkspaceTabsProps {
  workspaces: Workspace[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => WorkspaceRenameResult;
  maxWorkspaces: number;
}

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.985,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.34,
      ease: [0.16, 1, 0.3, 1] as const,
      staggerChildren: 0.045,
    },
  },
};

const addButtonVariants = {
  initial: { opacity: 0, scale: 0.92, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  hover: {
    scale: 1.035,
    y: -1,
    transition: {
      type: 'spring' as const,
      stiffness: 360,
      damping: 22,
    },
  },
  tap: { scale: 0.97, y: 0 },
};

const MAX_VISIBLE_WORKSPACES = 6;
const VISIBLE_TABS_BEFORE_OVERFLOW = 5;
const OVERFLOW_TRIGGER_ID = 'workspace-overflow-trigger';
const TAB_LABEL_MAX_LENGTH = 15;

function getCompactLabel(name: string): string {
  return name.length > TAB_LABEL_MAX_LENGTH ? `${name.substring(0, TAB_LABEL_MAX_LENGTH)}...` : name;
}

export function WorkspaceTabs({
  workspaces,
  activeId,
  onSwitch,
  onAdd,
  onDelete,
  onRename,
  maxWorkspaces,
}: WorkspaceTabsProps) {
  const shouldReduceMotion = useReducedMotion();
  const isMaxReached = workspaces.length >= maxWorkspaces;
  const canDeleteAny = workspaces.length > 1;
  const hasOverflow = workspaces.length > MAX_VISIBLE_WORKSPACES;
  const visibleWorkspaces = hasOverflow
    ? workspaces.slice(0, VISIBLE_TABS_BEFORE_OVERFLOW)
    : workspaces;
  const hiddenWorkspaces = hasOverflow ? workspaces.slice(VISIBLE_TABS_BEFORE_OVERFLOW) : [];
  const activeHiddenWorkspace = hiddenWorkspaces.find((workspace) => workspace.id === activeId);
  const isOverflowActive = activeHiddenWorkspace !== undefined;
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [overflowEditingId, setOverflowEditingId] = useState<string | null>(null);
  const [overflowEditValue, setOverflowEditValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameErrorWorkspaceId, setRenameErrorWorkspaceId] = useState<string | null>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const overflowInputRef = useRef<HTMLInputElement>(null);
  const showOverflowMenu = hasOverflow && isOverflowMenuOpen;
  const activeOverflowEditingId = hiddenWorkspaces.some(
    (workspace) => workspace.id === overflowEditingId
  )
    ? overflowEditingId
    : null;
  const activeOverflowWorkspaceName = activeHiddenWorkspace?.name ?? 'Hidden workspace';
  const isOverflowRenameError =
    renameErrorWorkspaceId !== null &&
    hiddenWorkspaces.some((workspace) => workspace.id === renameErrorWorkspaceId);

  function closeOverflowMenu() {
    setIsOverflowMenuOpen(false);
    setOverflowEditingId(null);
    setOverflowEditValue('');
  }

  function clearRenameError(workspaceId?: string) {
    if (workspaceId !== undefined && renameErrorWorkspaceId !== workspaceId) {
      return;
    }

    setRenameError(null);
    setRenameErrorWorkspaceId(null);
  }

  function submitWorkspaceRename(workspaceId: string, name: string): boolean {
    const result = onRename(workspaceId, name);

    if (result.success) {
      clearRenameError(workspaceId);
      return true;
    }

    setRenameError(result.error);
    setRenameErrorWorkspaceId(workspaceId);
    return false;
  }

  function focusWorkspaceControl(workspaceId: string) {
    requestAnimationFrame(() => {
      const element = document.getElementById(`workspace-tab-${workspaceId}`);
      if (element instanceof HTMLButtonElement) {
        element.focus();
        return;
      }

      const overflowTrigger = document.getElementById(OVERFLOW_TRIGGER_ID);
      if (overflowTrigger instanceof HTMLButtonElement) {
        overflowTrigger.focus();
      }
    });
  }

  useEffect(() => {
    if (!showOverflowMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (overflowMenuRef.current?.contains(event.target as Node)) return;

      const overflowTrigger = document.getElementById(OVERFLOW_TRIGGER_ID);
      if (overflowTrigger?.contains(event.target as Node)) return;

      closeOverflowMenu();
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showOverflowMenu]);

  useEffect(() => {
    if (!activeOverflowEditingId || !overflowInputRef.current) return;

    overflowInputRef.current.focus();
    overflowInputRef.current.select();
  }, [activeOverflowEditingId]);

  function submitOverflowRename(workspaceId: string) {
    const didRename = submitWorkspaceRename(workspaceId, overflowEditValue);
    if (didRename) {
      setOverflowEditingId(null);
      setOverflowEditValue('');
      return;
    }

    requestAnimationFrame(() => {
      overflowInputRef.current?.focus();
      overflowInputRef.current?.select();
    });
  }

  function handleOverflowRenameKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    workspaceId: string
  ) {
    if (event.key === 'Enter') {
      submitOverflowRename(workspaceId);
      return;
    }

    if (event.key === 'Escape') {
      clearRenameError(workspaceId);
      setOverflowEditingId(null);
      setOverflowEditValue('');
    }
  }

  function handleOverflowWorkspaceSelect(workspaceId: string) {
    clearRenameError();
    onSwitch(workspaceId);
    closeOverflowMenu();
    focusWorkspaceControl(workspaceId);
  }

  function handleOverflowWorkspaceDelete(workspaceId: string) {
    clearRenameError(workspaceId);
    onDelete(workspaceId);
    setOverflowEditingId(null);
    setOverflowEditValue('');

    if (hiddenWorkspaces.length <= 1) {
      setIsOverflowMenuOpen(false);
    }
  }

  const overflowLabel = activeHiddenWorkspace
    ? getCompactLabel(activeHiddenWorkspace.name)
    : `+${hiddenWorkspaces.length} more`;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = workspaces.findIndex((workspace) => workspace.id === activeId);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = currentIndex === 0 ? workspaces.length - 1 : currentIndex - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = currentIndex === workspaces.length - 1 ? 0 : currentIndex + 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = workspaces.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextWorkspace = workspaces[nextIndex];
    if (!nextWorkspace) return;

    onSwitch(nextWorkspace.id);
    focusWorkspaceControl(nextWorkspace.id);
  }

  return (
    <motion.div
      className="workspace-tabs-container"
      variants={shouldReduceMotion ? undefined : containerVariants}
      initial={shouldReduceMotion ? false : 'hidden'}
      animate={shouldReduceMotion ? undefined : 'visible'}
      layout
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              layout: {
                duration: 0.32,
                ease: [0.16, 1, 0.3, 1],
              },
            }
      }
    >
      <div className="workspace-tabs-row">
        <div className="workspace-tabs-rail">
          <div
            className={`workspace-tabs-list ${hasOverflow ? 'workspace-tabs-list-condensed' : ''}`}
            role="tablist"
            aria-label="Workspaces"
            onKeyDown={handleKeyDown}
          >
            <AnimatePresence mode="popLayout">
              {visibleWorkspaces.map((workspace) => (
                <WorkspaceTab
                  key={workspace.id}
                  tabButtonId={`workspace-tab-${workspace.id}`}
                  workspace={workspace}
                  isActive={workspace.id === activeId}
                  canDelete={canDeleteAny}
                  renameError={renameErrorWorkspaceId === workspace.id ? renameError : null}
                  onClick={() => {
                    clearRenameError();
                    onSwitch(workspace.id);
                    setIsOverflowMenuOpen(false);
                  }}
                  onClose={() => {
                    clearRenameError(workspace.id);
                    onDelete(workspace.id);
                  }}
                  onRename={(name) => submitWorkspaceRename(workspace.id, name)}
                  onRenameInteraction={() => clearRenameError(workspace.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {hasOverflow && (
            <div className="workspace-overflow">
              <button
                id={OVERFLOW_TRIGGER_ID}
                type="button"
                className={`workspace-overflow-trigger ${isOverflowActive ? 'active' : ''}`}
                aria-haspopup="menu"
                aria-expanded={isOverflowMenuOpen}
                aria-label={
                  isOverflowActive
                    ? `Active workspace ${activeOverflowWorkspaceName}. Show hidden workspaces`
                    : `Show ${hiddenWorkspaces.length} more workspaces`
                }
                onClick={() => {
                  clearRenameError();
                  setIsOverflowMenuOpen((current) => !current);
                }}
              >
                {isOverflowActive && (
                  <motion.span
                    className="workspace-tab-active-pill"
                    layoutId={shouldReduceMotion ? undefined : 'workspace-active-pill'}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            type: 'spring',
                            stiffness: 380,
                            damping: 30,
                            mass: 0.86,
                          }
                    }
                  />
                )}
                <span className="workspace-overflow-label">{overflowLabel}</span>
                <svg
                  className={`workspace-overflow-icon ${isOverflowMenuOpen ? 'open' : ''}`}
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              <AnimatePresence>
                {showOverflowMenu && (
                  <motion.div
                    ref={overflowMenuRef}
                    className="workspace-overflow-menu"
                    role="menu"
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
                  >
                    <div className="workspace-overflow-menu-header">More workspaces</div>

                    {hiddenWorkspaces.map((workspace) => {
                      const isEditingOverflowItem = activeOverflowEditingId === workspace.id;
                      const isActiveOverflowItem = workspace.id === activeId;
                      const overflowRenameError =
                        renameErrorWorkspaceId === workspace.id ? renameError : null;

                      return (
                        <div
                          key={workspace.id}
                          className={`workspace-overflow-item ${isActiveOverflowItem ? 'active' : ''}`}
                        >
                          {isEditingOverflowItem ? (
                            <div className="workspace-overflow-rename-shell">
                              <input
                                ref={overflowInputRef}
                                type="text"
                                value={overflowEditValue}
                                className="workspace-overflow-rename-input"
                                aria-label={`Rename ${workspace.name}`}
                                aria-invalid={overflowRenameError ? 'true' : undefined}
                                onChange={(event) => {
                                  clearRenameError(workspace.id);
                                  setOverflowEditValue(event.target.value);
                                }}
                                onKeyDown={(event) =>
                                  handleOverflowRenameKeyDown(event, workspace.id)
                                }
                                onBlur={() => submitOverflowRename(workspace.id)}
                              />
                              {overflowRenameError && (
                                <div className="workspace-overflow-rename-error" role="alert">
                                  {overflowRenameError}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="workspace-overflow-item-button"
                              role="menuitemradio"
                              aria-checked={isActiveOverflowItem}
                              onClick={() => handleOverflowWorkspaceSelect(workspace.id)}
                            >
                              <span className="workspace-overflow-item-label">{workspace.name}</span>
                              {isActiveOverflowItem && (
                                <span className="workspace-overflow-item-status">Active</span>
                              )}
                            </button>
                          )}

                          {!isEditingOverflowItem && (
                            <div className="workspace-overflow-item-actions">
                              <button
                                type="button"
                                className="workspace-overflow-icon-button"
                                aria-label={`Rename ${workspace.name}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  clearRenameError(workspace.id);
                                  setOverflowEditingId(workspace.id);
                                  setOverflowEditValue(workspace.name);
                                }}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  width="14"
                                  height="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </button>

                              {canDeleteAny && (
                                <button
                                  type="button"
                                  className="workspace-overflow-icon-button"
                                  aria-label={`Close ${workspace.name}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleOverflowWorkspaceDelete(workspace.id);
                                  }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="14"
                                    height="14"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M18 6L6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <motion.button
          className="workspace-add-btn"
          onClick={onAdd}
          disabled={isMaxReached}
          title={isMaxReached ? `Maximum ${maxWorkspaces} workspaces reached` : 'Add new workspace'}
          variants={shouldReduceMotion ? undefined : addButtonVariants}
          initial={shouldReduceMotion ? false : 'initial'}
          animate={shouldReduceMotion ? undefined : 'animate'}
          whileHover={!isMaxReached && !shouldReduceMotion ? 'hover' : undefined}
          whileTap={!isMaxReached && !shouldReduceMotion ? 'tap' : undefined}
          layout
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  layout: {
                    duration: 0.24,
                    ease: [0.16, 1, 0.3, 1],
                  },
                }
          }
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </motion.button>
      </div>

      {renameError && !isOverflowRenameError && (
        <div className="workspace-tabs-error" role="alert">
          {renameError}
        </div>
      )}
    </motion.div>
  );
}
