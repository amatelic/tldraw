# Architecture Cleanup Backlog

## Purpose

This backlog breaks the structural cleanup into small, sequenced tasks so we can move code without re-deciding the architecture every time.

Use this file before starting architecture cleanup work:

1. Pick the next task in sequence unless a dependency note says otherwise.
2. Promote only that task into `specs/SPECS.md` when implementation begins.
3. Keep runtime behavior stable unless the task explicitly says otherwise.

Current progress: Tasks 01 through 13 are complete. The sequenced architecture-cleanup backlog is fully implemented, and any further structural work should be captured as new follow-up tasks instead of reopening this sequence.

## Current Hotspots

| Hotspot | Current file(s) | Why it is overloaded now | Planned destination |
|---------|------------------|--------------------------|---------------------|
| App shell wiring | `src/app/AppShell.tsx` (~170 lines), `src/app/useAppShellState.ts` (~488 lines) | the root app shell is now extracted, but shell-level dialog orchestration and panel prep still live in one app-layer hook | keep trimming into focused feature containers as new follow-up tasks are scheduled |
| Canvas interaction surface | `src/components/Canvas.tsx` plus `CanvasSelectionOverlays.tsx`, `CanvasTextEditor.tsx`, `CanvasContextMenu.tsx`, and `CanvasEmbedOverlays.tsx` | the stage root now composes focused overlay surfaces, but the pointer/session coordinator still lives in the root canvas component | `src/features/canvas/` |
| Canvas session/controller logic | `src/hooks/useCanvas.ts` (~1081 lines) | mixes document mutations, history, camera, store sync, grouping, and agent apply flows | `src/document/`, `src/editor/`, `src/features/workspace/` |
| Core contracts and helpers | `src/types/document.ts`, `src/types/editor.ts`, `src/types/export.ts`, `src/types/geometry.ts`, `src/types/hitTesting.ts`, `src/types/selection.ts`, `src/types/index.ts` | core contracts and pure helper modules are now split, while `src/types/index.ts` remains the compatibility barrel | keep adding new helper logic to the focused modules instead of the barrel |
| Render engine ownership | `src/components/Canvas.tsx`, `src/canvas/CanvasEngine.ts` | `Canvas.tsx` now owns the single live engine instance, but the stage still mixes rendering ownership with a large interaction surface | `src/canvas/` and later `src/features/canvas/` |
| Workspace persistence boundary | `src/stores/workspaceStore.ts` (~202 lines) | durable workspace records still include runtime-flavored editor fields | `src/stores/` plus extracted runtime/editor state |

## Ownership Rules

- `src/app/` owns app-shell composition, dialog toggles, and feature wiring. It should not own low-level document mutation logic.
- `src/document/` owns durable board structure and pure board logic: shapes, groups, geometry, selection traversal, export contracts, and document commands.
- `src/editor/` owns runtime interaction state: active tool, camera, selection state, current style, text-edit focus, and undo/redo bookkeeping.
- `src/canvas/` owns rendering and coordinate math only. It should not write store state or decide selection policy.
- `src/features/` owns React-facing feature code: canvas interaction surfaces, inspector models, workspace tabs, and other UI composition helpers.
- `src/agents/` owns proposal generation, validation, transport, and proposal-to-command adaptation. It should not directly own canvas-local mutation state.
- `src/stores/` owns persistence adapters for durable workspace snapshots. Runtime-only flags and session history should stay outside persisted storage.
- `src/utils/` owns cross-cutting helpers that are not canonical domain models.
- `src/types/index.ts` remains a compatibility barrel while imports migrate. New mixed-domain logic should not accumulate there.

## Target Module Map

| Target area | Owns | Should not own | First task that unlocks it |
|-------------|------|----------------|----------------------------|
| `src/app/` | `AppShell`, overlay slots, dialog orchestration, high-level feature containers | document commands, geometry helpers, selection derivation rules | 13 |
| `src/document/` | shape contracts, group model, geometry helpers, selection traversal, export schema, document commands | React state, DOM refs, persistence timers | 02, 03, 05, 07, 10 |
| `src/editor/` | editor state, default style state, history state, runtime-only flags | persisted workspace records, rendering code | 02, 07, 09, 11 |
| `src/canvas/` | `CanvasEngine`, draw helpers, render-time transforms, hit-test/render primitives | workspace save logic, DOM overlay composition | 04 |
| `src/features/canvas/` | stage composition, pointer interactions, marquee/context-menu/text-overlay components | canonical document types, global store persistence | 06 |
| `src/features/inspector/` | selection-driven inspector models and panel helpers | app-shell orchestration, document storage contracts | 08 |
| `src/features/workspace/` | workspace UI and workspace persistence coordination helpers | unrelated canvas commands or agent workflows | 09, 11 |
| `src/agents/` | workflow providers, transport adapters, proposal validation, adapters into document commands | direct ownership of undo/history state or canvas-local mutation helpers | 12 |
| `src/stores/` | workspace snapshot persistence and hydration | ephemeral history stacks, drag flags, transient interaction state | 09, 11 |
| `src/types/index.ts` | compatibility re-exports during the split | new source-of-truth contracts and helper implementations | 02 |

