# Task 03 - Extract Geometry and Selection Helpers

## Status

- Status: ✅ Completed
- Sequence: 03
- Completed: 2026-04-21

## Goal

Move geometry, hit-testing, grouping traversal, and selection helpers out of the type barrel into dedicated modules.

## Delivered Output

This task now provides:

- `src/types/geometry.ts` for shared bounds math
- `src/types/hitTesting.ts` for point-in-shape hit-testing
- `src/types/selection.ts` for group traversal, selection normalization, and selection bounds
- runtime imports in `App.tsx`, `Canvas.tsx`, and `useCanvas.ts` that point at the dedicated helper modules
- focused helper tests in `src/types/geometry.test.ts`, `src/types/hitTesting.test.ts`, and `src/types/selection.test.ts`

## Why This Task Exists

Helpers like `getSelectionBounds`, `isPointInShape`, and `normalizeShapeIdsForSelection` are domain behavior, not type declarations. Keeping them inside `src/types/index.ts` hides the real model structure.

## Completion Notes

- `src/types/index.ts` remains the compatibility barrel so existing imports still work.
- The extracted helper logic is unchanged in behavior; this task only changes ownership and direct import locations.
- Group traversal still follows the current storage model, including the expectation that nested groups maintain their own bounds.

## Flow To Support

1. Canvas interactions import geometry and hit-testing from dedicated modules.
2. Selection and grouping logic import from shared selection helpers.
3. Inspector, canvas, and agent code use the same shared helpers instead of duplicating logic.

## Success Criteria

- [x] Geometry helpers live in focused modules instead of `src/types/index.ts`.
- [x] Selection and grouping traversal helpers live in focused modules instead of `src/types/index.ts`.
- [x] Existing selection behavior remains unchanged for grouped and ungrouped shapes.
- [x] Unit tests cover the extracted helpers where coverage is currently weak or absent.

## Constraints

- Do not change selection semantics in this task.
- Do not change the group storage model yet.
- Do not mix this with command extraction or canvas UI decomposition.

## Likely Files

- `src/types/index.ts`
- new helper modules under `src/types/` or the agreed domain folder
- `src/components/Canvas.tsx`
- `src/App.tsx`

## Depends On

- `02-split-core-types.md`
