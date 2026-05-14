import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorState, Shape, ShapeStyle } from './types';

const { createInitialEditorState, getNextTextId, resetMockState } = vi.hoisted(() => {
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

  let nextTextId = 1;

  return {
    baseStyle,
    createInitialEditorState: (): EditorState => ({
      tool: 'select',
      selectedShapeIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
      isDragging: false,
      isDrawing: false,
      shapeStyle: { ...baseStyle },
      editingTextId: null,
    }),
    getNextTextId: () => `text-${nextTextId++}`,
    resetMockState: () => {
      nextTextId = 1;
    },
  };
});

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
    const [shapes, setShapes] = React.useState<Shape[]>([]);
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
      shapes,
      editorState,
      setEditorState,
      addShape: (shape: Shape) => setShapes((previous) => [...previous, shape]),
      updateShape: vi.fn(),
      updateShapeBounds: vi.fn(),
      deleteShape: vi.fn(),
      deleteSelectedShapes: vi.fn(),
      selectShapes: (ids: string[]) =>
        setEditorState((previous) => ({ ...previous, selectedShapeIds: ids })),
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
      startTextEdit: (id: string) =>
        setEditorState((previous) => ({
          ...previous,
          editingTextId: id,
          selectedShapeIds: [id],
        })),
      commitTextEdit: () =>
        setEditorState((previous) => ({
          ...previous,
          editingTextId: null,
        })),
      cancelTextEdit: () =>
        setEditorState((previous) => ({
          ...previous,
          editingTextId: null,
        })),
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

vi.mock('./hooks/useKeyboard', () => ({
  useKeyboard: () => undefined,
}));

vi.mock('./stores/workspaceStore', () => ({
  useWorkspaceStore: () => ({
    workspaces: [
      {
        id: 'workspace-1',
        name: 'Text Tool Demo',
        state: createInitialEditorState(),
        shapes: [],
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    activeWorkspaceId: 'workspace-1',
    addWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    renameWorkspace: vi.fn(),
    switchWorkspace: vi.fn(),
    canDeleteWorkspace: vi.fn(() => false),
    getWorkspace: vi.fn((id: string) =>
      id === 'workspace-1'
        ? {
            id: 'workspace-1',
            name: 'Text Tool Demo',
            state: createInitialEditorState(),
            shapes: [],
            createdAt: 1,
            updatedAt: 1,
          }
        : undefined
    ),
    getActiveWorkspace: vi.fn(() => ({
      id: 'workspace-1',
      name: 'Text Tool Demo',
      state: createInitialEditorState(),
      shapes: [],
      createdAt: 1,
      updatedAt: 1,
    })),
    getNextWorkspaceNumber: vi.fn(() => 2),
    saveWorkspaceSnapshot: vi.fn(),
  }),
}));

interface MockCanvasProps {
  tool: string;
  style: ShapeStyle;
  shapes: Shape[];
  editingTextId: string | null;
  onShapeAdd: (shape: Shape) => void;
  onSelectionChange: (ids: string[]) => void;
  onTextEditStart: (id: string) => void;
  onTextEditCommit: () => void;
}

vi.mock('./components/Canvas', () => ({
  Canvas: (props: MockCanvasProps) => {
    const textShapeCount = props.shapes.filter((shape: Shape) => shape.type === 'text').length;
    const canAddText = props.tool === 'text' && !props.editingTextId;

    return React.createElement(
      'div',
      { 'data-testid': 'mock-canvas' },
      React.createElement('div', { 'data-testid': 'text-shape-count' }, String(textShapeCount)),
      React.createElement(
        'button',
        {
          'aria-label': 'Add text shape',
          disabled: !canAddText,
          onClick: () => {
            if (!canAddText) return;

            const id = getNextTextId();
            const shape: Shape = {
              id,
              type: 'text',
              text: '',
              bounds: { x: 40, y: 40, width: 200, height: 100 },
              fontSize: props.style.fontSize,
              fontFamily: props.style.fontFamily,
              fontWeight: props.style.fontWeight,
              fontStyle: props.style.fontStyle,
              textAlign: props.style.textAlign,
              style: { ...props.style },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            props.onShapeAdd(shape);
            props.onSelectionChange([id]);
            props.onTextEditStart(id);
          },
        },
        'Add text shape'
      ),
      React.createElement(
        'button',
        {
          'aria-label': 'Commit text edit',
          disabled: !props.editingTextId,
          onClick: () => props.onTextEditCommit(),
        },
        'Commit text edit'
      )
    );
  },
}));

vi.mock('./components/PropertiesPanel', () => ({
  PropertiesPanel: () => null,
}));

vi.mock('./components/ZoomControls', () => ({
  ZoomControls: () => null,
}));

vi.mock('./components/WorkspaceTabs', () => ({
  WorkspaceTabs: () => null,
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
  beforeEach(() => {
    resetMockState();
  });

  it('returns to select after committing text insertion', () => {
    render(<App />);

    const textToolButton = screen.getByLabelText('Text (T)');
    const selectToolButton = screen.getByLabelText('Select (V)');
    fireEvent.click(textToolButton);

    expect(textToolButton).toHaveClass('active');

    const addTextButton = screen.getByLabelText('Add text shape');
    fireEvent.click(addTextButton);

    expect(screen.getByTestId('text-shape-count')).toHaveTextContent('1');
    expect(textToolButton).toHaveClass('active');

    fireEvent.click(screen.getByLabelText('Commit text edit'));

    expect(textToolButton).not.toHaveClass('active');
    expect(selectToolButton).toHaveClass('active');
    expect(screen.getByLabelText('Add text shape')).toBeDisabled();

    fireEvent.click(textToolButton);
    fireEvent.click(screen.getByLabelText('Add text shape'));

    expect(screen.getByTestId('text-shape-count')).toHaveTextContent('2');
    expect(textToolButton).toHaveClass('active');
  });
});
