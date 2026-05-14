import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorState, Shape, ShapeStyle } from './types';

const { createInitialEditorState } = vi.hoisted(() => {
  const baseStyle: ShapeStyle = {
    color: '#111111',
    fillColor: '#ffffff',
    fillGradient: null,
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'none',
    opacity: 1,
    blendMode: 'source-over',
    shadows: [],
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
  };

  return {
    createInitialEditorState: (): EditorState => ({
      tool: 'select',
      selectedShapeIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
      isDragging: false,
      isDrawing: false,
      shapeStyle: { ...baseStyle },
      editingTextId: null,
    }),
  };
});

function getActiveWorkspace() {
  return {
    id: 'workspace-1',
    name: 'Tool Demo',
    state: createInitialEditorState(),
    shapes: [] as Shape[],
    createdAt: 1,
    updatedAt: 1,
  };
}

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('div', props, children),
    button: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('button', props, children),
    svg: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('svg', props, children),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, {}, children),
}));

vi.mock('./hooks/useCanvas', () => ({
  useCanvas: () => {
    const [editorState, setEditorStateState] = React.useState<EditorState>(
      createInitialEditorState()
    );

    const setEditorState = (
      updates: EditorState | ((previous: EditorState) => EditorState)
    ) => {
      setEditorStateState((previous) =>
        typeof updates === 'function' ? updates(previous) : updates
      );
    };

    return {
      canvasRef: { current: null },
      shapes: [],
      editorState,
      setEditorState,
      addShape: vi.fn(),
      updateShape: vi.fn(),
      updateShapeBounds: vi.fn(),
      deleteShape: vi.fn(),
      deleteSelectedShapes: vi.fn(),
      selectShapes: vi.fn(),
      clearSelection: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetZoom: vi.fn(),
      zoomAt: vi.fn(),
      pan: vi.fn(),
      updateShapeStyle: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: false,
      canRedo: false,
      startTextEdit: vi.fn(),
      commitTextEdit: vi.fn(),
      cancelTextEdit: vi.fn(),
      applyGeneratedDiagram: vi.fn(() => ({ success: true, error: null, appliedShapeIds: [] })),
      applyMutationProposal: vi.fn(() => ({ success: true, error: null, appliedShapeIds: [] })),
      groupShapes: vi.fn(),
      ungroupShapes: vi.fn(),
      bringShapesToFront: vi.fn(),
      sendShapesToBack: vi.fn(),
      alignShapes: vi.fn(),
      distributeShapes: vi.fn(),
      tidyShapes: vi.fn(),
    };
  },
}));

vi.mock('./hooks/useElementSize', () => ({
  useElementSize: () => ({ width: 1200, height: 800 }),
}));

vi.mock('./hooks/useDevColorOverrides', () => ({
  useDevColorOverrides: () => undefined,
}));

vi.mock('./stores/workspaceStore', () => ({
  normalizePersistedWorkspaceState: (state: EditorState) => ({
    tool: state.tool,
    selectedShapeIds: [...state.selectedShapeIds],
    camera: { ...state.camera },
    shapeStyle: { ...state.shapeStyle },
  }),
  useWorkspaceStore: () => ({
    workspaces: [getActiveWorkspace()],
    activeWorkspaceId: 'workspace-1',
    addWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    renameWorkspace: vi.fn(),
    switchWorkspace: vi.fn(),
    canDeleteWorkspace: vi.fn(() => false),
    getWorkspace: vi.fn(() => getActiveWorkspace()),
    getActiveWorkspace: vi.fn(() => getActiveWorkspace()),
    getNextWorkspaceNumber: vi.fn(() => 2),
    saveWorkspaceSnapshot: vi.fn(),
  }),
}));

vi.mock('./components/WorkspaceTabs', () => ({
  WorkspaceTabs: () => React.createElement('div', {}, 'WorkspaceTabs'),
}));

vi.mock('./components/Canvas', () => ({
  Canvas: ({ tool }: { tool: string }) =>
    React.createElement('div', { 'data-testid': 'mock-canvas', 'data-tool': tool }, 'Canvas'),
}));

vi.mock('./components/PropertiesPanel', () => ({
  PropertiesPanel: () => null,
}));

vi.mock('./components/ZoomControls', () => ({
  ZoomControls: () => React.createElement('div', {}, 'ZoomControls'),
}));

vi.mock('./components/ImageUploadDialog', () => ({
  ImageUploadDialog: () => null,
}));

vi.mock('./components/AudioUploadDialog', () => ({
  AudioUploadDialog: () => null,
}));

vi.mock('./components/EmbedDialog', () => ({
  EmbedDialog: () => null,
}));

vi.mock('./components/AgentPanel', () => ({
  AgentPanel: () => null,
}));

vi.mock('./components/DevColorTool', () => ({
  DevColorTool: () => null,
}));

import App from './App';

describe('App tool selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects tools from keyboard shortcuts and toolbar clicks', () => {
    render(<App />);

    expect(screen.getByLabelText('Select (V)')).toHaveClass('active');
    expect(screen.getByTestId('mock-canvas')).toHaveAttribute('data-tool', 'select');

    fireEvent.keyDown(window, { key: 'r' });

    expect(screen.getByLabelText('Rectangle (R)')).toHaveClass('active');
    expect(screen.getByLabelText('Select (V)')).not.toHaveClass('active');
    expect(screen.getByTestId('mock-canvas')).toHaveAttribute('data-tool', 'rectangle');

    fireEvent.click(screen.getByLabelText('Circle (C)'));

    expect(screen.getByLabelText('Circle (C)')).toHaveClass('active');
    expect(screen.getByLabelText('Rectangle (R)')).not.toHaveClass('active');
    expect(screen.getByTestId('mock-canvas')).toHaveAttribute('data-tool', 'circle');

    fireEvent.keyDown(window, { key: 'v' });

    expect(screen.getByLabelText('Select (V)')).toHaveClass('active');
    expect(screen.getByLabelText('Circle (C)')).not.toHaveClass('active');
    expect(screen.getByTestId('mock-canvas')).toHaveAttribute('data-tool', 'select');
  });
});
