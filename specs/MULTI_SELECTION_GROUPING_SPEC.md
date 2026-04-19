# Multi-Selection & Grouping Spec

## Status

- Status: ✅ Implemented
- Last updated: 2026-04-17
- Primary implementation targets:
  - `src/App.tsx`
  - `src/components/Canvas.tsx`
  - `src/components/PropertiesPanel.tsx`
  - `src/hooks/useCanvas.ts`
  - `src/hooks/useKeyboard.ts`
  - `src/types/index.ts`
  - `src/canvas/CanvasEngine.ts`

## Assumed Design Context

This repository does not currently include a saved `.impeccable.md`, so this spec is written against explicit working assumptions that should be confirmed before implementation starts:

- **Target audience**: people making quick diagrams, lightweight whiteboards, and spatial notes in the browser
- **Primary use case**: selecting, arranging, and organizing a handful of shapes quickly without modal-heavy workflows
- **Product feel**: fast, predictable, and tool-like rather than playful or tutorial-driven

If those assumptions are wrong, the interaction details below should be adjusted before implementation, not after.

## Goal

Make it possible to select multiple canvas items intentionally and turn that selection into a group with the same low-friction feel users expect from desktop drawing tools.

This feature is not only about `groupShapes()` existing in state. The user must be able to build a multi-item selection reliably on the canvas, understand what is selected, discover how grouping works, and recover safely through undo/redo.

## Current State

The codebase already contains part of the grouping stack:

- `EditorState.selectedShapeIds` already supports multiple IDs
- `useCanvas` already exposes `groupShapes`, `ungroupShapes`, and grouped drag/layer-order helpers
- keyboard shortcuts already wire `Ctrl/Cmd+G` and `Ctrl/Cmd+Shift+G`
- the canvas context menu already exposes group/ungroup actions when the current selection shape allows it
- the inspector already understands multi-select bounds for layout readouts and arrange actions

The missing piece is the interaction model that makes multi-selection practical:

- pointer selection in `Canvas.tsx` is effectively single-select
- clicking a shape replaces selection instead of supporting additive selection
- dragging on empty space does not create a marquee selection
- `Shift + drag` currently starts panning, which conflicts with a standard multi-select gesture and is not reflected in the documented shortcut list
- grouping therefore exists as an internal capability, but not yet as a complete user-facing workflow

## Feature Summary

Users should be able to collect multiple top-level items into one selection through additive clicks or marquee selection, then group that set into a single movable entity. Grouped content should behave as one canvas object by default, while ungrouping should return the user to the previous child-level working set.

## Primary User Action

Build a selection set quickly, then convert it into one reusable group without losing spatial context.

## Design Direction

This should feel like a calm, capable canvas tool:

- direct manipulation first
- minimal extra chrome
- standard modifier behavior where possible
- visible feedback during selection building
- no hidden state changes that make users wonder what happened

The feature should lean toward established whiteboard/design-tool behavior rather than inventing novel selection rules.

## Interaction Model

### 1. Selection Entities

Selection always operates on **top-level selectable entities**:

- an ungrouped shape is selectable directly
- a child inside a group resolves to its outermost group for canvas-level selection
- a group is treated as one selectable object until the user explicitly ungroups it

This keeps selection, dragging, delete, and layer ordering aligned on the same unit of interaction.

### 2. Single Click

When the active tool is `select`:

- clicking a selectable entity with no modifier replaces the current selection with that entity
- clicking empty canvas clears selection
- clicking an already selected entity starts drag without collapsing the rest of the current selection

### 3. Additive Selection

`Shift + Click` toggles the clicked top-level entity in the current selection:

- if the entity is not selected, add it
- if the entity is already selected, remove it
- if removing it empties the set, selection becomes empty

This is the primary low-effort way to build a small multi-selection.

### 4. Marquee Selection

Dragging from empty canvas while the `select` tool is active should create a marquee rectangle.

Default marquee behavior:

- replaces the current selection
- selects every top-level entity whose bounds intersect the marquee
- deduplicates grouped descendants so a group is selected once even if several children intersect the box

Additive marquee behavior:

- `Shift + drag` from empty canvas adds intersecting top-level entities to the existing selection

Out of scope for the first pass:

- subtractive marquee
- freeform/lasso selection
- directional crossing-vs-containing selection modes

