import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Workspace } from '../stores/workspaceStore';

interface WorkspaceTabProps {
  tabButtonId: string;
  workspace: Workspace;
  isActive: boolean;
  canDelete: boolean;
  onClick: () => void;
  onClose: () => void;
  onRename: (name: string) => boolean | void;
  onRenameInteraction?: () => void;
  renameError?: string | null;
}

const TRUNCATE_LENGTH = 15;

const smoothSpring = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 28,
  mass: 0.85,
};

const tabVariants = {
  initial: {
    opacity: 0,
    scale: 0.94,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1] as const,
    },
  },
};

function getDisplayName(name: string): string {
  return name.length > TRUNCATE_LENGTH ? name.substring(0, TRUNCATE_LENGTH) + '...' : name;
}

function isNameTruncated(name: string): boolean {
  return name.length > TRUNCATE_LENGTH;
}

export function WorkspaceTab({
  tabButtonId,
  workspace,
  isActive,
  canDelete,
  onClick,
  onClose,
  onRename,
  onRenameInteraction,
  renameError = null,
}: WorkspaceTabProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(workspace.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayName = getDisplayName(workspace.name);
  const nameIsTruncated = isNameTruncated(workspace.name);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      if (longPressIntervalRef.current) clearInterval(longPressIntervalRef.current);
    };
  }, []);

  const handleDoubleClick = () => {
    onRenameInteraction?.();
    setIsEditing(true);
    setEditValue(workspace.name);
  };

  const handleSubmit = () => {
    const didRename = onRename(editValue);
    if (didRename !== false) {
      setIsEditing(false);
      return;
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onRenameInteraction?.();
      setIsEditing(false);
      setEditValue(workspace.name);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
    cancelLongPress();
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const startTooltipTimer = useCallback(() => {
    if (!nameIsTruncated) return;

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);

    tooltipTimerRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 3000);
  }, [nameIsTruncated]);

  const cancelTooltipTimer = useCallback(() => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  const startLongPress = useCallback(() => {
    setIsLongPressing(true);
    setLongPressProgress(0);

    const startTime = Date.now();
    const duration = 3000;

    longPressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setLongPressProgress(progress);

      if (elapsed >= duration) {
        setShowMenu(true);
        setIsLongPressing(false);
        if (longPressIntervalRef.current) {
          clearInterval(longPressIntervalRef.current);
          longPressIntervalRef.current = null;
        }
      }
    }, 50);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = null;
    }
    setIsLongPressing(false);
    setLongPressProgress(0);
  }, []);

  const handleMouseEnter = () => {
    startTooltipTimer();
  };

  const handleMouseLeave = () => {
    cancelTooltipTimer();
    cancelLongPress();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      startLongPress();
    }
  };

  const handleMouseUp = () => {
    cancelLongPress();
  };

  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : tabVariants}
      initial={shouldReduceMotion ? false : 'initial'}
      animate={shouldReduceMotion ? undefined : 'animate'}
      exit={shouldReduceMotion ? undefined : 'exit'}
      layout
      className={`workspace-tab ${isActive ? 'active' : ''} ${canDelete ? 'workspace-tab-closable' : ''}`}
      layoutId={workspace.id}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              ...smoothSpring,
              layout: {
                type: 'spring',
                stiffness: 360,
                damping: 30,
                mass: 0.9,
              },
            }
      }
      whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
    >
      {isActive && !isEditing && (
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

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => {
            onRenameInteraction?.();
            setEditValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          className="workspace-rename-input"
          aria-invalid={renameError ? 'true' : undefined}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <button
            id={tabButtonId}
            type="button"
            className="workspace-tab-trigger"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={onClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            <span className="workspace-tab-text">{displayName}</span>
          </button>

          {canDelete && (
            <button
              type="button"
              className="workspace-tab-close"
              onClick={handleCloseClick}
              title="Close workspace"
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </>
      )}

      {isLongPressing && (
        <div className="workspace-tab-progress" style={{ 
          background: `conic-gradient(#1976d2 ${longPressProgress}%, transparent ${longPressProgress}%)`
        }} />
      )}

      <AnimatePresence>
        {showTooltip && nameIsTruncated && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="workspace-tab-tooltip"
          >
            {workspace.name}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            className="workspace-context-menu"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRenameInteraction?.();
                setIsEditing(true);
                setShowMenu(false);
              }}
            >
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                setShowMenu(false);
              }}
              disabled={!canDelete}
              className={!canDelete ? 'disabled' : ''}
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
