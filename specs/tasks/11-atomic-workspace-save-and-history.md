# Task 11 - Atomic Workspace Save and History

## Status

- Status: Completed
- Sequence: 11
- Completed: 2026-04-22

## Goal

Make workspace persistence atomic and clarify history boundaries between document edits, editor updates, and workspace switching.

## Why This Task Exists

Shapes and editor state are currently autosaved through separate effects. That can allow persistence drift and makes the save behavior harder to reason about.

## Flow To Support

1. A document change is persisted through one explicit save path.
2. Durable editor updates are persisted through the same coordinated path.
3. Switching workspaces has a documented history policy.
4. Save batching is predictable and does not race between shapes and editor state.

## Success Criteria

- [x] Shapes and durable editor state save through one coordinated flow.
- [x] Separate autosave race windows are removed.
- [x] Workspace-switching and history behavior are documented and tested.
- [x] Regression tests cover at least one shape update plus one editor-state update in the same save cycle.

## Constraints

- Keep local-only persistence.
- Do not add remote sync, CRDTs, or session recovery features.
- Avoid changing command semantics while fixing save behavior.

## Likely Files

- `src/hooks/useCanvas.ts`
- `src/stores/workspaceStore.ts`
- related store and hook tests

## Depends On

- `05-document-command-layer.md`
- `09-persisted-vs-runtime-workspace-state.md`

## Implementation Notes

- `workspaceStore` now exposes one `saveWorkspaceSnapshot()` API that normalizes durable editor state and strips runtime shape state before writing.
- `useCanvas` now debounces one coordinated snapshot save instead of running separate shape/state effects.
- Workspace switching now resets undo/redo history synchronously with the new workspace load, and persistence waits until the loaded workspace id matches the current hook state.
- Added `src/hooks/useCanvas.persistence.test.ts` to cover one debounced shape-plus-editor save cycle and the workspace-switch history policy.
