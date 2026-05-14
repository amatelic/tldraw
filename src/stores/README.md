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
| workspaceStore | `workspaceStore.ts` | Workspace management with persistence validation | ~960 |
| devToolStore | `devToolStore.ts` | Dev-only design-token override state with persistence | ~40 |

## Detailed Store Documentation

### workspaceStore

**Purpose**: Manages multiple workspaces with localStorage persistence.

**⚠️ CRITICAL**: This is the only persistent state in the application. It now stores only durable workspace data: shapes, camera position, selection, active tool, and style defaults.

**Interface**:
```typescript
interface Workspace {
  id: string;              // Unique identifier
  name: string;            // Display name (e.g., "Workspace 1")
  state: PersistedEditorState; // Durable editor state only
  shapes: Shape[];         // All shapes in workspace
  createdAt: number;       // Timestamp
  updatedAt: number;       // Timestamp
}

interface PersistedEditorState {
  tool: ToolType;
  selectedShapeIds: string[];
  camera: CameraState;
  shapeStyle: ShapeStyle;
}

interface WorkspaceSnapshot {
  shapes: Shape[];
  state: PersistedEditorState;
}

interface WorkspacePersistenceResult {
  success: boolean;
  error: string | null;
  warnings: string[];
}

interface WorkspaceStore {
  // State
  workspaces: Workspace[];
  activeWorkspaceId: string;
  
  // Actions
  addWorkspace: () => string;                    // Returns new workspace ID
  deleteWorkspace: (id: string) => boolean;      // Returns success
  renameWorkspace: (id: string, name: string) => boolean;
  switchWorkspace: (id: string) => void;
  canDeleteWorkspace: () => boolean;
  getWorkspace: (id: string) => Workspace | undefined;
  getActiveWorkspace: () => Workspace;
  getNextWorkspaceNumber: () => number;
  saveWorkspaceSnapshot: (id: string, snapshot: WorkspaceSnapshot) => WorkspacePersistenceResult;
}

function useWorkspaceStore(): WorkspaceStore
```

**Hardcoded Values**:
```typescript
const MAX_WORKSPACES = 10;
const MAX_WORKSPACE_NAME_LENGTH = 50;
const MIN_CAMERA_ZOOM = 0.1;
const MAX_CAMERA_ZOOM = 5;
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
    partialize: (state) => partializeWorkspaceStoreState(state),
    merge: (persistedState, currentState) =>
      mergePersistedWorkspaceStoreState(persistedState, currentState),
  }
)
```

Only `workspaces` and `activeWorkspaceId` are persisted, and the persisted workspace snapshot is sanitized so:
- editor runtime flags such as dragging, drawing, and text-edit session state are excluded
- audio playback is reset before persistence and hydration
- malformed workspace arrays fall back to the current safe store state
- active workspace ids are reset when they do not match a hydrated workspace
- camera values must be finite, and zoom is clamped to `0.1` through `5`
- selected shape ids are deduplicated and filtered to hydrated shapes that still exist
- malformed shapes are dropped, shape timestamps are repaired to finite numbers, and style defaults are restored
- older persisted workspaces are merged back through a validation normalizer before app code reads them

Validation entry points:
- `validatePersistedWorkspaceStoreState()` normalizes the full persisted store payload and returns structured warnings.
- `validateWorkspaceSnapshot()` normalizes one `{ shapes, state }` save payload.
- `normalizeWorkspaceSnapshot()` and `normalizeWorkspaceForPersistence()` keep existing callers on normalized values.
- `saveWorkspaceSnapshot()` returns `{ success, error, warnings }`; missing target workspace ids fail without mutating store state, while repairable snapshot issues save with warnings.

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
   - Trims leading/trailing whitespace
   - Requires 1-50 characters
   - Returns false and skips updates when invalid
   - No uniqueness check

4. **Switching Workspaces**:
   - Changes `activeWorkspaceId`
   - Triggers reload in `useCanvas` hook
   - **Clears undo history** (in useCanvas)

