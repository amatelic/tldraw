import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STYLE,
  WORKSPACE_EXPORT_FORMAT,
  WORKSPACE_EXPORT_VERSION,
  generateBounds,
} from './index';
import type { EditorState, Shape, WorkspaceExportDocumentV1 } from './index';

describe('types barrel', () => {
  it('re-exports runtime constants from focused modules', () => {
    expect(DEFAULT_STYLE.fontFamily).toBe('sans-serif');
    expect(WORKSPACE_EXPORT_FORMAT).toBe('tldraw-workspace-export');
    expect(WORKSPACE_EXPORT_VERSION).toBe(1);
  });

  it('keeps shared helper exports available from the compatibility barrel', () => {
    expect(generateBounds({ x: 10, y: 20 }, { x: 4, y: 28 })).toEqual({
      x: 4,
      y: 20,
      width: 6,
      height: 8,
    });
  });

  it('supports type imports through the compatibility barrel', () => {
    const shape: Shape = {
      id: 'shape-1',
      type: 'rectangle',
      bounds: { x: 0, y: 0, width: 100, height: 80 },
      style: DEFAULT_STYLE,
      createdAt: 1,
      updatedAt: 1,
    };

    const editorState: EditorState = {
      tool: 'select',
      selectedShapeIds: [shape.id],
      camera: { x: 0, y: 0, zoom: 1 },
      isDragging: false,
      isDrawing: false,
      shapeStyle: DEFAULT_STYLE,
      editingTextId: null,
    };

    const exportedDocument: WorkspaceExportDocumentV1 = {
      format: WORKSPACE_EXPORT_FORMAT,
      version: WORKSPACE_EXPORT_VERSION,
      exportedAt: '2026-04-21T00:00:00.000Z',
      workspace: {
        id: 'workspace-1',
        name: 'Workspace 1',
        createdAt: 1,
        updatedAt: 1,
      },
      editor: {
        camera: editorState.camera,
      },
      content: {
        rootNodeIds: [shape.id],
        nodes: [],
      },
    };

    expect(editorState.selectedShapeIds).toEqual(['shape-1']);
    expect(exportedDocument.workspace.name).toBe('Workspace 1');
  });
});
