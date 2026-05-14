import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Shape } from './types';

const {
  mockCanvasState,
  serializeWorkspaceForExport,
  createWorkspaceExportFilename,
  downloadWorkspaceExport,
  downloadViewportAsPng,
  downloadShapesAsPng,
  downloadShapesAsSvg,
} = vi.hoisted(() => ({
  mockCanvasState: {
    shapes: [] as Shape[],
    editorState: {
      tool: 'select' as const,
      selectedShapeIds: [] as string[],
      camera: { x: 0, y: 0, zoom: 1 },
      isDragging: false,
      isDrawing: false,
      shapeStyle: {
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
      },
      editingTextId: null,
    },
    canvasElement: {
      getBoundingClientRect: vi.fn(() => ({ width: 1200, height: 800 })),
    } as unknown as HTMLCanvasElement,
  },
  serializeWorkspaceForExport: vi.fn(() => ({ format: 'tldraw-workspace-export', version: 1 })),
  createWorkspaceExportFilename: vi.fn(() => 'export-demo-2026-04-16T09-15-30Z.json'),
  downloadWorkspaceExport: vi.fn(),
  downloadViewportAsPng: vi.fn(),
  downloadShapesAsPng: vi.fn(),
  downloadShapesAsSvg: vi.fn(),
}));

function getActiveWorkspace() {
  return {
    id: 'workspace-1',
    name: 'Export Demo',
    state: mockCanvasState.editorState,
    shapes: mockCanvasState.shapes,
    createdAt: 1,
    updatedAt: 2,
  };
}

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
    canvasRef: { current: mockCanvasState.canvasElement },
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
  normalizePersistedWorkspaceState: (state: typeof mockCanvasState.editorState) => ({
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

vi.mock('./components/Toolbar', () => ({
  Toolbar: () => React.createElement('div', {}, 'Toolbar'),
}));

vi.mock('./components/PropertiesPanel', () => ({
  PropertiesPanel: () => null,
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

vi.mock('./utils/workspaceExport', () => ({
  serializeWorkspaceForExport,
  createWorkspaceExportFilename,
  downloadWorkspaceExport,
}));

vi.mock('./canvas/export', async () => {
  const actual = await vi.importActual<typeof import('./canvas/export')>('./canvas/export');

  return {
    ...actual,
    downloadViewportAsPng,
    downloadShapesAsPng,
    downloadShapesAsSvg,
  };
});

import App from './App';

describe('App export actions', () => {
  beforeEach(() => {
    mockCanvasState.shapes = [];
    mockCanvasState.editorState = {
      ...mockCanvasState.editorState,
      selectedShapeIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
    };
    vi.clearAllMocks();
  });

  it('exports the active workspace through the versioned JSON serializer', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));

    expect(serializeWorkspaceForExport).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workspace-1',
        name: 'Export Demo',
        shapes: mockCanvasState.shapes,
        state: expect.objectContaining({
          camera: mockCanvasState.editorState.camera,
        }),
      })
    );
    expect(createWorkspaceExportFilename).toHaveBeenCalledWith('Export Demo');
    expect(downloadWorkspaceExport).toHaveBeenCalledWith(
      { format: 'tldraw-workspace-export', version: 1 },
      'export-demo-2026-04-16T09-15-30Z.json'
    );
  });

  it('exports the current viewport as PNG from the export menu', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Current viewport PNG' }));

    expect(downloadViewportAsPng).toHaveBeenCalledWith({
      canvas: mockCanvasState.canvasElement,
      camera: mockCanvasState.editorState.camera,
      shapes: [],
      workspaceName: 'Export Demo',
    });
  });

  it('exports the normalized selected shapes as SVG', () => {
    mockCanvasState.shapes = [
      {
        id: 'shape-1',
        type: 'rectangle',
        bounds: { x: 20, y: 30, width: 120, height: 80 },
        style: { ...mockCanvasState.editorState.shapeStyle },
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    mockCanvasState.editorState = {
      ...mockCanvasState.editorState,
      selectedShapeIds: ['shape-1'],
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Selected SVG' }));

    expect(downloadShapesAsSvg).toHaveBeenCalledWith({
      shapes: mockCanvasState.shapes,
      workspaceName: 'Export Demo',
      scope: 'selected',
    });
  });
});
