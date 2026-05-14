import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

export interface CanvasContextMenuState {
  x: number;
  y: number;
}

interface CanvasContextMenuProps {
  contextMenu: CanvasContextMenuState | null;
  canvasSize: { width: number; height: number };
  hasValidState: boolean;
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
  onDeleteSelected: () => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onClose: () => void;
}

const CONTEXT_MENU_BUTTON_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  width: '100%',
  padding: '10px 12px',
  border: 'none',
  borderRadius: '8px',
  background: 'transparent',
  color: '#0f172a',
  fontSize: '13px',
  fontWeight: 500,
  textAlign: 'left',
  cursor: 'pointer',
};

const CONTEXT_MENU_HINT_STYLE: CSSProperties = {
  color: '#64748b',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
};

function getContextMenuStyle(
  contextMenu: CanvasContextMenuState,
  canvasSize: { width: number; height: number }
): CSSProperties {
  const maxLeft = Math.max(8, canvasSize.width - 188);
  const maxTop = Math.max(8, canvasSize.height - 212);

  return {
    position: 'absolute',
    left: `${Math.min(contextMenu.x, maxLeft)}px`,
    top: `${Math.min(contextMenu.y, maxTop)}px`,
    display: 'flex',
    flexDirection: 'column',
    minWidth: '180px',
    padding: '8px',
    borderRadius: '12px',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: 'rgba(255, 255, 255, 0.98)',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
    backdropFilter: 'blur(16px)',
    zIndex: 1100,
    gap: '4px',
  };
}

export function CanvasContextMenu({
  contextMenu,
  canvasSize,
  hasValidState,
  canGroupSelection,
  canUngroupSelection,
  onDeleteSelected,
  onGroupSelected,
  onUngroupSelected,
  onBringToFront,
  onSendToBack,
  onClose,
}: CanvasContextMenuProps) {
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && contextMenuRef.current?.contains(target)) {
        return;
      }

      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu, onClose]);

  useEffect(() => {
    if (!contextMenu || hasValidState) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      onClose();
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [contextMenu, hasValidState, onClose]);

  if (!contextMenu) {
    return null;
  }

  const runAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={contextMenuRef}
      role="menu"
      aria-label="Canvas actions"
      style={getContextMenuStyle(contextMenu, canvasSize)}
    >
      <button
        type="button"
        role="menuitem"
        style={CONTEXT_MENU_BUTTON_STYLE}
        onClick={() => runAction(onDeleteSelected)}
      >
        <span>Delete</span>
        <span style={CONTEXT_MENU_HINT_STYLE}>Del</span>
      </button>
      {canGroupSelection && (
        <button
          type="button"
          role="menuitem"
          style={CONTEXT_MENU_BUTTON_STYLE}
          onClick={() => runAction(onGroupSelected)}
        >
          <span>Group Selection</span>
          <span style={CONTEXT_MENU_HINT_STYLE}>Ctrl+G</span>
        </button>
      )}
      {canUngroupSelection && (
        <button
          type="button"
          role="menuitem"
          style={CONTEXT_MENU_BUTTON_STYLE}
          onClick={() => runAction(onUngroupSelected)}
        >
          <span>Ungroup</span>
          <span style={CONTEXT_MENU_HINT_STYLE}>Ctrl+Shift+G</span>
        </button>
      )}
      <div
        aria-hidden="true"
        style={{ height: '1px', margin: '4px 0', background: 'rgba(148, 163, 184, 0.22)' }}
      />
      <button
        type="button"
        role="menuitem"
        style={CONTEXT_MENU_BUTTON_STYLE}
        onClick={() => runAction(onBringToFront)}
      >
        <span>Bring To Front</span>
        <span style={CONTEXT_MENU_HINT_STYLE}>Top</span>
      </button>
      <button
        type="button"
        role="menuitem"
        style={CONTEXT_MENU_BUTTON_STYLE}
        onClick={() => runAction(onSendToBack)}
      >
        <span>Send To Back</span>
        <span style={CONTEXT_MENU_HINT_STYLE}>Back</span>
      </button>
    </div>
  );
}
