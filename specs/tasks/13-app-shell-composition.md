# Task 13 - App Shell Composition

## Status

- Status: Completed
- Sequence: 13

## Goal

Reduce `App.tsx` to shell composition and feature wiring instead of keeping it as a second home for domain logic.

## Why This Task Exists

`App.tsx` still owns workspace bootstrapping, dialog orchestration, selection derivation, layout actions, and panel wiring. After the earlier refactors, it should become much thinner and easier to read.

## Flow To Support

1. `App.tsx` mounts the shell and high-level feature surfaces.
2. Header actions, canvas stage, right rail, and dialogs are composed from smaller feature containers.
3. Low-level board mutation logic no longer lives in the app shell.
4. The app boot flow remains easy to understand from top to bottom.

## Success Criteria

- [x] `App.tsx` becomes primarily a composition and wiring layer.
- [x] Feature-specific derivation logic moves into focused helpers or containers.
- [x] Existing shell behavior remains unchanged.
- [x] Component or integration coverage is updated if the composition split changes boundaries.

## Constraints

- Do not redesign the visual app shell.
- Do not add routing, global event buses, or new state libraries.
- Keep workspace initialization behavior intact unless it is explicitly replaced by a clearer equivalent.

## Likely Files

- `src/App.tsx`
- `src/app/AppShell.tsx`
- `src/app/useAppShellState.ts`
- `src/app/useAppWorkspace.ts`
- `src/README.md`

## Depends On

- `05-document-command-layer.md`
- `08-selection-driven-inspector-model.md`
- `12-agent-document-application-boundary.md`

## Completion Notes

- Added `src/app/` as the app-shell ownership layer so the root `App.tsx` now just wires the workspace store, `useCanvas`, keyboard shortcuts, and the agent orchestrator into focused helpers.
- Moved workspace bootstrapping into `src/app/useAppWorkspace.ts`.
- Moved shell-level dialog toggles, export wiring, inspector-model consumption, and panel callbacks into `src/app/useAppShellState.ts`.
- Added `src/app/AppShell.tsx` as the declarative shell composition surface for the header, canvas area, right rail, and dialogs.
- Added direct hook coverage in `src/app/useAppShellState.test.tsx` so the extracted shell logic stays protected outside the root component.

## Verification

- `npx vitest run src/App.export.test.tsx src/App.inspector.test.tsx src/app/useAppShellState.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`
