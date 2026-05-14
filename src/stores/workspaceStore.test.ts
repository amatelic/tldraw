import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorState } from '../types';
import {
  mergePersistedWorkspaceStoreState,
  normalizePersistedWorkspaceState,
  normalizeWorkspaceSnapshot,
  partializeWorkspaceStoreState,
  stripRuntimeStateFromShapes,
  useWorkspaceStore,
  validatePersistedWorkspaceStoreState,
  validateWorkspaceSnapshot,
  validateWorkspaceName,
  type Workspace,
  type WorkspaceStore,
} from './workspaceStore';

const baseEditorState: EditorState = {
  tool: 'select',
  selectedShapeIds: ['shape-1'],
  camera: { x: 12, y: 24, zoom: 1.5 },
  isDragging: true,
  isDrawing: true,
  shapeStyle: {
    color: '#111111',
    fillColor: '#ffffff',
    fillGradient: null,
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'none',
    opacity: 1,
    blendMode: 'source-over',
    shadows: [],
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
  },
  editingTextId: 'text-1',
};

function createWorkspace(): Workspace {
  return {
    id: 'workspace-1',
    name: 'Workspace 1',
    state: normalizePersistedWorkspaceState(baseEditorState),
    shapes: [
      {
        id: 'audio-1',
        type: 'audio',
        bounds: { x: 0, y: 0, width: 200, height: 60 },
        style: { ...baseEditorState.shapeStyle },
        createdAt: 1,
        updatedAt: 2,
        src: 'audio.mp3',
        duration: 30,
        isPlaying: true,
        waveformData: [0.1, 0.5, 0.3],
        isBase64: false,
      },
    ],
    createdAt: 1,
    updatedAt: 2,
  };
}

function createStoreSnapshot(): WorkspaceStore {
  return {
    workspaces: [createWorkspace()],
    activeWorkspaceId: 'workspace-1',
    addWorkspace: () => 'workspace-2',
    deleteWorkspace: () => true,
    renameWorkspace: () => true,
    switchWorkspace: () => undefined,
    canDeleteWorkspace: () => true,
    getWorkspace: () => undefined,
    getActiveWorkspace: () => createWorkspace(),
    getNextWorkspaceNumber: () => 2,
    saveWorkspaceSnapshot: () => ({ success: true, error: null, warnings: [] }),
  };
}

