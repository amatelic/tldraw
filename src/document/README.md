# Document Directory

This directory contains pure document-layer logic for board mutations and other durable shape operations.

## Overview

The document layer is where board mutation rules live when they do not need React state, DOM access, or persistence side effects.

Current responsibilities:
- pure shape mutation commands
- grouping and ungrouping rules
- layer reordering rules
- layout commands such as align, distribute, and tidy
- proposal-to-shape application helpers for generated and mutation workflows
- text typography normalization and compatibility helpers for legacy persisted shapes
- reusable insertion shape factories for uploaded media, embeds, and text
- durable document rules only; canvas drag-preview shape factories live in `src/canvas/shapeFactory.ts`

## Files

| File | Purpose |
|------|---------|
| `commands.ts` | Pure document mutation commands for shapes, groups, layout, and proposal application |
| `commands.test.ts` | Unit coverage for the extracted command layer |
| `shapeFactories.ts` | Reusable document shape factories for image, audio, embed, and text insertion |
| `shapeFactories.test.ts` | Unit coverage for insertion sizing, centering, metadata, and typography defaults |
| `textStyle.ts` | Canonical text typography helpers plus legacy text-style normalization |
| `textStyle.test.ts` | Unit coverage for text typography normalization and sync helpers |

## Command Layer

`commands.ts` exports pure helpers that take `{ shapes, editorState }` and return the next document state.

Key command families:
- shape CRUD: add, update, delete, delete-selected
- shape bounds/style updates: shared helpers that keep circle geometry in sync when bounds change
- grouping and layer order: group, ungroup, bring-to-front, send-to-back
- layout actions: align, distribute, tidy
- agent application: generated-diagram insertions and validated mutation application
- text style sync: text typography updates now keep canonical text fields and the compatibility `style` mirror aligned
- insertion factories: image uploads scale to a 300px max width, audio clips use the standard 300x80 player bounds, embeds use the standard 480x270 16:9 bounds, and text shapes mirror typography from the active style

**Group relationship model**:
- Runtime group membership now uses child `parentId` as the canonical source of truth
- Group and ungroup commands derive child ids from the current document instead of storing a second `childrenIds` list on group shapes
- Layout commands treat selected groups as block targets and move descendants by the same delta
- Export surfaces can still emit derived child-id lists when a public format wants that redundancy
- Export and live rendering now share canvas geometry helpers for bounds and arrowheads instead of duplicating those calculations in the renderer/export paths

## Text Typography Model

Text shapes now treat their own typography fields (`fontSize`, `fontFamily`, `fontWeight`, `fontStyle`, `textAlign`) as the canonical runtime source.

`textStyle.ts` supports that model by:
- normalizing legacy text shapes that only have typography inside `style`
- keeping the `style` typography values mirrored for compatibility while the rest of the app migrates
- giving render/export surfaces one shared fallback path instead of open-coding text field lookups

## Success Criteria

- [ ] Board mutation rules stay testable without rendering hooks or components
- [ ] `App.tsx` does not own inline shape-mutation loops
- [ ] `useCanvas` coordinates history and persistence around command results
- [ ] Shape layout commands can be undone in a single step
- [x] App-shell media insertion uses reusable document factories instead of inline shape literals

## Known Issues

1. Text shapes still carry typography inside both top-level fields and `style` for compatibility, but `textStyle.ts` now defines the canonical read/write path so those values should not drift.

## Dependencies

- `src/types/`
- `src/types/geometry.ts`
- `src/types/selection.ts`
- `src/agents/` proposal types
