import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const {
  mockWorkspace,
  serializeWorkspaceForExport,
  createWorkspaceExportFilename,
  downloadWorkspaceExport,
} = vi.hoisted(() => ({
  mockWorkspace: {
    id: 'workspace-1',
    name: 'Export Demo',
    state: {
      tool: 'select' as const,
      selectedShapeIds: [],
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
    shapes: [],
    createdAt: 1,
    updatedAt: 2,
  },
  serializeWorkspaceForExport: vi.fn(() => ({ format: 'tldraw-workspace-export', version: 1 })),
  createWorkspaceExportFilename: vi.fn(() => 'export-demo-2026-04-16T09-15-30Z.json'),
  downloadWorkspaceExport: vi.fn(),
}));

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
    shapes: [],
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
}));

import App from './App';

describe('App export action', () => {
  it('should export the active workspace through the versioned serializer', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));

    expect(serializeWorkspaceForExport).toHaveBeenCalledWith(mockWorkspace);
    expect(createWorkspaceExportFilename).toHaveBeenCalledWith('Export Demo');
    expect(downloadWorkspaceExport).toHaveBeenCalledWith(
      { format: 'tldraw-workspace-export', version: 1 },
      'export-demo-2026-04-16T09-15-30Z.json'
    );
  });
});
