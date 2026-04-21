# Stores Directory

This directory contains Zustand state stores for global state management.

## Overview

Zustand is used for its simplicity and minimal boilerplate compared to Redux or Context API. Stores provide:
- Centralized state management
- Persistence via middleware
- TypeScript support
- DevTools integration

## Store Files

| Store | File | Purpose | Lines |
|-------|------|---------|-------|
| workspaceStore | `workspaceStore.ts` | Workspace management with persistence | 202 |

## Detailed Store Documentation

### workspaceStore

**Purpose**: Manages multiple workspaces with localStorage persistence.

**⚠️ CRITICAL**: This is the only persistent state in the application. All shapes, camera positions, and selections are stored here.

**Interface**:
```typescript
interface Workspace {
  id: string;              // Unique identifier
  name: string;            // Display name (e.g., "Workspace 1")
  state: WorkspaceState;   // Current tool, camera, selection, style
  shapes: Shape[];         // All shapes in workspace
  createdAt: number;       // Timestamp
  updatedAt: number;       // Timestamp
}

interface WorkspaceState {
  tool: ToolType;
  selectedShapeIds: string[];
  camera: CameraState;
  isDragging: boolean;
  isDrawing: boolean;
  shapeStyle: ShapeStyle;
  editingTextId: string | null;
}

interface WorkspaceStore {
  // State
  workspaces: Workspace[];
  activeWorkspaceId: string;
  
  // Actions
  addWorkspace: () => string;                    // Returns new workspace ID
  deleteWorkspace: (id: string) => boolean;      // Returns success
  renameWorkspace: (id: string, name: string) => WorkspaceRenameResult;
  switchWorkspace: (id: string) => void;
  canDeleteWorkspace: () => boolean;             // True when more than one workspace exists
  getWorkspace: (id: string) => Workspace | undefined;
  getActiveWorkspace: () => Workspace;
  getNextWorkspaceNumber: () => number;
  updateWorkspaceShapes: (id: string, shapes: Shape[]) => void;
  updateWorkspaceState: (id: string, state: Partial<WorkspaceState>) => void;
}

interface WorkspaceRenameResult {
  success: boolean;
  error: string | null;
  trimmedName: string | null;
}

function useWorkspaceStore(): WorkspaceStore
```

**Hardcoded Values**:
```typescript
const MAX_WORKSPACES = 10;
const MAX_WORKSPACE_NAME_LENGTH = 50;
const STORAGE_KEY = 'tldraw-workspaces';
```

**Naming Convention**:
- Workspaces auto-named "Workspace 1", "Workspace 2", etc.
- Finds gaps in numbering (deleting "Workspace 2" allows reuse)

**Persistence**:

Uses Zustand's persist middleware:
```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: STORAGE_KEY,
    partialize: (state) => ({
      workspaces: state.workspaces,
      activeWorkspaceId: state.activeWorkspaceId,
    }),
  }
)
```

Only `workspaces` and `activeWorkspaceId` are persisted. Everything else is derived or transient.

**ID Generation**:
```typescript
const id = `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

**Key Behaviors**:

1. **Adding Workspaces**:
   - Generates unique ID with timestamp + random
   - Auto-assigns name "Workspace N" (finds lowest available number)
   - Initializes with default empty state
   - Sets as active workspace
   - Returns new workspace ID

2. **Deleting Workspaces**:
   - Cannot delete if only one workspace exists (returns false)
   - If deleting active workspace, switches to another first
   - Preserves workspace numbering for reuse

3. **Renaming Workspaces**:
   - Trims leading and trailing whitespace before validation
   - Rejects empty or all-whitespace names
   - Rejects names longer than 50 characters
   - Returns a structured success/error result so the UI can keep the editor open and show feedback
   - Still allows duplicate names for now

4. **Switching Workspaces**:
   - Changes `activeWorkspaceId`
   - Triggers reload in `useCanvas` hook
   - **Clears undo history** (in useCanvas)