### 5. Pan Conflict Resolution

The current `Shift + drag` panning path should be removed for the select tool because it directly conflicts with additive selection.

Panning remains available through the existing supported paths:

- `Space + drag`
- middle mouse drag
- explicit `pan` tool

This resolves an interaction collision and brings the code in line with the documented shortcuts.

### 6. Group Action Entry Points

Grouping should be available from three places:

1. keyboard shortcut: `Ctrl/Cmd + G`
2. canvas context menu: `Group selection`
3. inspector action row inside the `Layout` section when multi-select is active

Ungroup should be available from:

1. keyboard shortcut: `Ctrl/Cmd + Shift + G`
2. canvas context menu: `Ungroup`
3. inspector action row when a single group is selected

### 7. Group Command Rules

`Group` is enabled only when the normalized selection contains at least two distinct top-level entities.

When grouping succeeds:

- a new `group` node is created around the selected entities
- the new group inherits the common parent when all grouped entities already share one
- the new group becomes the only selected entity
- the operation is recorded as one undo step

When grouping is unavailable:

- UI affordances should be disabled or omitted instead of failing silently

### 8. Ungroup Command Rules

`Ungroup` is enabled when exactly one selected entity is a group.

When ungrouping succeeds:

- the group node is removed
- children are reattached to the removed group's parent, if any
- the ungrouped children become the active selection
- the operation is recorded as one undo step

The first release does not need bulk-ungroup across several selected groups at once.

### 9. Dragging Behavior

Dragging any selected entity should move the full normalized selection:

- multi-selected ungrouped entities move together
- selected groups move with all descendants
- dragging a member of the current multi-selection should not replace the selection first

### 10. Visual Feedback

The selection system should expose three layers of feedback:

- per-entity selected styling for each selected top-level item
- a visible marquee rectangle while drag-selection is in progress
- a combined selection frame when two or more top-level entities are selected

The combined frame should read as a temporary working set, not a persistent group.

### 11. Context Menu Behavior

Right-click behavior should remain predictable:

- right-click on an unselected entity selects that entity first, then opens the menu
- right-click on an already selected entity preserves the current selection and opens the menu
- right-click on empty canvas closes any open canvas menu and does not create a new one

### 12. Inspector Behavior

The inspector should do two jobs for multi-selection:

1. keep arrangement and group actions discoverable
2. show which top-level entities are currently in the working set

The implemented behavior is:

- show a `Selected Items` section above `Layout` when `selectedCount > 1`
- show one row per selected top-level entity
- sort rows by layer index ascending, where `0 = backmost`
- show the user-facing type label, `L{layerIndex}` badge, and a read-only hierarchy label for each row
- use `Ungrouped` for top-level non-group items
- use `Top level` for selected groups without ancestor groups
- use generic group breadcrumbs such as `Group > Group` when ancestry exists
- never show raw ids in the inspector
- keep the list read-only in the first release

The existing `Layout` section continues to surface group actions:

- show `Group selection` when `selectedCount >= 2`
- show `Ungroup` when a single group is selected
- keep layout bounds read-only for multi-select in the first pass

## Key States

### No Selection

- no inspector
- no group actions visible
- click or marquee begins a new selection

### Single Shape Selected

- existing single-selection affordances remain unchanged
- `Group` hidden/disabled

### Multi-Selection Active

- combined selection frame visible
- inspector remains open with a selected-items metadata list plus combined bounds and arrange/group actions
- context menu offers `Group selection`

### Marquee In Progress

- live rectangular overlay follows the pointer
- potential selection result should feel obvious from geometry and highlight treatment

### Group Selected

- group behaves as one selected object
- inspector can show ungroup action
- dragging moves descendants together

### Invalid Group Attempt

- `Group` action is unavailable when selection normalizes to fewer than two top-level entities
- no-op behavior is allowed internally, but the UI should not encourage impossible actions

## Technical Design

### Selection Normalization

Introduce a shared normalization helper so every selection-based feature operates on the same top-level IDs:

- promote child IDs to their root group IDs
- deduplicate IDs after promotion
- preserve stable ordering where possible

This helper should be reused by:

- canvas click selection
- marquee selection
- `canGroupSelection`
- group/ungroup entry points
- bring-to-front / send-to-back actions where needed

