import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvas } from './useCanvas';

const mockWorkspace = {
  id: 'workspace-1',
  name: 'Workspace 1',
  state: {
    tool: 'select' as const,
    selectedShapeIds: ['audio-1'],
    camera: { x: 40, y: 24, zoom: 1.5 },
    isDragging: true,
    isDrawing: true,
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
    editingTextId: 'text-1',
  },
  shapes: [
    {
      id: 'audio-1',
      type: 'audio' as const,
      bounds: { x: 0, y: 0, width: 180, height: 60 },
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
      src: 'audio.mp3',
      duration: 30,
      isPlaying: true,
      waveformData: [0.1, 0.5, 0.2],
      isBase64: false,
    },
  ],
  createdAt: 1,
  updatedAt: 2,
};

const saveWorkspaceSnapshot = vi.fn();

vi.mock('../stores/workspaceStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../stores/workspaceStore')>();

  return {
    ...actual,
    useWorkspaceStore: () => ({
      getWorkspace: vi.fn(() => mockWorkspace),
      saveWorkspaceSnapshot,
    }),
  };
});

describe('useCanvas runtime state normalization', () => {
  beforeEach(() => {
    saveWorkspaceSnapshot.mockClear();
  });

  it('does not restore drag, drawing, or text-edit session state from persisted workspaces', () => {
    const { result } = renderHook(() => useCanvas('workspace-1'));

    expect(result.current.editorState).toMatchObject({
      tool: 'select',
      selectedShapeIds: ['audio-1'],
      camera: { x: 40, y: 24, zoom: 1.5 },
      isDragging: false,
      isDrawing: false,
      editingTextId: null,
    });
  });

  it('resets audio playback state when loading persisted workspace shapes', () => {
    const { result } = renderHook(() => useCanvas('workspace-1'));

    expect(result.current.shapes[0]).toMatchObject({
      id: 'audio-1',
      type: 'audio',
      isPlaying: false,
    });
  });
});
