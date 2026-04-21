import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_WORKSPACE_NAME_LENGTH,
  useWorkspaceStore,
  validateWorkspaceName,
} from './workspaceStore';

function createWorkspace(id: string, name = `Workspace ${id}`) {
  return {
    id,
    name,
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

describe('workspaceStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: '',
    });
  });

  it('validates trimmed workspace names', () => {
    expect(validateWorkspaceName('  Client Review  ')).toEqual({
      success: true,
      error: null,
      trimmedName: 'Client Review',
    });
  });

  it('rejects empty workspace names after trimming', () => {
    expect(validateWorkspaceName('   ')).toEqual({
      success: false,
      error: 'Workspace names must contain at least 1 non-space character.',
      trimmedName: null,
    });
  });

  it('rejects workspace names longer than fifty characters', () => {
    const longName = 'A'.repeat(MAX_WORKSPACE_NAME_LENGTH + 1);

    expect(validateWorkspaceName(longName)).toEqual({
      success: false,
      error: `Workspace names must be ${MAX_WORKSPACE_NAME_LENGTH} characters or fewer.`,
      trimmedName: null,
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

  it('renames workspaces with trimmed valid names', () => {
    useWorkspaceStore.setState({
      workspaces: [createWorkspace('1')],
      activeWorkspaceId: '1',
    });

    const result = useWorkspaceStore.getState().renameWorkspace('1', '  Client Review  ');

    expect(result).toEqual({
      success: true,
      error: null,
      trimmedName: 'Client Review',
    });
    expect(useWorkspaceStore.getState().workspaces[0]?.name).toBe('Client Review');
  });

  it('keeps the existing name when rename validation fails', () => {
    useWorkspaceStore.setState({
      workspaces: [createWorkspace('1', 'Existing Name')],
      activeWorkspaceId: '1',
    });

    const result = useWorkspaceStore.getState().renameWorkspace('1', '   ');

    expect(result).toEqual({
      success: false,
      error: 'Workspace names must contain at least 1 non-space character.',
      trimmedName: null,
    });
    expect(useWorkspaceStore.getState().workspaces[0]?.name).toBe('Existing Name');
  });
});
