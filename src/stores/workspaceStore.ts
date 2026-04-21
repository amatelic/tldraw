import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Shape, ToolType, CameraState, ShapeStyle } from '../types';
import { DEFAULT_STYLE } from '../types';

export interface WorkspaceState {
  tool: ToolType;
  selectedShapeIds: string[];
  camera: CameraState;
  isDragging: boolean;
  isDrawing: boolean;
  shapeStyle: ShapeStyle;
  editingTextId: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  state: WorkspaceState;
  shapes: Shape[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceRenameResult {
  success: boolean;
  error: string | null;
  trimmedName: string | null;
}

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string;

  // Actions
  addWorkspace: () => string;
  deleteWorkspace: (id: string) => boolean;
  renameWorkspace: (id: string, name: string) => WorkspaceRenameResult;
  switchWorkspace: (id: string) => void;
  canDeleteWorkspace: () => boolean;
  getWorkspace: (id: string) => Workspace | undefined;
  getActiveWorkspace: () => Workspace;
  getNextWorkspaceNumber: () => number;

  // Update current workspace data
  updateWorkspaceShapes: (id: string, shapes: Shape[]) => void;
  updateWorkspaceState: (id: string, state: Partial<WorkspaceState>) => void;
}

const MAX_WORKSPACES = 10;
export const MAX_WORKSPACE_NAME_LENGTH = 50;

function createRenameFailure(error: string): WorkspaceRenameResult {
  return {
    success: false,
    error,
    trimmedName: null,
  };
}

export function validateWorkspaceName(name: string): WorkspaceRenameResult {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return createRenameFailure('Workspace names must contain at least 1 non-space character.');
  }

  if (trimmedName.length > MAX_WORKSPACE_NAME_LENGTH) {
    return createRenameFailure(
      `Workspace names must be ${MAX_WORKSPACE_NAME_LENGTH} characters or fewer.`
    );
  }

  return {
    success: true,
    error: null,
    trimmedName,
  };
}

const createInitialState = (): WorkspaceState => ({
  tool: 'select',
  selectedShapeIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  isDragging: false,
  isDrawing: false,
  shapeStyle: { ...DEFAULT_STYLE },
  editingTextId: null,
});

const createNewWorkspace = (id: string, name: string): Workspace => ({
  id,
  name,
  state: createInitialState(),
  shapes: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: '',

      addWorkspace: () => {
        const state = get();

        if (state.workspaces.length >= MAX_WORKSPACES) {
          console.warn('Maximum number of workspaces reached');
          return state.activeWorkspaceId;
        }

        const nextNumber = get().getNextWorkspaceNumber();
        const id = `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const name = `Workspace ${nextNumber}`;

        const newWorkspace = createNewWorkspace(id, name);

        set({
          workspaces: [...state.workspaces, newWorkspace],
          activeWorkspaceId: id,
        });

        return id;
      },

      deleteWorkspace: (id: string) => {
        const state = get();

        if (state.workspaces.length <= 1) {
          console.warn('Cannot delete the last workspace');
          return false;
        }

        const newWorkspaces = state.workspaces.filter((w) => w.id !== id);
        let newActiveId = state.activeWorkspaceId;

        // If deleting active workspace, switch to another one
        if (state.activeWorkspaceId === id) {
          const index = state.workspaces.findIndex((w) => w.id === id);
          const nextIndex = index < newWorkspaces.length ? index : newWorkspaces.length - 1;
          newActiveId = newWorkspaces[nextIndex]?.id || '';
        }

        set({
          workspaces: newWorkspaces,
          activeWorkspaceId: newActiveId,
        });

        return true;
      },

      renameWorkspace: (id: string, name: string) => {
        const validation = validateWorkspaceName(name);
        if (!validation.success || !validation.trimmedName) {
          return validation;
        }

        const trimmedName = validation.trimmedName;
        let didRename = false;

        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id
              ? (() => {
                  didRename = true;

                  if (w.name === trimmedName) {
                    return w;
                  }

                  return {
                    ...w,
                    name: trimmedName,
                    updatedAt: Date.now(),
                  };
                })()
              : w
          ),
        }));

        if (!didRename) {
          return createRenameFailure('Workspace not found.');
        }

        return validation;
      },

      switchWorkspace: (workspaceId: string) => {
        const state = get();
        const workspace = state.workspaces.find((w) => w.id === workspaceId);
        if (workspace) {
          set({ activeWorkspaceId: workspaceId });
        }
      },

      canDeleteWorkspace: () => {
        const state = get();
        return state.workspaces.length > 1;
      },

      getWorkspace: (id: string) => {
        return get().workspaces.find((w) => w.id === id);
      },

      getActiveWorkspace: () => {
        const state = get();
        const workspace = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
        if (!workspace) {
          // Return a default workspace if none found
          return createNewWorkspace('default', 'Workspace 1');
        }
        return workspace;
      },

      getNextWorkspaceNumber: () => {
        const state = get();
        const usedNumbers = state.workspaces
          .map((w) => {
            const match = w.name.match(/^Workspace\s+(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n) => n > 0);

        let nextNumber = 1;
        while (usedNumbers.includes(nextNumber)) {
          nextNumber++;
        }
        return nextNumber;
      },

      updateWorkspaceShapes: (id: string, shapes: Shape[]) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, shapes, updatedAt: Date.now() } : w
          ),
        }));
      },

      updateWorkspaceState: (id: string, stateUpdate: Partial<WorkspaceState>) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id
              ? {
                  ...w,
                  state: { ...w.state, ...stateUpdate },
                  updatedAt: Date.now(),
                }
              : w
          ),
        }));
      },
    }),
    {
      name: 'tldraw-workspaces',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
