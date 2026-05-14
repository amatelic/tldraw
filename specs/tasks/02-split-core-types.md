# Task 02 - Split Core Types Into Focused Modules

## Status

- Status: ✅ Completed
- Sequence: 02
- Completed: 2026-04-21

## Goal

Split the current `src/types/index.ts` barrel into smaller focused modules without changing runtime behavior.

## Delivered Output

This task now provides:

- `src/types/document.ts` for durable document and shape contracts
- `src/types/editor.ts` for tool, camera, and editor-session contracts
- `src/types/export.ts` for the versioned workspace export schema
- a thinner `src/types/index.ts` compatibility barrel that re-exports the focused modules while keeping the remaining shared helpers in place
- `src/types/index.test.ts` to lock the compatibility barrel for both runtime exports and type imports

## Why This Task Exists

`src/types/index.ts` currently mixes document entities, editor state, defaults, export schema, and helper functions. That makes the main domain harder to understand and harder to evolve safely.

## Completion Notes

- Existing imports continue to work through `src/types/index.ts`.
- Geometry, grouping, and selection helpers intentionally remain in the compatibility barrel for now so Task 03 can extract them as a focused follow-up instead of mixing two refactors together.
- No runtime shape schema changes were introduced in this task.

## Flow To Support

1. Shape and document types live in a document-focused module.
2. Editor and camera state live in an editor-focused module.
3. Export contracts live in an export-focused module.
4. Existing imports can continue working through a compatibility barrel while the app migrates gradually.

## Success Criteria

- [x] Focused type modules exist for document, editor, and export contracts.
- [x] `src/types/index.ts` becomes a thin barrel or compatibility layer.
- [x] The app builds without circular type dependencies.
- [x] Existing tests still pass after the split.
- [x] If import coverage is missing, targeted tests or build checks are added as part of the task.

## Constraints

- Do not change the shape schema yet.
- Do not change behavior in canvas, inspector, or store code.
- Preserve backwards-compatible imports during the migration.

## Likely Files

- `src/types/index.ts`
- `src/types/README.md`
- new files under `src/types/`

## Depends On

- `01-domain-boundaries-and-module-map.md`
