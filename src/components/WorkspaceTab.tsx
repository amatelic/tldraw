import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Workspace } from '../stores/workspaceStore';

interface WorkspaceTabProps {
  tabButtonId: string;
  workspace: Workspace;
  isActive: boolean;
  canDelete: boolean;
  onClick: () => void;
  onClose: () => void;
  onRename: (name: string) => void;
}

const TRUNCATE_LENGTH = 15;

const smoothSpring = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 1,
};

const tabVariants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    x: -20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: smoothSpring,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    x: 20,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const,
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
}: WorkspaceTabProps) {
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
    setIsEditing(true);
    setEditValue(workspace.name);
  };

  const handleSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
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
      variants={tabVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className={`workspace-tab ${isActive ? 'active' : ''}`}
      layoutId={workspace.id}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          className="workspace-rename-input"
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