### Canvas Interaction State

Add transient canvas-only state for marquee selection. This should not be persisted to workspace storage or history.

Expected responsibilities:

- track drag origin in world coordinates
- track live marquee bounds
- distinguish shape drag from empty-space marquee drag
- commit the final selected IDs on pointer up

### Rendering

One of these two approaches is acceptable for the first pass:

1. draw marquee and combined selection bounds in `CanvasEngine`
2. render a DOM overlay positioned from `worldToScreen`

Whichever approach is chosen should preserve zoom/pan correctness and avoid lag during pointer move.

### Inspector Wiring

`PropertiesPanel` likely needs explicit props for group actions, for example:

- `onGroup`
- `onUngroup`
- `canGroup`
- `canUngroup`

This keeps grouping discoverable without adding permanent header chrome.

### Inspector Metadata View Model

The multi-select inspector list should be driven by a small pure view-model builder:

- input: already-normalized top-level selected ids plus the runtime `shapes` array
- output rows should include:
  - `id`
  - `typeLabel`
  - `layerIndex`
  - `hierarchyLabel`

Derivation rules:

- type label comes from the selected entity's `type`
- layer index comes from the selected entity's order in the `shapes` array
- hierarchy comes from walking `parentId` through ancestor groups only
- rows are sorted back-to-front before rendering

## Implementation Plan

1. Add shared selection-normalization helpers for top-level entity selection.
2. Update `Canvas.tsx` pointer logic to support additive click, marquee selection, and drag-preserving multi-select behavior.
3. Remove the `Shift + drag` pan shortcut path from select-mode pointer handling.
4. Render marquee and combined multi-selection feedback.
5. Expose group/ungroup actions from the inspector in addition to keyboard and context menu entry points.
6. Add a selected-items inspector section for multi-select metadata.
7. Extend tests for pointer selection, marquee selection, grouping, selected-items metadata, and undo/redo regression coverage.

## Acceptance Criteria

- `Shift + Click` toggles shapes or groups into and out of the current selection
- dragging on empty canvas with the select tool creates a marquee selection box
- marquee selection chooses intersecting top-level entities instead of raw child IDs
- `Shift + drag` marquee adds to the current selection
- `Shift + drag` no longer triggers panning in select mode
- users can group a valid multi-selection through keyboard, context menu, and inspector
- users can ungroup a selected group through keyboard, context menu, and inspector
- multi-select inspector shows one row per selected top-level entity with type, layer index, and hierarchy metadata
- selected-items rows are sorted back-to-front and do not expose raw ids
- grouping selects the newly created group
- ungrouping selects the released children
- dragging a selected item inside a multi-selection moves the full selection
- grouped descendants move together when the group is dragged
- a combined multi-selection frame is visible for two or more selected top-level entities
- undo/redo preserves grouping and ungrouping behavior without partial state

## Testing Plan

### Unit / Integration

- `src/hooks/useCanvas.grouping.test.ts`
  - normalized selection helpers
  - grouping/ungrouping regression coverage
  - history expectations after group/ungroup

- `src/components/selectedInspectorItems.test.ts`
  - layer index ordering
  - type-label mapping
  - `Ungrouped` and `Top level` hierarchy fallbacks
  - generic ancestor breadcrumbs
  - normalized top-level selection behavior

### Component

- new `src/components/Canvas.selection.test.tsx`
  - click-to-select
  - `Shift + Click` add/remove
  - drag-selected-item preserves full selection
  - marquee replace selection
  - additive marquee
  - right-click preserves or replaces selection correctly

- `src/components/Canvas.context-menu.test.tsx`
  - group/ungroup visibility against normalized multi-selection

- `src/components/PropertiesPanel.test.tsx`
  - selected-items section visibility for multi-select only
  - selected-items row ordering and metadata rendering
  - inspector group/ungroup action row visibility and callbacks

## Constraints

- first release should not introduce deep group-edit mode
- first release should not support lasso selection
- first release should not support subtractive marquee
- selection math must remain correct under zoom and pan
- grouping must continue to work with nested groups

## Related

- `specs/SPECS.md`
- `specs/right-panel-refactor-SPEC.md`
- `src/components/Canvas.tsx`
- `src/hooks/useCanvas.ts`
- `src/components/PropertiesPanel.tsx`
