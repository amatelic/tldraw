# Task 10 - Single Source Group Model

## Status

- Status: Completed
- Sequence: 10
- Completed: 2026-04-22

## Goal

Pick one canonical representation for group relationships and derive the rest from it.

## Why This Task Exists

Groups currently store `childrenIds` while children also store `parentId`. That duplicates the same relationship and increases the chance of drift during grouping, ungrouping, deletion, and selection normalization.

## Flow To Support

1. Group traversal uses one canonical relationship model.
2. Selection normalization and layer operations work off that same canonical source.
3. Nested groups still behave correctly for selection, deletion, and reordering.
4. Any derived group views are computed instead of manually synchronized.

## Success Criteria

- [x] The canonical group relationship model is documented.
- [x] Redundant relationship state is removed or clearly derived.
- [x] Grouping, ungrouping, deletion, and layer-order tests still pass.
- [x] Nested group behavior remains unchanged for users.

## Constraints

- Do not add transform groups or resize groups in this task.
- Do not change visible grouping UX.
- Do not mix this task with agent or inspector redesign work.

## Likely Files

- `src/types/index.ts`
- `src/hooks/useCanvas.ts`
- grouping helper modules
- grouping tests

## Depends On

- `03-extract-geometry-and-selection-helpers.md`
- `05-document-command-layer.md`

## Implementation Notes

- Runtime `GroupShape` relationships now use child `parentId` as the only source of truth.
- `groupShapesInDocument()` and `ungroupShapesInDocument()` derive child ids from the document instead of storing `childrenIds` on group nodes.
- Selection helpers now expose `getGroupChildIds()` for callers that need ordered ids from the canonical relationship.
- Canvas group labels and workspace export payloads still show `childrenIds`, but those values are derived from parent links at render/export time rather than synchronized manually in runtime state.
