# Architecture Task Backlog

## Overview

This folder contains the step-by-step backlog for the structural refactor of the app.

These tasks are intentionally narrow. The goal is to improve the domain model and module boundaries without changing too many things at once.

## Working Rules

- Work on one task at a time.
- Finish the current task before promoting the next one into active implementation.
- Treat each task file as the detailed brief for that slice.
- Promote implementation-ready items into `specs/SPECS.md` only when work actually starts.
- Prefer behavior-preserving refactors before behavior changes.
- Treat broad `useEffect`-driven state orchestration as an anti-pattern. Prefer deriving state during render, explicit event handlers, memoized selectors, and command-style updates instead.
- Reserve `useEffect` mostly for synchronizing with external systems such as third-party dependencies, browser APIs, subscriptions, timers, and network boundaries.

## Suggested Order

| Order | Task | Focus | Depends On |
|------|------|-------|------------|
| 01 | `01-domain-boundaries-and-module-map.md` | Freeze target architecture and ownership | None |
| 02 | `02-split-core-types.md` | Split `types/index.ts` into focused modules | 01 |
| 03 | `03-extract-geometry-and-selection-helpers.md` | Move helpers out of the type barrel | 02 |
| 04 | `04-single-canvas-engine-owner.md` | Remove duplicate `CanvasEngine` ownership | 02 |
| 05 | `05-document-command-layer.md` | Extract document mutation commands | 02, 03 |
| 06 | `06-canvas-interaction-split.md` | Break `Canvas.tsx` into smaller interaction slices | 04, 05 |
| 07 | `07-text-style-source-of-truth.md` | Normalize text typography storage | 02, 05 |
| 08 | `08-selection-driven-inspector-model.md` | Make inspector state come from selection | 05, 07 |
| 09 | `09-persisted-vs-runtime-workspace-state.md` | Separate durable state from transient UI state | 02 |
| 10 | `10-single-source-group-model.md` | Make grouping relationships canonical | 03, 05 |
| 11 | `11-atomic-workspace-save-and-history.md` | Make save flow atomic and explicit | 05, 09 |
| 12 | `12-agent-document-application-boundary.md` | Isolate agent apply and validation wiring | 05 |
| 13 | `13-app-shell-composition.md` | Shrink `App.tsx` into shell composition | 05, 08, 12 |

## Task Template

Each task file should answer the same questions:

- What problem are we solving?
- What flow should the app support after this task?
- What counts as success?
- What are the constraints and non-goals?
- Which files are likely to move?

## Notes

- These files are planning and implementation guides.
- They are not a replacement for tests.
- If a task exposes missing coverage, add the missing tests as part of that task's success criteria.
