import { useEffect, useRef } from 'react';
import type { Workspace, WorkspaceStore } from '../stores/workspaceStore';

interface AppWorkspaceStore {
  workspaces: WorkspaceStore['workspaces'];
  addWorkspace: WorkspaceStore['addWorkspace'];
  getActiveWorkspace: WorkspaceStore['getActiveWorkspace'];
}

export function useAppWorkspace(workspaceStore: AppWorkspaceStore): Workspace {
  const hasInitializedWorkspaceRef = useRef(false);

  useEffect(() => {
    if (hasInitializedWorkspaceRef.current) {
      return;
    }

    hasInitializedWorkspaceRef.current = true;

    if (workspaceStore.workspaces.length === 0) {
      workspaceStore.addWorkspace();
    }
  }, [workspaceStore]);

  return workspaceStore.getActiveWorkspace();
}
