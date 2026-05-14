# Task 01 - Domain Boundaries and Module Map

## Status

- Status: ✅ Completed
- Sequence: 01
- Completed: 2026-04-21

## Goal

Define the target architecture for the app before moving code.

## Delivered Output

This task now provides:

- a backlog index in `specs/tasks/README.md`
- a target module map for app shell, document, editor, canvas, feature UI, agents, stores, utils, and the transitional type barrel
- a current-to-future file ownership map for the main hotspots
- a dependency-checked order for tasks 02 through 13

## Why This Task Exists

The current domain is understandable, but it is spread across a few oversized files. We need one agreed map for where document models, editor state, rendering, agents, and workspace concerns belong.

## Current State Snapshot

- `src/App.tsx` is about 767 lines and still mixes shell composition, workspace boot, dialogs, export, selection derivation, and agent wiring.
- `src/components/Canvas.tsx` is about 1487 lines and mixes stage composition, pointer logic, overlays, embeds, text editing, and context menu behavior.
- `src/hooks/useCanvas.ts` is about 1081 lines and still owns document mutation, history, camera, persistence sync, grouping, and agent proposal apply flows.
- `src/canvas/CanvasEngine.ts` is about 898 lines and should stay render-focused, but ownership around it is still split.
- `src/types/index.ts` is about 596 lines and mixes document types, editor state, export schema, defaults, geometry, and selection helpers.
- `src/stores/workspaceStore.ts` is about 202 lines and still stores workspace records together with runtime-flavored editor data.

## Flow To Support

1. A developer can identify whether a change belongs to document, editor, workspace, canvas rendering, or agent integration before touching code.
2. New helpers and types are added to the correct target module instead of `App.tsx`, `Canvas.tsx`, or `types/index.ts`.
3. Later refactor tasks can move code into a known destination instead of inventing structure mid-task.

## Agreed Boundary Summary

- `src/document/` is the long-term home for durable board structure and pure board logic.
- `src/editor/` is the long-term home for runtime interaction state and history bookkeeping.
- `src/canvas/` stays the render/transform layer only.
- `src/features/` becomes the home for React-facing feature surfaces such as canvas interactions and inspector models.
- `src/agents/` remains the proposal/transport layer, but proposal application moves behind document commands.
- `src/stores/` is narrowed to durable workspace persistence, while runtime-only flags move elsewhere.
- `src/types/index.ts` becomes a compatibility barrel during the split instead of the permanent source of truth.

See `specs/tasks/README.md` for the full module map and current-file-to-future-home table.

## Confirmed Sequence

1. `02-split-core-types.md`
2. `03-extract-geometry-and-selection-helpers.md`
3. `04-single-canvas-engine-owner.md`
4. `05-document-command-layer.md`
5. `06-canvas-interaction-split.md`
6. `07-text-style-source-of-truth.md`
7. `08-selection-driven-inspector-model.md`
8. `09-persisted-vs-runtime-workspace-state.md`
9. `10-single-source-group-model.md`
10. `11-atomic-workspace-save-and-history.md`
11. `12-agent-document-application-boundary.md`
12. `13-app-shell-composition.md`

The dependency graph for that order is recorded in `specs/tasks/README.md`.

## Success Criteria

- [x] The target module map is documented with clear ownership boundaries.
- [x] The current oversized files are mapped to their future homes.
- [x] The sequencing and dependencies for tasks 02 through 13 are confirmed.
- [x] No runtime behavior changes are introduced in this task.

## Constraints

- Do not move production code yet.
- Do not rename public types yet.
- Do not mix this task with rendering or state refactors.

## Likely Files

- `specs/tasks/README.md`
- `specs/tasks/01-domain-boundaries-and-module-map.md`
- `src/README.md`

## Notes

- This task is documentation-first on purpose.
- The output should make the rest of the backlog easier, not larger.
