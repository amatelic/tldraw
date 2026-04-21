import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { shapeStyle, createEditorState, mockWorkspace } = vi.hoisted(() => {
  const shapeStyle = {
    color: '#111111',
    fillColor: '#ffffff',
    fillGradient: null,
    strokeWidth: 2,
    strokeStyle: 'solid' as const,
    fillStyle: 'none' as const,
    opacity: 1,
    blendMode: 'source-over' as const,
    shadows: [],
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal' as const,
    fontStyle: 'normal' as const,
    textAlign: 'left' as const,
  };

  const createEditorState = () => ({
    tool: 'select' as const,
    selectedShapeIds: [],
    camera: { x: 0, y: 0, zoom: 1 },
    isDragging: false,
    isDrawing: false,
    shapeStyle: { ...shapeStyle },
    editingTextId: null,
  });

  const mockWorkspace = {
    id: 'workspace-1',
    name: 'Workspace 1',
    state: createEditorState(),
    shapes: [],
    createdAt: 1,
    updatedAt: 2,
  };

  return {
    shapeStyle,
    createEditorState,
    mockWorkspace,
  };
});

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, {}, children),
}));

vi.mock('./hooks/useCanvas', () => ({
  useCanvas: () => {
    const [shapes, setShapes] = React.useState<Array<Record<string, unknown>>>([]);
    const [editorState, setEditorStateState] = React.useState(createEditorState);

    return {
      canvasRef: { current: null },
      shapes,
      editorState,
      setEditorState: (
        updater:
          | typeof editorState
          | ((prev: typeof editorState) => typeof editorState)
      ) => {
        setEditorStateState((prev) =>
          typeof updater === 'function' ? updater(prev) : updater
        );
      },
      addShape: (shape: Record<string, unknown>) => {
        setShapes((prev) => [...prev, shape]);
      },
      updateShape: vi.fn(),
      deleteShape: vi.fn(),
      deleteSelectedShapes: vi.fn(),
      selectShapes: vi.fn(),
      clearSelection: vi.fn(),
      screenToWorld: vi.fn((point) => point),
      worldToScreen: vi.fn((point) => point),
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
    };
  },
}));

vi.mock('./hooks/useKeyboard', () => ({
  useKeyboard: () => undefined,
}));

vi.mock('./hooks/useElementSize', () => ({
  useElementSize: () => ({ width: 1200, height: 800 }),
}));

vi.mock('./stores/workspaceStore', () => ({
  useWorkspaceStore: () => ({
    workspaces: [mockWorkspace],
    activeWorkspaceId: mockWorkspace.id,
    addWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    renameWorkspace: vi.fn(),
    switchWorkspace: vi.fn(),
    canDeleteWorkspace: vi.fn(() => false),
    getWorkspace: vi.fn(() => mockWorkspace),
    getActiveWorkspace: vi.fn(() => mockWorkspace),
    getNextWorkspaceNumber: vi.fn(() => 2),
    updateWorkspaceShapes: vi.fn(),
    updateWorkspaceState: vi.fn(),
  }),
}));

vi.mock('./components/WorkspaceTabs', () => ({
  WorkspaceTabs: () => React.createElement('div', {}, 'WorkspaceTabs'),
}));

vi.mock('./components/Toolbar', () => ({
  Toolbar: ({
    currentTool,
    onToolChange,
  }: {
    currentTool: string;
    onToolChange: (tool: 'text' | 'select') => void;
  }) =>
    React.createElement(
      'div',
      {},
      React.createElement('output', { 'data-testid': 'current-tool' }, currentTool),
      React.createElement(
        'button',
        { onClick: () => onToolChange('text') },
        'Activate Text Tool'
      ),
      React.createElement(
        'button',
        { onClick: () => onToolChange('select') },
        'Activate Select Tool'
      )
    ),
}));

vi.mock('./components/PropertiesPanel', () => ({
  PropertiesPanel: () => null,
}));

vi.mock('./components/ZoomControls', () => ({
  ZoomControls: () => React.createElement('div', {}, 'ZoomControls'),
}));

vi.mock('./components/Canvas', () => ({
  Canvas: ({
    shapes,
    onShapeAdd,
  }: {
    shapes: Array<Record<string, unknown>>;
    onShapeAdd: (shape: Record<string, unknown>) => void;
  }) =>
    React.createElement(
      'div',
      {},
      React.createElement('output', { 'data-testid': 'shape-count' }, String(shapes.length)),
      React.createElement(
        'button',
        {
          onClick: () =>
            onShapeAdd({
              id: `text-${shapes.length + 1}`,
              type: 'text',
              bounds: {
                x: 100 + shapes.length * 24,
                y: 100,
                width: 200,
                height: 100,
              },
              text: '',
              fontSize: shapeStyle.fontSize,
              fontFamily: shapeStyle.fontFamily,
              fontWeight: shapeStyle.fontWeight,
              fontStyle: shapeStyle.fontStyle,
              textAlign: shapeStyle.textAlign,
              style: { ...shapeStyle },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }),
        },
        'Add Text Shape'
      )
    ),
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

import App from './App';

describe('App text tool behavior', () => {
  it('keeps the text tool active across consecutive text insertions', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Activate Text Tool' }));
    expect(screen.getByTestId('current-tool')).toHaveTextContent('text');

    fireEvent.click(screen.getByRole('button', { name: 'Add Text Shape' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Text Shape' }));

    expect(screen.getByTestId('current-tool')).toHaveTextContent('text');
    expect(screen.getByTestId('shape-count')).toHaveTextContent('2');
  });

  it('still lets the user switch away from text mode manually', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Activate Text Tool' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Text Shape' }));
    fireEvent.click(screen.getByRole('button', { name: 'Activate Select Tool' }));

    expect(screen.getByTestId('current-tool')).toHaveTextContent('select');
    expect(screen.getByTestId('shape-count')).toHaveTextContent('1');
  });
});
