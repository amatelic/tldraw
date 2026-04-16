import type { Workspace } from '../stores/workspaceStore';
import type {
  ExportedShape,
  Shape,
  WorkspaceExportDocumentV1,
} from '../types';
import {
  WORKSPACE_EXPORT_FORMAT,
  WORKSPACE_EXPORT_VERSION,
} from '../types';

function createBaseShape(shape: Shape, zIndex: number) {
  return {
    id: shape.id,
    bounds: { ...shape.bounds },
    style: {
      ...shape.style,
      shadows: shape.style.shadows.map((shadow) => ({ ...shadow })),
      fillGradient: shape.style.fillGradient ? { ...shape.style.fillGradient } : null,
    },
    createdAt: shape.createdAt,
    updatedAt: shape.updatedAt,
    parentId: shape.parentId ?? null,
    zIndex,
  };
}

function serializeShape(shape: Shape, zIndex: number): ExportedShape {
  const baseShape = createBaseShape(shape, zIndex);

  switch (shape.type) {
    case 'rectangle':
      return {
        ...baseShape,
        type: 'rectangle',
      };
    case 'circle':
      return {
        ...baseShape,
        type: 'circle',
        center: { ...shape.center },
        radius: shape.radius,
      };
    case 'line':
      return {
        ...baseShape,
        type: 'line',
        start: { ...shape.start },
        end: { ...shape.end },
      };
    case 'arrow':
      return {
        ...baseShape,
        type: 'arrow',
        start: { ...shape.start },
        end: { ...shape.end },
      };
    case 'pencil':
      return {
        ...baseShape,
        type: 'pencil',
        points: shape.points.map((point) => ({ ...point })),
      };
    case 'image':
      return {
        ...baseShape,
        type: 'image',
        src: shape.src,
        originalWidth: shape.originalWidth,
        originalHeight: shape.originalHeight,
        isBase64: shape.isBase64,
      };
    case 'audio':
      return {
        ...baseShape,
        type: 'audio',
        src: shape.src,
        duration: shape.duration,
        waveformData: [...shape.waveformData],
        isBase64: shape.isBase64,
        ...(shape.loop !== undefined ? { loop: shape.loop } : {}),
      };
    case 'text':
      return {
        ...baseShape,
        type: 'text',
        text: shape.text,
        fontSize: shape.fontSize,
        fontFamily: shape.fontFamily,
        fontWeight: shape.fontWeight,
        fontStyle: shape.fontStyle,
        textAlign: shape.textAlign,
      };
    case 'embed':
      return {
        ...baseShape,
        type: 'embed',
        url: shape.url,
        embedType: shape.embedType,
        embedSrc: shape.embedSrc,
      };
    case 'group':
      return {
        ...baseShape,
        type: 'group',
        childrenIds: [...shape.childrenIds],
      };
  }
}

export function serializeWorkspaceForExport(workspace: Workspace): WorkspaceExportDocumentV1 {
  const nodes = workspace.shapes.map((shape, index) => serializeShape(shape, index));

  return {
    format: WORKSPACE_EXPORT_FORMAT,
    version: WORKSPACE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    workspace: {
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    },
    editor: {
      camera: { ...workspace.state.camera },
    },
    content: {
      rootNodeIds: nodes.filter((node) => node.parentId === null).map((node) => node.id),
      nodes,
    },
  };
}

function sanitizeWorkspaceName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function createWorkspaceExportFilename(
  workspaceName: string,
  date: Date = new Date()
): string {
  const safeName = sanitizeWorkspaceName(workspaceName) || 'workspace';
  const timestamp = date.toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');
  return `${safeName}-${timestamp}.json`;
}

export function downloadWorkspaceExport(
  exportDocument: WorkspaceExportDocumentV1,
  filename: string
): void {
  const blob = new Blob([JSON.stringify(exportDocument, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
