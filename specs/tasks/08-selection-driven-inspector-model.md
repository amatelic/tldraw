# Task 08 - Selection-Driven Inspector Model

## Status

- Status: ✅ Completed
- Sequence: 08
- Started: 2026-04-22
- Completed: 2026-04-22

## Goal

Make the inspector derive from the selected shapes instead of using the editor's default tool style as its main source.

## Why This Task Exists

The current inspector wiring behaves more like a tool preset editor than a true shape inspector. That makes selection styling ambiguous and blocks future support for mixed values.

## Flow To Support

1. With no selection, the inspector can reflect current tool defaults.
2. With a single selection, the inspector shows the actual selected shape values.
3. With a multi-selection, the inspector shows shared values and mixed-state behavior where needed.
4. Applying a change updates the selected shapes and optionally updates defaults only when that is the intended mode.

## Success Criteria

- [x] The inspector has a clear selected-shape data model.
- [x] Single-selection values come from the selected shape, not only editor defaults.
- [x] Multi-selection behavior is defined for shared and mixed values.
- [x] Tests cover no-selection, single-selection, and multi-selection derivation across the pure model and app wiring.

## Constraints

- Keep the current visual shell and layout direction.
- Do not redesign the panel into a different product surface.
- Do not introduce advanced style tokens or remote data dependencies.

## Likely Files

- `src/App.tsx`
- `src/app/useAppShellState.ts`
- `src/components/PropertiesPanel.tsx`
- `src/features/inspector/model/selectionInspectorModel.ts`
- `src/features/inspector/model/selectedInspectorItems.ts`
- new inspector derivation helpers in the agreed location

## Depends On

- `05-document-command-layer.md`
- `07-text-style-source-of-truth.md`

## Progress Notes

- Added `src/features/inspector/model/selectionInspectorModel.ts` so the app shell can derive one stable inspector view model from current defaults, normalized selection ids, and shapes.
- Moved `selectedInspectorItems` into `src/features/inspector/model/` so the selection metadata helper now lives with the rest of the inspector model layer.
- Added model-level and app-level regression coverage for defaults, single-selection, and multi-selection wiring.
- `PropertiesPanel` now receives `mixedStyleKeys` from the app layer and surfaces explicit mixed-value affordances through section metadata, select placeholders, slider aria text, and mixed color/value labels.
- The app shell still hides the panel when nothing is selected, so the model's `defaults` mode remains intentionally documented as model-only behavior for now.
