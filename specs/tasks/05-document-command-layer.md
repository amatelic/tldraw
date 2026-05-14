# Task 05 - Document Command Layer

## Status

- Status: ✅ Completed
- Sequence: 05
- Completed: 2026-04-22

## Goal

Extract document mutation logic into a focused command layer that is easier to test and reuse.

## Delivered Output

This task now provides:

- a new pure document command layer in `src/document/commands.ts`
- direct command-level tests in `src/document/commands.test.ts`
- hook-level layout history coverage in `src/hooks/useCanvas.layout.test.ts`
- a slimmer `App.tsx` that triggers high-level command APIs instead of mutating shapes inline for align/distribute/tidy and layout-bound updates

## Why This Task Exists

Document operations are currently split between `App.tsx` and `useCanvas.ts`. That makes the app shell own low-level board logic and makes mutation behavior harder to test in isolation.

## Completion Notes

- `useCanvas` now coordinates history, validation, and persistence around the pure command results instead of re-implementing each board mutation inline.
- Align/distribute/tidy now land as one undoable mutation instead of a chain of per-shape updates.
- Group-aware layout actions still use the current top-level group bounds behavior; that follow-up is explicitly tracked for Task 10.

## Flow To Support

1. UI surfaces trigger high-level document commands instead of editing shapes inline.
2. Commands handle add, update, delete, group, ungroup, reorder, align, distribute, tidy, and agent-driven mutations.
3. `useCanvas` becomes the state and history coordinator rather than the home of every mutation rule.

## Success Criteria

- [x] A dedicated command layer exists for document mutations.
- [x] Board mutation logic is removed from `App.tsx`.
- [x] Document commands are unit tested without requiring component rendering.
- [x] Undo and redo still work across extracted command paths.

## Constraints

- Do not redesign the UI while doing this extraction.
- Do not change persistence format yet.
- Do not change group semantics yet beyond moving existing logic.

## Likely Files

- `src/hooks/useCanvas.ts`
- `src/App.tsx`
- new command modules in the agreed location
- related tests under `src/hooks/` or new command test files

## Depends On

- `02-split-core-types.md`
- `03-extract-geometry-and-selection-helpers.md`
