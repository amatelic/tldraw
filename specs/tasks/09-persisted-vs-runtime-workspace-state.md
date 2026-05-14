# Task 09 - Persisted Versus Runtime Workspace State

## Status

- Status: Completed
- Sequence: 09
- Completed: 2026-04-22

## Goal

Separate durable workspace state from transient UI and runtime state.

## Why This Task Exists

The workspace store currently persists flags like dragging, drawing, and text-edit session state. Those are runtime concerns and should not be restored as if they were document state.

## Flow To Support

1. Reloading the app restores the board, camera, selection preferences, and other durable editor state.
2. Reloading the app does not restore in-progress drag state, drawing state, or edit-session state.
3. Runtime-only values live outside the persisted workspace document.
4. Media playback state behaves like runtime UI state, not saved document data, unless we explicitly choose otherwise later.

## Success Criteria

- [x] Durable and transient workspace state are separated and documented.
- [x] Persisted storage excludes runtime-only flags.
- [x] Existing workspaces still load safely after the change.
- [x] Store or migration tests cover defaulting and backwards compatibility.

## Constraints

- Keep localStorage as the persistence layer for now.
- Do not add backend sync or collaborative state.
- Do not change the workspace UI during this task.

## Likely Files

- `src/stores/workspaceStore.ts`
- `src/hooks/useCanvas.ts`
- `src/stores/README.md`

## Depends On

- `02-split-core-types.md`

## Implementation Notes

- Added `PersistedEditorState` and `EditorRuntimeState` so the type boundary now says explicitly which editor fields are durable versus transient.
- `workspaceStore` now persists only the durable editor subset and strips runtime audio playback before writing or hydrating workspace data.
- `useCanvas` now rebuilds runtime editor defaults on load, so legacy persisted `isDragging`, `isDrawing`, and `editingTextId` values are ignored instead of restored.
- Added persistence-helper tests in `src/stores/workspaceStore.test.ts` plus a hook regression in `src/hooks/useCanvas.runtime-state.test.ts` to cover legacy snapshots and runtime reset behavior.
