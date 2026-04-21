import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Workspace } from '../stores/workspaceStore';
import type { ShapeStyle } from '../types';
import {
  createCanvasExportFilename,
  createWorkspaceExportFilename,
  downloadDataUrlExport,
  downloadStringExport,
  downloadWorkspaceExport,
  serializeWorkspaceForExport,
} from './workspaceExport';

const baseStyle: ShapeStyle = {
  color: '#111111',
  fillColor: '#ffffff',
  fillGradient: null,
  strokeWidth: 2,
  strokeStyle: 'solid',
  fillStyle: 'solid',
  opacity: 1,
  blendMode: 'source-over',
  shadows: [],
  fontSize: 16,
  fontFamily: 'sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
};

function createWorkspaceFixture(): Workspace {
  return {
    id: 'workspace-1',
    name: 'Architecture / Alpha',
    state: {
      tool: 'select',
      selectedShapeIds: ['group-root'],
      camera: { x: 120, y: 48, zoom: 1.5 },
      isDragging: true,
      isDrawing: false,
      shapeStyle: { ...baseStyle },
      editingTextId: 'text-1',
    },
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        bounds: { x: 0, y: 0, width: 240, height: 160 },
        style: { ...baseStyle },
        createdAt: 10,
        updatedAt: 20,
        childrenIds: ['rect-1', 'group-nested'],
      },
      {
        id: 'rect-1',
        type: 'rectangle',
        bounds: { x: 10, y: 20, width: 100, height: 60 },
        style: { ...baseStyle, color: '#2563eb' },
        createdAt: 11,
        updatedAt: 21,
        parentId: 'group-root',
      },
      {
        id: 'group-nested',
        type: 'group',
        bounds: { x: 120, y: 30, width: 100, height: 80 },
        style: { ...baseStyle },
        createdAt: 12,
        updatedAt: 22,
        parentId: 'group-root',
        childrenIds: ['text-1'],
      },
      {
        id: 'text-1',
        type: 'text',
        bounds: { x: 130, y: 40, width: 80, height: 30 },
        text: 'Queue',
        fontSize: 18,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
        style: {
          ...baseStyle,
          fontSize: 18,
          fontFamily: 'Georgia',
          fontWeight: 'bold',
          fontStyle: 'italic',
          textAlign: 'center',
        },
        createdAt: 13,
        updatedAt: 23,
        parentId: 'group-nested',
      },
      {
        id: 'audio-1',
        type: 'audio',
        bounds: { x: 300, y: 80, width: 180, height: 60 },
        src: 'data:audio/mp3;base64,AAA',
        duration: 42,
        isPlaying: true,
        waveformData: [0.2, 0.8, 0.4],
        isBase64: true,
        loop: true,
        style: { ...baseStyle },
        createdAt: 14,
        updatedAt: 24,
      },
    ],
    createdAt: 1,
    updatedAt: 25,
  };
}

describe('workspaceExport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should serialize a versioned export document with grouping and layer order preserved', () => {
    const workspace = createWorkspaceFixture();

    const result = serializeWorkspaceForExport(workspace);

    expect(result.format).toBe('tldraw-workspace-export');
    expect(result.version).toBe(1);
    expect(result.workspace).toEqual({
      id: 'workspace-1',
      name: 'Architecture / Alpha',
      createdAt: 1,
      updatedAt: 25,
    });
    expect(result.editor).toEqual({
      camera: { x: 120, y: 48, zoom: 1.5 },
    });
    expect(result.content.rootNodeIds).toEqual(['group-root', 'audio-1']);
    expect(result.content.nodes.map((node) => node.id)).toEqual([
      'group-root',
      'rect-1',
      'group-nested',
      'text-1',
      'audio-1',
    ]);
    expect(result.content.nodes.map((node) => node.zIndex)).toEqual([0, 1, 2, 3, 4]);

    const rootGroup = result.content.nodes[0];
    const nestedGroup = result.content.nodes[2];
    const textNode = result.content.nodes[3];
    const audioNode = result.content.nodes[4];

    expect(rootGroup.type).toBe('group');
    expect(rootGroup.parentId).toBeNull();
    expect(rootGroup.type === 'group' ? rootGroup.childrenIds : []).toEqual([
      'rect-1',
      'group-nested',
    ]);

    expect(nestedGroup.type).toBe('group');
    expect(nestedGroup.parentId).toBe('group-root');
    expect(nestedGroup.type === 'group' ? nestedGroup.childrenIds : []).toEqual(['text-1']);

    expect(textNode.type).toBe('text');
    expect(textNode.parentId).toBe('group-nested');

    expect(audioNode.type).toBe('audio');
    expect(audioNode.parentId).toBeNull();
    expect('isPlaying' in audioNode).toBe(false);
    expect('selectedShapeIds' in result.editor).toBe(false);
  });

  it('should generate a filesystem-safe export filename', () => {
    const fileName = createWorkspaceExportFilename(
      '  API Review: v2 / Final  ',
      new Date('2026-04-16T09:15:30.000Z')
    );

    expect(fileName).toBe('api-review-v2-final-2026-04-16T09-15-30Z.json');
  });

  it('should generate scoped filenames for canvas asset exports', () => {
    const fileName = createCanvasExportFilename(
      '  API Review: v2 / Final  ',
      'svg',
      'selection',
      new Date('2026-04-16T09:15:30.000Z')
    );

    expect(fileName).toBe('api-review-v2-final-selection-2026-04-16T09-15-30Z.svg');
  });

  it('should download the serialized export document as JSON', async () => {
    const exportDocument = serializeWorkspaceForExport(createWorkspaceFixture());
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:workspace');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'a') {
        return document.createElement(tagName);
      }

      return {
        href: '',
        download: '',
        click: clickSpy,
      } as unknown as HTMLAnchorElement;
    }) as typeof document.createElement);

    downloadWorkspaceExport(exportDocument, 'architecture-export.json');

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:workspace');

    const blob = createObjectURLSpy.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob?.text()).resolves.toContain('"format": "tldraw-workspace-export"');
    await expect(blob?.text()).resolves.toContain('"rootNodeIds": [');
  });

  it('should download data-url based canvas exports without creating a blob', () => {
    const clickSpy = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'a') {
        return document.createElement(tagName);
      }

      return {
        href: '',
        download: '',
        click: clickSpy,
      } as unknown as HTMLAnchorElement;
    }) as typeof document.createElement);

    downloadDataUrlExport('data:image/png;base64,AAA', 'diagram-viewport.png');

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('should download string-based canvas exports as blobs', async () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:svg');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'a') {
        return document.createElement(tagName);
      }

      return {
        href: '',
        download: '',
        click: clickSpy,
      } as unknown as HTMLAnchorElement;
    }) as typeof document.createElement);

    downloadStringExport('<svg />', 'diagram-selection.svg', 'image/svg+xml');

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:svg');

    const blob = createObjectURLSpy.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob?.text()).resolves.toBe('<svg />');
  });
});