## Current File To Future Home Map

| Current file | Current cross-domain load | Future home(s) |
|--------------|---------------------------|----------------|
| `src/App.tsx` and `src/app/*` | root wiring plus app-shell composition, workspace init, export action, dialog control, selection-derived inspector state, and agent panel orchestration | keep `src/App.tsx` thin and continue moving shell-specific behavior toward focused helpers under `src/app/` and `src/features/` |
| `src/components/Canvas.tsx` | DOM stage, engine ownership, and stage-level pointer lifecycle while composing extracted selection, text-edit, context-menu, and embed overlay surfaces | `src/features/canvas/CanvasStage.tsx`, `CanvasInteractions.ts`, `CanvasSelectionOverlay.tsx`, `CanvasTextEditor.tsx`, `CanvasContextMenu.tsx`, `CanvasEmbeds.tsx` |
| `src/hooks/useCanvas.ts` | document commands, camera APIs, history, workspace sync, grouping, proposal apply | `src/document/commands/*`, `src/editor/history.ts`, `src/features/workspace/useWorkspacePersistence.ts`, `src/features/canvas/useCanvasSession.ts`, agent adapters in `src/agents/` |
| `src/types/index.ts` | compatibility barrel plus `createShapeId()` | keep the barrel for re-exports and avoid adding new mixed-domain helpers there |
| `src/stores/workspaceStore.ts` | durable workspace snapshots plus compatibility normalization for older runtime-heavy data | `src/stores/workspaceStore.ts` narrowed to durable snapshots, with runtime/editor state stripped at the boundary |
| `src/features/inspector/model/selectionInspectorModel.ts` and `selectedInspectorItems.ts` | pure selection-driven inspector state and metadata derivation | keep growing `src/features/inspector/model/` instead of rebuilding selection view models inside `src/App.tsx` or `src/components/PropertiesPanel.tsx` |
| `src/canvas/CanvasEngine.ts` | render engine plus creation/transform helpers used from multiple owners | stays in `src/canvas/`, with a single owning stage/controller boundary around it |
| `src/agents/agentOrchestrator.ts` and providers | proposal packaging, validation, and some mutation coupling through `useCanvas` | `src/agents/` remains the orchestration layer, while document apply paths move behind command adapters |

## Confirmed Sequence

| Seq | Task | Depends on | Why it comes here |
|-----|------|------------|-------------------|
| 01 | Domain Boundaries and Module Map | none | Establish the destination map before code moves. |
| 02 | Split Core Types Into Focused Modules | 01 | Creates separate document/editor/export contract homes before behavior moves. |
| 03 | Extract Geometry and Selection Helpers | 02 | Pulls pure helpers out of the mixed type barrel before command work depends on them. |
| 04 | Single Canvas Engine Owner | 02 | Clarifies who owns the engine before the interaction layer is decomposed. |
| 05 | Document Command Layer | 02, 03 | Moves board mutation logic behind pure commands once types and helpers have homes. |
| 06 | Split Canvas Interaction Surface | 04, 05 | Breaks the monolithic canvas UI apart after engine ownership and commands are stable. |
| 07 | Text Style Source of Truth | 02, 05 | Normalizes text style data after core types and mutation paths are isolated. |
| 08 | Selection-Driven Inspector Model | 05, 07 | Builds a clear inspector model after commands and style ownership are defined. |
| 09 | Persisted Versus Runtime Workspace State | 02 | Separates durable vs ephemeral workspace data once type boundaries exist. |
| 10 | Single Source Group Model | 03, 05 | Cleans up grouping semantics after helper ownership and commands are centralized. |
| 11 | Atomic Workspace Save and History | 05, 09 | Reworks save/history flow after commands and persistence boundaries are explicit. |
| 12 | Agent Document Application Boundary | 05 | Moves proposal application behind commands after the command layer exists. |
| 13 | App Shell Composition | 05, 08, 12 | Thins `App.tsx` only after commands, inspector models, and agent boundaries are stable. |

## Done Criteria For Each Cleanup Task

- Keep public behavior stable unless the task spec explicitly includes a behavior change.
- Leave new helpers in the destination module instead of adding more code to the old monolith.
- Update the relevant README files alongside the code move.
- Add or update targeted tests whenever the refactor changes a boundary that currently lacks direct coverage.

## Next Step

The sequenced architecture-cleanup backlog is complete. Capture any future structural follow-up as a new task instead of reopening Tasks 01 through 13.
