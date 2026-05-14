# Task 06 - Split Canvas Interaction Surface

## Status

- Status: ✅ Completed
- Sequence: 06
- Started: 2026-04-22
- Completed: 2026-04-22

## Goal

Break `Canvas.tsx` into smaller interaction slices without changing the user-facing canvas behavior.

## Completed Work

This task finished in two passes:

- simplified effect-heavy coordination inside `Canvas.tsx` so resize-driven engine work is separate from ordinary redraws, context-menu invalidation is derived from one boolean guard, and panning state no longer needs a ref-sync effect
- extracted the overlay and shell-only interaction surfaces into focused components:
  - `CanvasSelectionOverlays.tsx`
  - `CanvasTextEditor.tsx`
  - `CanvasContextMenu.tsx`
  - `CanvasEmbedOverlays.tsx`

## Why This Task Exists

`Canvas.tsx` currently owns pointer input, text editing overlay, context menu, embed overlays, marquee state, audio toggling, and rendering coordination. That makes it very hard to navigate and change safely.

## Flow To Support

1. Pointer input is handled by a focused interaction layer.
2. Text editing uses a dedicated overlay and edit-session flow.
3. Context menu, marquee, and embed overlays are isolated from base pointer logic.
4. The canvas root composes those pieces instead of owning every branch directly.

## Success Criteria

- [x] `Canvas.tsx` is reduced to a stage-level composition surface instead of owning every overlay branch inline.
- [x] Extracted interaction pieces have clear ownership and names.
- [x] Existing component and interaction tests still pass.
- [x] Missing coverage is added for any extracted interaction path that was previously implicit.

## Constraints

- Do not redesign the canvas UI.
- Do not change keyboard shortcuts in this task.
- Do not mix this task with the text-style model refactor.

## Likely Files

- `src/components/Canvas.tsx`
- `src/components/CanvasSelectionOverlays.tsx`
- `src/components/CanvasTextEditor.tsx`
- `src/components/CanvasContextMenu.tsx`
- `src/components/CanvasEmbedOverlays.tsx`
- `src/components/Canvas.selection.test.tsx`
- `src/components/Canvas.text-editing.test.tsx`
- `src/components/Canvas.context-menu.test.tsx`
- `src/components/Canvas.embed-resize.test.tsx`
- `src/components/README.md`

## Depends On

- `04-single-canvas-engine-owner.md`
- `05-document-command-layer.md`
