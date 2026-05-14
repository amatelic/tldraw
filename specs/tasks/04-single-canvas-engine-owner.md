# Task 04 - Single Canvas Engine Owner

## Status

- Status: ✅ Completed
- Sequence: 04
- Completed: 2026-04-22

## Goal

Remove duplicate `CanvasEngine` ownership and make one layer responsible for rendering and coordinate transforms.

## Delivered Output

This task now provides:

- a single `CanvasEngine` owner in `src/components/Canvas.tsx`
- pure `screenToWorldPoint()` and `worldToScreenPoint()` helpers exported from `src/canvas/CanvasEngine.ts`
- a slimmer `useCanvas` hook that manages document/editor state without constructing rendering objects
- focused regression coverage in `src/components/Canvas.engine-owner.test.tsx` alongside the existing canvas interaction suites

## Why This Task Exists

`useCanvas` and `Canvas.tsx` both create a `CanvasEngine`. That makes rendering responsibilities blurry and increases the risk of stale transforms or split behavior.

## Completion Notes

- `Canvas.tsx` now owns the only live engine instance for the mounted canvas surface.
- `App.tsx` computes viewport-center placement through the shared transform helpers instead of reaching back into the hook for engine-backed coordinate APIs.
- `useCanvas` still owns the canvas ref and editor/document state, but it no longer performs render or resize work.

## Flow To Support

1. One mounted canvas element owns one rendering engine.
2. Screen-to-world and world-to-screen conversions come from that same owner.
3. `useCanvas` manages document and editor state but does not construct rendering objects.
4. Resize and redraw go through one rendering path.

## Success Criteria

- [x] Only one `CanvasEngine` instance is created for the active canvas surface.
- [x] Render, resize, and coordinate transforms still behave the same.
- [x] Existing canvas rendering and interaction tests remain green.
- [x] If transform or render coverage is missing, focused tests are added.

## Constraints

- Do not change pointer behavior in this task.
- Do not refactor `Canvas.tsx` into multiple files yet.
- Do not combine this task with text-model normalization.

## Likely Files

- `src/hooks/useCanvas.ts`
- `src/components/Canvas.tsx`
- `src/canvas/CanvasEngine.ts`
- `src/canvas/README.md`

## Depends On

- `02-split-core-types.md`