5. **Updating Shapes**:
   - Called by `useCanvas` hook (debounced 100ms)
   - Updates `shapes` array
   - Updates `updatedAt` timestamp

6. **Updating State**:
   - Called by `useCanvas` hook
   - Merges partial state updates
   - Updates `updatedAt` timestamp

**Success Criteria**:
- [ ] Workspaces persist across page reloads
- [ ] Maximum 10 workspaces enforced
- [ ] Cannot delete last workspace
- [ ] Auto-naming works correctly (finds gaps)
- [ ] Switching workspaces loads correct data
- [ ] Shape changes auto-save
- [ ] Timestamps updated correctly

**Constraints**:
- Maximum 10 workspaces
- Workspace names must be between 1 and 50 trimmed characters
- No backend sync (local only)
- localStorage quota limits apply (~5-10MB)
- All data lost if user clears browser storage

**Known Issues**:

1. **No Uniqueness Check**: Duplicate names allowed ("Workspace 1", "Workspace 1")

2. **Storage Limits**: localStorage has ~5-10MB limit. Large drawings with many shapes or images may hit limit.

3. **No Migration**: If shape types change, old data may break. No versioning/migration system.

**Performance Considerations**:

- Entire workspace state serialized to JSON on every change
- Debounced updates in useCanvas (100ms) reduce serialization frequency
- Large shape arrays may cause performance issues
- Image data stored as base64 in shapes (can be large)

**Usage Example**:
```typescript
const workspaceStore = useWorkspaceStore();

// Add workspace
const newId = workspaceStore.addWorkspace();

// Switch workspace
workspaceStore.switchWorkspace(newId);

// Get active workspace
const active = workspaceStore.getActiveWorkspace();

// Update shapes (usually done by useCanvas)
workspaceStore.updateWorkspaceShapes(workspaceId, newShapes);
```

**Data Flow**:
```
User Action → useCanvas Hook → workspaceStore → localStorage
     ↓              ↓                ↓              ↓
  Draw Shape   Debounced      Update State   Persist JSON
  Switch Tab   100ms          Update Timestamp
```

**Migration Considerations**:

If adding new fields to Workspace or Shape types:
1. Make new fields optional with defaults
2. Handle undefined in code
3. Consider adding version number for future migrations

Example:
```typescript
interface Workspace {
  // ... existing fields
  version?: number;  // Add for future migrations
}

// In code, handle missing version
const version = workspace.version ?? 1;
```

**Testing Requirements**:

Unit tests should cover:
- Adding workspaces (up to limit)
- Deleting workspaces (cannot delete last)
- Renaming workspaces
- Switching workspaces
- Persistence (mock localStorage)
- Edge cases (empty name, overlong name, duplicate name)

**DevTools Integration**:

Zustand devtools enabled for debugging:
```typescript
import { devtools } from 'zustand/middleware';

create<WorkspaceStore>()(
  devtools(
    persist(...)
  )
)
```

Use Redux DevTools browser extension to inspect state changes.

**Backup/Export Strategy**:

To implement backup/export:
```typescript
// Export all workspaces
const exportData = JSON.stringify(workspaceStore.workspaces);

// Import workspaces
const importWorkspaces = (data: string) => {
  const workspaces = JSON.parse(data);
  // Validate and merge
};
```

## Adding New Stores

If adding new stores:
1. Create `newStore.ts`
2. Define state interface and actions
3. Add persistence if needed
4. Export hook
5. Add to this README
6. Write tests

## Best Practices

1. **Keep stores small**: Each store should have one responsibility
2. **Type everything**: Use TypeScript interfaces for all state
3. **Actions over setters**: Provide semantic actions, not just setState
4. **Derive when possible**: Don't store computed values
5. **Test persistence**: Mock localStorage in tests
6. **Handle errors**: Wrap localStorage calls in try/catch
