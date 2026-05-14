# Task 07 - Text Style Source of Truth

## Status

- Status: ✅ Completed
- Sequence: 07
- Completed: 2026-04-22

## Goal

Make text typography come from one canonical model instead of being duplicated across root text fields and `shape.style`.

## Delivered Output

This task now provides:

- a shared text typography helper in `src/document/textStyle.ts`
- legacy text-shape normalization on `useCanvas` load so persisted workspaces regain canonical text fields
- command-layer sync so inspector and agent style updates keep text fields and compatibility mirrors aligned
- renderer, textarea overlay, and workspace export reads that all go through the same text-typography helper
- focused regression coverage for legacy text shapes in the document layer, hook load path, canvas text editor, renderer, and export serialization

## Why This Task Exists

Text shapes currently store typography in two places. Rendering reads one representation while some updates write to another. That creates drift risk in editing, inspector updates, export, and generated content.

## Flow To Support

1. Creating a text shape stores typography once.
2. Editing text, applying inspector changes, and rendering all read the same typography source.
3. Export and import preserve the same canonical representation.
4. Agent-created text also lands on the same model.

## Success Criteria

- [x] One canonical text-style representation is chosen and documented.
- [x] Render, textarea overlay, style updates, and export all use that same source.
- [x] Existing text-editing and inspector tests still pass.
- [x] If migration or compatibility logic is needed for persisted workspaces, it is covered by tests.

## Constraints

- Preserve existing visible text behavior.
- Do not combine this with a visual inspector redesign.
- Backwards compatibility for existing local data must be maintained or explicitly migrated.

## Completion Notes

- Canonical runtime typography now lives on `TextShape` itself through the shared `TextTypography` contract.
- Typography inside `shape.style` remains as a compatibility mirror while the app continues to normalize and rewrite older persisted shapes.
- `useCanvas` normalizes loaded document shapes so legacy text nodes continue to render and export correctly without manual workspace migration steps.

## Likely Files

- `src/types/index.ts`
- `src/hooks/useCanvas.ts`
- `src/components/Canvas.tsx`
- `src/canvas/CanvasEngine.ts`
- `src/utils/workspaceExport.ts`

## Depends On

- `02-split-core-types.md`
- `05-document-command-layer.md`
