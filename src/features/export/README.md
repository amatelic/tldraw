# Export Feature

## Purpose

Provide a single header-driven export surface for:
- JSON workspace backups
- PNG snapshots of the current viewport
- PNG/SVG exports of all shapes or only the current selection

## User Flows

### Export Menu

The `Export` header button opens a menu with:
- `Export JSON`
- `Export PNG Viewport`
- `Export PNG All Shapes`
- `Export PNG Selected Shapes`
- `Export SVG All Shapes`
- `Export SVG Selected Shapes`

Selection-only actions are disabled when nothing is selected.

## Scope Rules

- Viewport PNG uses the live canvas bitmap exactly as currently framed by the camera.
- All-shapes PNG/SVG exports use the combined bounds of every shape on the board.
- Selected-shapes PNG/SVG exports use only the selected shapes.
- Group selections should include descendant shapes before export so nested content is not dropped.

## Filenames

Downloads use timestamped filenames derived from the workspace name:
- JSON: `<workspace>-<timestamp>.json`
- PNG/SVG: `<workspace>-<scope>-<timestamp>.<ext>`

Scope labels currently include:
- `viewport`
- `all-shapes`
- `selection`

## Implementation Notes

- Header/menu behavior lives in [`App.tsx`](../../App.tsx).
- Raster/vector export rendering lives in [`CanvasEngine.ts`](../../canvas/CanvasEngine.ts).
- Filename and browser download helpers live in [`workspaceExport.ts`](../../utils/workspaceExport.ts).

## Success Criteria

- Header exposes a discoverable export entry point.
- Viewport PNG downloads from the current live canvas.
- All-shapes and selected-shapes PNG exports render with padding and a solid background.
- All-shapes and selected-shapes SVG exports download as vector markup.
- Filenames remain deterministic and filesystem-safe.

## Known Issues

- SVG export is geometry-focused and does not yet match every canvas-only visual effect perfectly.
- Selection export depends on callers expanding grouped descendants before handing shapes to the export engine.
