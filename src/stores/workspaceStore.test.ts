import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';

function createWorkspace(id: string) {
  return {
    id,
    name: `Workspace ${id}`,
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
    updatedAt: 1,
  };
}

describe('workspaceStore canDeleteWorkspace', () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: '',
    });
  });

  it('returns false when only one workspace exists', () => {
    useWorkspaceStore.setState({
      workspaces: [createWorkspace('1')],
      activeWorkspaceId: '1',
    });

    expect(useWorkspaceStore.getState().canDeleteWorkspace()).toBe(false);
  });

  it('returns true when more than one workspace exists without requiring an id argument', () => {
    useWorkspaceStore.setState({
      workspaces: [createWorkspace('1'), createWorkspace('2')],
      activeWorkspaceId: '1',
    });

    expect(useWorkspaceStore.getState().canDeleteWorkspace()).toBe(true);
  });
});
