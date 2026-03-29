import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Workspace } from '../stores/workspaceStore';

interface WorkspaceTabProps {
  workspace: Workspace;
  isActive: boolean;
  canDelete: boolean;
  onClick: () => void;
  onClose: () => void;
  onRename: (name: string) => void;
}

// Damped spring animation configuration
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

export function WorkspaceTab({
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
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <motion.div
      variants={tabVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className={`workspace-tab ${isActive ? 'active' : ''}`}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
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
          <span className="workspace-tab-text">{workspace.name}</span>

          {canDelete && (
            <button
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
