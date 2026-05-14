import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCanvas } from './useCanvas';

vi.mock('../stores/workspaceStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../stores/workspaceStore')>();

  return {
    ...actual,
    useWorkspaceStore: () => ({
      workspaces: [],
      activeWorkspaceId: 'legacy-workspace',
      getWorkspace: vi.fn(() => ({
        id: 'legacy-workspace',
        name: 'Legacy',
        shapes: [
          {
            id: 'text-1',
            type: 'text',
            text: 'Legacy label',
            bounds: { x: 10, y: 20, width: 180, height: 40 },
            style: {
              color: '#111111',
              fillColor: '#ffffff',
              strokeWidth: 2,
              strokeStyle: 'solid',
              fillStyle: 'none',
              opacity: 1,
              blendMode: 'source-over',
              shadows: [],
              fontSize: 24,
              fontFamily: 'Georgia',
              fontWeight: 'bold',
              fontStyle: 'italic',
              textAlign: 'center',
            },
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        state: {
          tool: 'select',
          selectedShapeIds: ['text-1'],
          camera: { x: 0, y: 0, zoom: 1 },
          isDragging: false,
          isDrawing: false,
          shapeStyle: {
            color: '#000000',
            fillColor: '#ffffff',
            strokeWidth: 2,
            strokeStyle: 'solid',
            fillStyle: 'none',
            opacity: 1,
            blendMode: 'source-over',
            shadows: [],
          },
          editingTextId: null,
        },
        createdAt: 1,
        updatedAt: 1,
      })),
      saveWorkspaceSnapshot: vi.fn(),
    }),
  };
});

describe('useCanvas text style normalization', () => {
  it('normalizes legacy text typography from style into the loaded text shape fields', () => {
    const { result } = renderHook(() => useCanvas('legacy-workspace'));

    expect(result.current.shapes[0]).toMatchObject({
      id: 'text-1',
      type: 'text',
      fontSize: 24,
      fontFamily: 'Georgia',
      fontWeight: 'bold',
      fontStyle: 'italic',
      textAlign: 'center',
      style: {
        fontSize: 24,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
      },
    });

    expect(result.current.editorState.shapeStyle).toMatchObject({
      fontSize: 16,
      fontFamily: 'sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
    });
  });
});