5. **Saving Workspace Snapshots**:
   - Called by `useCanvas` through one debounced persistence path
   - Updates `shapes` and durable editor `state` atomically
   - Strips runtime audio playback state before storing
   - Normalizes durable editor state before storing
   - Drops malformed shapes and stale selected ids before storing
   - Returns structured success/failure metadata for persistence-sensitive callers
   - Updates `updatedAt` timestamp once per coordinated save

**Success Criteria**:
- [x] Workspaces persist across page reloads
- [x] Maximum 10 workspaces enforced
- [x] Cannot delete last workspace
- [x] Auto-naming works correctly (finds gaps)
- [x] Switching workspaces loads correct data
- [x] Shape changes auto-save
- [x] Runtime drag/draw/edit flags are not restored from localStorage
- [x] Audio playback does not resume from persisted workspace data
- [x] Corrupt camera, selection, shape, and active workspace data is repaired or dropped during hydration
- [x] Timestamps updated correctly

**Constraints**:
- Maximum 10 workspaces
- Workspace names must be 1-50 characters after trimming
- No backend sync (local only)
- localStorage quota limits apply (~5-10MB)
- Base64 images/audio count against the localStorage quota quickly; failed browser writes still depend on the storage implementation surfaced by Zustand.
- All data lost if user clears browser storage

**Known Issues**:

1. **No Uniqueness Check**: Duplicate names allowed ("Workspace 1", "Workspace 1")

2. **Storage Limits**: localStorage has ~5-10MB limit. Large drawings with many shapes or images may hit limit.

3. **No Explicit Versioned Migration Yet**: The store now validates and normalizes older runtime-heavy editor snapshots on merge, but there is still no broader schema-version system for future document migrations.

**Performance Considerations**:

- Entire durable workspace snapshot serialized to JSON on every change
- Debounced snapshot saves in `useCanvas` (100ms) reduce serialization frequency
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

// Save one coordinated durable snapshot (usually done by useCanvas)
const saveResult = workspaceStore.saveWorkspaceSnapshot(workspaceId, {
  shapes: newShapes,
  state: persistedEditorState,
});

if (!saveResult.success) {
  console.warn(saveResult.error);
}
```

**Data Flow**:
```
User Action → useCanvas Hook → workspaceStore → localStorage
     ↓              ↓                ↓              ↓
  Draw Shape   Debounced      Sanitize Data  Persist JSON
  Switch Tab   100ms          Update Timestamp
```

**Migration Considerations**:

If adding new fields to Workspace or Shape types:
1. Make new fields optional with defaults
2. Handle undefined in code
3. Decide whether the new field is durable or runtime-only before adding it to store persistence
4. Consider adding version number for future migrations

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
- Legacy persisted editor snapshots with runtime flags
- Audio playback reset during sanitize/merge
- Malformed persisted workspace arrays
- Invalid active workspace ids
- Invalid camera zoom values
- Stale selected shape ids
- Malformed shapes, shape timestamps, and missing style defaults
- Edge cases (empty name, duplicate name)

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

---

### devToolStore

**Purpose**: Persists Vite-dev-only design-token panel state and token override values.

**Interface**:
```typescript
interface DevToolState {
  isOpen: boolean;
  overrides: Record<string, string>;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setOverride: (key: string, value: string) => void;
  resetOverrides: () => void;
  exportCSS: () => string;
}
```

**Hardcoded Values**:
```typescript
const STORAGE_KEY = 'dev-tool-overrides';
```

**Key Behaviors**:

1. **Opening and Closing**:
   - `setOpen()` controls the panel directly
   - `toggle()` flips the current open state

2. **Override Editing**:
   - `setOverride()` stores CSS custom-property values by token key
   - Values are applied to the DOM by `useDevColorOverrides`, not by the store itself

3. **Reset and Export**:
   - `resetOverrides()` clears the persisted override map
   - `exportCSS()` returns a CSS declaration block body for current overrides

**Success Criteria**:
- [x] Dev token panel open state persists across reloads
- [x] Token override values persist across reloads
- [x] Reset clears all override values
- [x] Export returns one CSS declaration per override

**Constraints**:
- This store is for development tooling, not durable workspace/document state
- It persists to a separate localStorage key from workspace data
- DOM application is intentionally delegated to `useDevColorOverrides`

**Known Issues**:
- No dedicated store test yet
- Override keys are not validated against the known token list before storage

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
