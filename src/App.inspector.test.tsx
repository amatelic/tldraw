import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockWorkspace,
  mockCanvasState,
  propertiesPanelSpy,
} = vi.hoisted(() => {
  const baseStyle = {
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

  const editorState = {
    tool: 'select' as const,
    selectedShapeIds: [] as string[],
    camera: { x: 0, y: 0, zoom: 1 },
    isDragging: false,
    isDrawing: false,
    shapeStyle: { ...baseStyle },
    editingTextId: null,
  };

  return {
    mockWorkspace: {
      id: 'workspace-1',
      name: 'Inspector Demo',
      state: editorState,
      shapes: [],
      createdAt: 1,
      updatedAt: 2,
    },
    mockCanvasState: {
      shapes: [] as Array<Record<string, unknown>>,
      editorState,
    },
    propertiesPanelSpy: vi.fn(),
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
  useCanvas: () => ({
    canvasRef: { current: null },
    shapes: mockCanvasState.shapes,
    editorState: mockCanvasState.editorState,
    setEditorState: vi.fn(),
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
  }),
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
    saveWorkspaceSnapshot: vi.fn(),
  }),
}));

vi.mock('./components/WorkspaceTabs', () => ({
  WorkspaceTabs: () => React.createElement('div', {}, 'WorkspaceTabs'),
}));

vi.mock('./components/Toolbar', () => ({
  Toolbar: () => React.createElement('div', {}, 'Toolbar'),
}));

vi.mock('./components/PropertiesPanel', () => ({
  PropertiesPanel: (props: Record<string, unknown>) => {
    propertiesPanelSpy(props);
    return React.createElement('div', { 'data-testid': 'properties-panel' });
  },
}));

vi.mock('./components/ZoomControls', () => ({
  ZoomControls: () => React.createElement('div', {}, 'ZoomControls'),
}));

vi.mock('./components/Canvas', () => ({
  Canvas: () => React.createElement('div', {}, 'Canvas'),
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

function createRectangle({
  id,
  x,
  y,
  width,
  height,
  style,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    id,
    type: 'rectangle',
    bounds: { x, y, width, height },
    style,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('App inspector wiring', () => {
  beforeEach(() => {
    propertiesPanelSpy.mockClear();
    mockCanvasState.shapes = [];
    mockCanvasState.editorState = {
      ...mockCanvasState.editorState,
      selectedShapeIds: [],
      shapeStyle: {
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
      },
    };
  });

  it('keeps the inspector hidden when no shapes are selected', () => {
    render(<App />);

    expect(propertiesPanelSpy).not.toHaveBeenCalled();
  });

  it('passes selected shape values to the inspector for single selection', () => {
    mockCanvasState.editorState = {
      ...mockCanvasState.editorState,
      selectedShapeIds: ['shape-1'],
      shapeStyle: {
        ...mockCanvasState.editorState.shapeStyle,
        color: '#2563eb',
        strokeWidth: 8,
      },
    };
    mockCanvasState.shapes = [
      createRectangle({
        id: 'shape-1',
        x: 16,
        y: 24,
        width: 120,
        height: 80,
        style: {
          ...mockCanvasState.editorState.shapeStyle,
          color: '#dc2626',
          strokeWidth: 2,
        },
      }),
    ];

    render(<App />);

    const props = propertiesPanelSpy.mock.calls.at(-1)?.[0] as Record<string, unknown>;

    expect(props.selectedCount).toBe(1);
    expect(props.canGroup).toBe(false);
    expect(props.style).toMatchObject({
      color: '#dc2626',
      strokeWidth: 2,
    });
    expect(props.layoutBounds).toEqual({ x: 16, y: 24, width: 120, height: 80 });
  });

  it('passes shared multi-selection values and metadata to the inspector', () => {
    mockCanvasState.editorState = {
      ...mockCanvasState.editorState,
      selectedShapeIds: ['shape-2', 'shape-1'],
      shapeStyle: {
        ...mockCanvasState.editorState.shapeStyle,
        color: '#2563eb',
      },
    };
    mockCanvasState.shapes = [
      createRectangle({
        id: 'shape-1',
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        style: {
          ...mockCanvasState.editorState.shapeStyle,
          color: '#dc2626',
          strokeWidth: 4,
          opacity: 0.5,
        },
      }),
      createRectangle({
        id: 'shape-2',
        x: 140,
        y: 20,
        width: 100,
        height: 80,
        style: {
          ...mockCanvasState.editorState.shapeStyle,
          color: '#16a34a',
          strokeWidth: 4,
          opacity: 0.5,
        },
      }),
    ];

    render(<App />);

    const props = propertiesPanelSpy.mock.calls.at(-1)?.[0] as Record<string, unknown>;

    expect(props.selectedCount).toBe(2);
    expect(props.canGroup).toBe(true);
    expect(props.canUngroup).toBe(false);
    expect(props.style).toMatchObject({
      strokeWidth: 4,
      opacity: 0.5,
    });
    expect(props.mixedStyleKeys).toEqual(expect.arrayContaining(['color']));
    expect(props.layoutBounds).toEqual({ x: 0, y: 0, width: 240, height: 100 });
    expect(props.selectedItems).toEqual([
      {
        id: 'shape-1',
        typeLabel: 'Rectangle',
        layerIndex: 0,
        hierarchyLabel: 'Ungrouped',
      },
      {
        id: 'shape-2',
        typeLabel: 'Rectangle',
        layerIndex: 1,
        hierarchyLabel: 'Ungrouped',
      },
    ]);
  });
});
