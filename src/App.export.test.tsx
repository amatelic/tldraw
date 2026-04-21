import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const {
  mockShape,
  mockCanvasElement,
  mockWorkspace,
  serializeWorkspaceForExport,
  createWorkspaceExportFilename,
  downloadWorkspaceExport,
  createCanvasExportFilename,
  downloadDataUrlExport,
  downloadStringExport,
  exportViewportToPng,
  exportShapesToPng,
  exportShapesToSvg,
} = vi.hoisted(() => {
  const mockShape = {
    id: 'shape-1',
    type: 'rectangle' as const,
    bounds: { x: 24, y: 48, width: 180, height: 120 },
    style: {
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
    createdAt: 1,
    updatedAt: 2,
  };

  const mockCanvasElement = {
    toDataURL: vi.fn(() => 'data:image/png;base64,viewport'),
  } as unknown as HTMLCanvasElement;

  const mockWorkspace = {
    id: 'workspace-1',
    name: 'Export Demo',
    state: {
      tool: 'select' as const,
      selectedShapeIds: [mockShape.id],
      camera: { x: 0, y: 0, zoom: 1 },
      isDragging: false,
      isDrawing: false,
      shapeStyle: { ...mockShape.style },
      editingTextId: null,
    },
    shapes: [mockShape],
    createdAt: 1,
    updatedAt: 2,
  };

  return {
    mockShape,
    mockCanvasElement,
    mockWorkspace,
    serializeWorkspaceForExport: vi.fn(() => ({ format: 'tldraw-workspace-export', version: 1 })),
    createWorkspaceExportFilename: vi.fn(() => 'export-demo-2026-04-16T09-15-30Z.json'),
    downloadWorkspaceExport: vi.fn(),
    createCanvasExportFilename: vi.fn(
      (_workspaceName: string, format: 'png' | 'svg', scope: 'viewport' | 'all' | 'selection') =>
        `export-demo-${scope}.${format}`
    ),
    downloadDataUrlExport: vi.fn(),
    downloadStringExport: vi.fn(),
    exportViewportToPng: vi.fn(() => 'data:image/png;base64,viewport'),
    exportShapesToPng: vi.fn(() => 'data:image/png;base64,shapes'),
    exportShapesToSvg: vi.fn(() => '<svg />'),
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

vi.mock('./canvas/CanvasEngine', () => ({
  CanvasEngine: {
    exportViewportToPng,
    exportShapesToPng,
    exportShapesToSvg,
  },
}));

vi.mock('./hooks/useCanvas', () => ({
  useCanvas: () => ({
    canvasRef: { current: mockCanvasElement },
    shapes: [mockShape],
    editorState: mockWorkspace.state,
    setEditorState: vi.fn(),
    addShape: vi.fn(),
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
    updateWorkspaceShapes: vi.fn(),
    updateWorkspaceState: vi.fn(),
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
  createCanvasExportFilename,
  downloadDataUrlExport,
  downloadStringExport,
}));

import App from './App';

function openExportMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));
}

describe('App export actions', () => {
  it('exports the active workspace JSON from the export menu', () => {
    render(<App />);

    openExportMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export JSON' }));

    expect(serializeWorkspaceForExport).toHaveBeenCalledWith(mockWorkspace);
    expect(createWorkspaceExportFilename).toHaveBeenCalledWith('Export Demo');
    expect(downloadWorkspaceExport).toHaveBeenCalledWith(
      { format: 'tldraw-workspace-export', version: 1 },
      'export-demo-2026-04-16T09-15-30Z.json'
    );
  });

  it('exports the current viewport as a PNG', () => {
    render(<App />);

    openExportMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export PNG Viewport' }));

    expect(exportViewportToPng).toHaveBeenCalledWith(mockCanvasElement);
    expect(createCanvasExportFilename).toHaveBeenCalledWith('Export Demo', 'png', 'viewport');
    expect(downloadDataUrlExport).toHaveBeenCalledWith(
      'data:image/png;base64,viewport',
      'export-demo-viewport.png'
    );
  });

  it('exports the selected shapes as SVG', () => {
    render(<App />);

    openExportMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export SVG Selected Shapes' }));

    expect(exportShapesToSvg).toHaveBeenCalledWith([mockShape]);
    expect(createCanvasExportFilename).toHaveBeenCalledWith('Export Demo', 'svg', 'selection');
    expect(downloadStringExport).toHaveBeenCalledWith(
      '<svg />',
      'export-demo-selection.svg',
      'image/svg+xml'
    );
  });
});
