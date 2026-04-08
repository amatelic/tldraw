import { AnimatePresence, motion } from 'motion/react';
import { useCallback } from 'react';
import type { Workspace } from '../stores/workspaceStore';
import { WorkspaceTab } from './WorkspaceTab';

interface WorkspaceTabsProps {
  workspaces: Workspace[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  maxWorkspaces: number;
}

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      mass: 1,
      staggerChildren: 0.05,
    },
  },
};

const addButtonVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
  },
  hover: {
    scale: 1.1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 15,
    },
  },
  tap: { scale: 0.95 },
};

export function WorkspaceTabs({
  workspaces,
  activeId,
  onSwitch,
  onAdd,
  onDelete,
  onRename,
  maxWorkspaces,
}: WorkspaceTabsProps) {
  const isMaxReached = workspaces.length >= maxWorkspaces;
  const canDeleteAny = workspaces.length > 1;

  const focusWorkspaceTab = useCallback((workspaceId: string) => {
    requestAnimationFrame(() => {
      const element = document.getElementById(`workspace-tab-${workspaceId}`);
      if (element instanceof HTMLButtonElement) {
        element.focus();
      }
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
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
      focusWorkspaceTab(nextWorkspace.id);
    },
    [activeId, focusWorkspaceTab, onSwitch, workspaces]
  );

  return (
    <motion.div
      className="workspace-tabs-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="workspace-tabs-list" role="tablist" aria-label="Workspaces" onKeyDown={handleKeyDown}>
        <AnimatePresence mode="popLayout">
          {workspaces.map((workspace) => (
            <WorkspaceTab
              key={workspace.id}
              tabButtonId={`workspace-tab-${workspace.id}`}
              workspace={workspace}
              isActive={workspace.id === activeId}
              canDelete={canDeleteAny}
              onClick={() => onSwitch(workspace.id)}
              onClose={() => onDelete(workspace.id)}
              onRename={(name) => onRename(workspace.id, name)}
            />
          ))}
        </AnimatePresence>
      </div>

      <motion.button
        className="workspace-add-btn"
        onClick={onAdd}
        disabled={isMaxReached}
        title={isMaxReached ? `Maximum ${maxWorkspaces} workspaces reached` : 'Add new workspace'}
        variants={addButtonVariants}
        initial="initial"
        animate="animate"
        whileHover={!isMaxReached ? 'hover' : undefined}
        whileTap={!isMaxReached ? 'tap' : undefined}
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
    </motion.div>
  );
}