describe('workspaceStore persistence helpers', () => {
  it('drops runtime editor flags when normalizing legacy persisted state', () => {
    const persistedState = normalizePersistedWorkspaceState(baseEditorState);

    expect(persistedState).toEqual({
      tool: 'select',
      selectedShapeIds: ['shape-1'],
      camera: { x: 12, y: 24, zoom: 1.5 },
      shapeStyle: expect.objectContaining({
        color: '#111111',
      }),
    });
    expect('isDragging' in persistedState).toBe(false);
    expect('isDrawing' in persistedState).toBe(false);
    expect('editingTextId' in persistedState).toBe(false);
  });

  it('resets runtime audio playback state when sanitizing shapes', () => {
    const [audioShape] = stripRuntimeStateFromShapes(createWorkspace().shapes);

    expect(audioShape.type).toBe('audio');
    expect(audioShape.type === 'audio' ? audioShape.isPlaying : null).toBe(false);
  });

  it('normalizes one coordinated workspace snapshot for atomic persistence', () => {
    const snapshot = normalizeWorkspaceSnapshot({
      shapes: createWorkspace().shapes,
      state: baseEditorState,
    });

    expect(snapshot.state).toEqual({
      tool: 'select',
      selectedShapeIds: [],
      camera: { x: 12, y: 24, zoom: 1.5 },
      shapeStyle: expect.objectContaining({
        color: '#111111',
      }),
    });
    expect('isDragging' in snapshot.state).toBe(false);

    const [audioShape] = snapshot.shapes;
    expect(audioShape.type === 'audio' ? audioShape.isPlaying : null).toBe(false);
  });

  it('partializes persisted store data without runtime editor or audio playback state', () => {
    const storeState = createStoreSnapshot();
    const partialized = partializeWorkspaceStoreState(storeState);
    const persistedWorkspace = partialized.workspaces[0];
    const persistedAudio = persistedWorkspace.shapes[0];

    expect(partialized.activeWorkspaceId).toBe('workspace-1');
    expect('isDragging' in persistedWorkspace.state).toBe(false);
    expect('isDrawing' in persistedWorkspace.state).toBe(false);
    expect('editingTextId' in persistedWorkspace.state).toBe(false);
    expect(persistedAudio.type === 'audio' ? persistedAudio.isPlaying : null).toBe(false);
  });

  it('merges legacy persisted workspaces back into safe runtime defaults', () => {
    const currentState = createStoreSnapshot();
    const merged = mergePersistedWorkspaceStoreState(
      {
        workspaces: [
          {
            ...createWorkspace(),
            state: {
              ...baseEditorState,
            },
            shapes: [
              {
                ...createWorkspace().shapes[0],
                type: 'audio',
                isPlaying: true,
              },
            ],
          },
        ],
        activeWorkspaceId: 'workspace-1',
      },
      currentState
    );

    expect(merged.workspaces[0].state).toEqual({
      tool: 'select',
      selectedShapeIds: [],
      camera: { x: 12, y: 24, zoom: 1.5 },
      shapeStyle: expect.objectContaining({
        color: '#111111',
      }),
    });
    const mergedAudio = merged.workspaces[0].shapes[0];
    expect(mergedAudio.type === 'audio' ? mergedAudio.isPlaying : null).toBe(false);
  });

  it('falls back to the current store when hydrated workspace data is malformed', () => {
    const currentState = createStoreSnapshot();
    const validation = validatePersistedWorkspaceStoreState(
      {
        workspaces: 'not-an-array',
        activeWorkspaceId: 'missing-workspace',
      },
      currentState
    );

    expect(validation.success).toBe(true);
    expect(validation.value.workspaces).toHaveLength(1);
    expect(validation.value.activeWorkspaceId).toBe('workspace-1');
    expect(validation.warnings).toContain('Persisted workspaces were ignored because the value is not an array.');
  });

  it('resets an invalid active workspace id to the first hydrated workspace', () => {
    const currentState = createStoreSnapshot();
    const validation = validatePersistedWorkspaceStoreState(
      {
        workspaces: [
          createWorkspace(),
          {
            ...createWorkspace(),
            id: 'workspace-2',
            name: 'Workspace 2',
          },
        ],
        activeWorkspaceId: 'stale-workspace',
      },
      currentState
    );

    expect(validation.value.activeWorkspaceId).toBe('workspace-1');
    expect(validation.warnings).toContain(
      'Active workspace id was reset because it does not match a persisted workspace.'
    );
  });

  it('resets invalid camera values during snapshot validation', () => {
    const validation = validateWorkspaceSnapshot({
      shapes: createWorkspace().shapes,
      state: {
        ...baseEditorState,
        camera: { x: Number.NaN, y: Number.POSITIVE_INFINITY, zoom: -4 },
      },
    });

    expect(validation.value.state.camera).toEqual({ x: 0, y: 0, zoom: 0.1 });
    expect(validation.warnings).toContain('Invalid camera values were reset or clamped.');
  });

  it('drops stale selected ids that do not match hydrated shapes', () => {
    const validation = validateWorkspaceSnapshot({
      shapes: createWorkspace().shapes,
      state: {
        ...baseEditorState,
        selectedShapeIds: ['audio-1', 'missing-shape', 'audio-1'],
      },
    });

    expect(validation.value.state.selectedShapeIds).toEqual(['audio-1']);
  });

  it('drops malformed shapes and repairs style defaults and timestamps', () => {
    const validation = validateWorkspaceSnapshot({
      shapes: [
        {
          id: 'rect-1',
          type: 'rectangle',
          bounds: { x: 10, y: 20, width: 120, height: 80 },
          style: { color: '#2563eb', strokeWidth: 'wide' },
          createdAt: 'yesterday',
          updatedAt: 44,
        },
        {
          id: 'bad-shape',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: Number.NaN, height: 20 },
          style: {},
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      state: {
        ...baseEditorState,
        selectedShapeIds: ['rect-1', 'bad-shape'],
      },
    });

    expect(validation.value.shapes).toHaveLength(1);
    expect(validation.value.shapes[0]).toMatchObject({
      id: 'rect-1',
      style: expect.objectContaining({
        color: '#2563eb',
        strokeWidth: 2,
        fillColor: '#000000',
      }),
      createdAt: 0,
      updatedAt: 44,
    });
    expect(validation.value.state.selectedShapeIds).toEqual(['rect-1']);
    expect(validation.warnings).toContain('Shape bad-shape was dropped because it has invalid bounds.');
  });

  it('returns a structured failure when saving a missing workspace', () => {
    useWorkspaceStore.setState({
      workspaces: [createWorkspace()],
      activeWorkspaceId: 'workspace-1',
    });

    const result = useWorkspaceStore.getState().saveWorkspaceSnapshot('missing-workspace', {
      shapes: [],
      state: baseEditorState,
    });

    expect(result).toEqual({
      success: false,
      error: 'Workspace missing-workspace was not found.',
      warnings: [],
    });
  });
});

describe('useWorkspaceStore workspace actions', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [createWorkspace()],
      activeWorkspaceId: 'workspace-1',
    });
  });

  it('checks delete eligibility from workspace count without an id argument', () => {
    expect(useWorkspaceStore.getState().canDeleteWorkspace()).toBe(false);

    useWorkspaceStore.setState({
      workspaces: [
        createWorkspace(),
        {
          ...createWorkspace(),
          id: 'workspace-2',
          name: 'Workspace 2',
        },
      ],
      activeWorkspaceId: 'workspace-1',
    });

    expect(useWorkspaceStore.getState().canDeleteWorkspace()).toBe(true);
  });

  it('trims and validates workspace names before renaming', () => {
    const result = useWorkspaceStore.getState().renameWorkspace('workspace-1', '  Client Board  ');

    expect(result).toBe(true);
    expect(useWorkspaceStore.getState().workspaces[0].name).toBe('Client Board');
  });

  it('rejects blank or overlong workspace names', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(useWorkspaceStore.getState().renameWorkspace('workspace-1', '   ')).toBe(false);
    expect(useWorkspaceStore.getState().workspaces[0].name).toBe('Workspace 1');

    expect(useWorkspaceStore.getState().renameWorkspace('workspace-1', 'x'.repeat(51))).toBe(false);
    expect(useWorkspaceStore.getState().workspaces[0].name).toBe('Workspace 1');

    warnSpy.mockRestore();
  });
});

describe('validateWorkspaceName', () => {
  it('returns a trimmed valid workspace name', () => {
    expect(validateWorkspaceName('  Roadmap  ')).toEqual({
      name: 'Roadmap',
      error: null,
    });
  });

  it('returns user-facing errors for invalid names', () => {
    expect(validateWorkspaceName('')).toEqual({
      name: '',
      error: 'Workspace name is required.',
    });
    expect(validateWorkspaceName('x'.repeat(51))).toEqual({
      name: 'x'.repeat(51),
      error: 'Workspace names must be 50 characters or fewer.',
    });
  });
});
