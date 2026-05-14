import { useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AgentPanel } from '../components/AgentPanel';
import { AudioUploadDialog } from '../components/AudioUploadDialog';
import { Canvas } from '../components/Canvas';
import { DevColorTool } from '../components/DevColorTool';
import { EmbedDialog } from '../components/EmbedDialog';
import { ImageUploadDialog } from '../components/ImageUploadDialog';
import { LeftSidebar } from '../components/LeftSidebar';
import type { LeftSidebarProps } from '../components/LeftSidebar';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { Toolbar } from '../components/Toolbar';
import { WorkspaceTabs } from '../components/WorkspaceTabs';
import { ZoomControls } from '../components/ZoomControls';
import { useDevToolStore } from '../stores/devToolStore';
import { useDevColorOverrides } from '../hooks/useDevColorOverrides';

export interface AppHeaderExportAction {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface AppHeaderActions {
  isAgentPanelOpen: boolean;
  onExportWorkspace: () => void;
  exportActions: AppHeaderExportAction[];
  onToggleAgentPanel: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}

export interface AppShellProps {
  workspaceTabsProps: ComponentProps<typeof WorkspaceTabs>;
  headerActions: AppHeaderActions;
  toolbarProps: ComponentProps<typeof Toolbar>;
  canvasProps: ComponentProps<typeof Canvas>;
  zoomControlsProps: ComponentProps<typeof ZoomControls>;
  propertiesPanelProps: ComponentProps<typeof PropertiesPanel> | null;
  agentPanelProps: ComponentProps<typeof AgentPanel> | null;
  leftSidebarProps: LeftSidebarProps;
  imageDialogProps: ComponentProps<typeof ImageUploadDialog>;
  audioDialogProps: ComponentProps<typeof AudioUploadDialog>;
  embedDialogProps: ComponentProps<typeof EmbedDialog>;
}

export function AppShell({
  workspaceTabsProps,
  headerActions,
  toolbarProps,
  canvasProps,
  zoomControlsProps,
  propertiesPanelProps,
  agentPanelProps,
  leftSidebarProps,
  imageDialogProps,
  audioDialogProps,
  embedDialogProps,
}: AppShellProps) {
  const isDev = import.meta.env.DEV;
  const toggleDevTool = useDevToolStore((s) => s.toggle);
  const isDevToolOpen = useDevToolStore((s) => s.isOpen);

  useDevColorOverrides();

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isExportMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && exportMenuRef.current?.contains(target)) {
        return;
      }

      setIsExportMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExportMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExportMenuOpen]);

  const handleExportActionClick = (action: AppHeaderExportAction) => {
    action.onSelect();
    setIsExportMenuOpen(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-body">
          <WorkspaceTabs {...workspaceTabsProps} />

          <div className="header-actions">
            <div className="header-export" ref={exportMenuRef}>
              <button
                className={`action-button${isExportMenuOpen ? ' active' : ''}`}
                onClick={() => setIsExportMenuOpen((current) => !current)}
                aria-haspopup="menu"
                aria-expanded={isExportMenuOpen}
                title="Export the board as PNG or SVG"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v12" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
                Export
              </button>

              {isExportMenuOpen && (
                <div className="header-export-popover" role="menu" aria-label="Export options">
                  {headerActions.exportActions.map((action) => (
                    <button
                      key={action.id}
                      className="header-export-option"
                      role="menuitem"
                      onClick={() => handleExportActionClick(action)}
                      disabled={action.disabled}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="action-button"
              onClick={headerActions.onExportWorkspace}
              title="Export active workspace as versioned JSON"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12" />
                <path d="M7 10l5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              Export JSON
            </button>
            <button
              className={`action-button${headerActions.isAgentPanelOpen ? ' active' : ''}`}
              onClick={headerActions.onToggleAgentPanel}
              title={headerActions.isAgentPanelOpen ? 'Close Agent' : 'Open Agent'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l7 4v5c0 4.97-3.05 8.98-7 10-3.95-1.02-7-5.03-7-10V7l7-4z" />
                <path d="M9.5 11.5a2.5 2.5 0 015 0c0 1.4-1.1 1.94-1.9 2.47-.52.34-.85.64-.85 1.03" />
                <circle cx="12" cy="17.5" r=".5" fill="currentColor" stroke="none" />
              </svg>
              Agent
            </button>
            <button
              className="action-button"
              onClick={headerActions.onUndo}
              disabled={!headerActions.canUndo}
              title="Undo (Ctrl+Z)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v6h6M3 13c0-4.97 4.03-9 9-9 4.97 0 9 4.03 9 9s-4.03 9-9 9c-2.39 0-4.68-.94-6.36-2.64L3 13" />
              </svg>
              Undo
            </button>
            <button
              className="action-button"
              onClick={headerActions.onRedo}
              disabled={!headerActions.canRedo}
              title="Redo (Ctrl+Y)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 7v6h-6M21 13c0-4.97-4.03-9-9-9-4.97 0-9 4.03-9 9s4.03 9 9 9c2.39 0 4.68-.94 6.36-2.64L21 13" />
              </svg>
              Redo
            </button>
            <button
              className="action-button delete"
              onClick={headerActions.onDeleteSelected}
              disabled={!headerActions.hasSelection}
              title="Delete Selected (Delete)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
            {isDev && (
              <button
                className={`action-button${isDevToolOpen ? ' active' : ''}`}
                onClick={toggleDevTool}
                title="Toggle Design Tokens"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <LeftSidebar {...leftSidebarProps} />

      <main className="app-main">
        <Toolbar {...toolbarProps} />

        <div className="canvas-container">
          <Canvas {...canvasProps} />
          <ZoomControls {...zoomControlsProps} />
        </div>

        <AnimatePresence mode="popLayout">
          {propertiesPanelProps && (
            <motion.div
              key="properties-panel"
              initial={{ x: 240, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 240, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 1,
              }}
              className="properties-panel-wrapper"
            >
              <PropertiesPanel {...propertiesPanelProps} />
            </motion.div>
          )}

          {agentPanelProps && (
            <motion.div
              key="agent-panel"
              initial={{ x: 240, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 240, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 1,
              }}
              className="properties-panel-wrapper agent-sidebar-wrapper"
            >
              <AgentPanel {...agentPanelProps} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ImageUploadDialog {...imageDialogProps} />
      <AudioUploadDialog {...audioDialogProps} />
      <EmbedDialog {...embedDialogProps} />
      {isDev && <DevColorTool />}
    </div>
  );
}
