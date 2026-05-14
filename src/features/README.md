# Features Directory

This directory contains feature-scoped UI composition helpers that sit between the app shell and the lower-level component or document modules.

## Current Structure

```
src/features/
├── canvas/
│   ├── dragSession.ts
│   ├── dragSession.test.ts
│   ├── resizeSession.ts
│   ├── resizeSession.test.ts
│   ├── textMeasurement.ts
│   ├── textMeasurement.test.ts
│   ├── useCanvasPanning.ts
│   ├── useCanvasPanning.test.ts
│   ├── useCanvasTextEditing.ts
│   ├── useCanvasTextEditing.test.ts
│   └── useCanvasInteractions.ts
└── inspector/
    └── model/
        ├── selectedInspectorItems.ts
        ├── selectedInspectorItems.test.ts
        ├── selectionInspectorModel.ts
        └── selectionInspectorModel.test.ts
```

## Ownership Rules

- Keep feature helpers pure when possible so they can be tested without React or DOM setup.
- Keep large component event controllers here when the component should stay focused on composition or rendering ownership.
- Derive inspector-specific view models here instead of rebuilding them inside the app layer or `src/components/PropertiesPanel.tsx`.
- Leave durable board mutations in `src/document/` and low-level render math in `src/canvas/`.

## Canvas Feature

`src/features/canvas/useCanvasInteractions.ts` owns the mutable interaction controller for the main canvas. It keeps `src/components/Canvas.tsx` focused on one `CanvasEngine` instance, redraw scheduling, and overlay composition while preserving the existing select, drag, resize, pan, wheel zoom, marquee, text edit, context menu, and audio toggle flows.

The hook emits a creation-complete callback after meaningful drawn shapes are added. The app shell uses that callback, plus wrapped text edit commit/cancel handlers, to return one-shot creation tools to Select without making the interaction hook own toolbar state.

Pure helper modules support the hook:

- `dragSession.ts` normalizes selected ids, expands selected groups to their descendants, and builds shape update payloads for drag movement.
- `resizeSession.ts` owns rectangle/image resize handle points, cursor mapping, hit testing, and minimum-size bounds updates.
- `textMeasurement.ts` owns text-editor auto-grow font construction and bounds calculation.
- `src/canvas/shapeFactory.ts` owns drag-preview shape seeds such as the initial pencil stroke point.
- `src/document/shapeFactories.ts` owns durable inserted document shapes such as text tool creation.
- `useCanvasPanning.ts` owns Space-key panning modifier state and active pan-session refs.
- `useCanvasTextEditing.ts` owns active text shape lookup, original-text restore state, commit/cancel key handling, and auto-grow measurement updates.

**Success Criteria**:
- [x] Canvas pointer session state lives outside `Canvas.tsx`
- [x] Drag, resize, and text measurement helpers are directly unit-tested
- [x] Text auto-grow uses the public `CanvasEngine.measureTextWidth()` boundary instead of a private context cast
- [x] Drawn shapes notify the app shell when one-shot creation completes
- [x] Existing high-risk Canvas interaction tests cover the extracted hook through the mounted component
- [x] Canvas interaction shape creation delegates to tested factories instead of inline hook literals
- [x] Space-key and active pan-session state are isolated behind a focused hook with direct behavior tests
- [x] Text-editing state and handlers are isolated behind a focused hook with direct behavior tests

**Constraints**:
- The interaction hook still receives renderer refs from `Canvas.tsx` so shape previews and coordinate transforms use the same live engine as rendering.
- DOM iframe drag/resize behavior for embeds remains in `CanvasEmbedOverlays.tsx` because embeds are not bitmap-rendered shapes.

**Known Issues**:
- `useCanvasInteractions.ts` still coordinates several modes in one hook; future work should continue splitting selection, drawing, and audio into narrower controllers when behavior changes justify the seam.
- Audio elements are retained for the mounted canvas lifetime and are not explicitly disposed on unmount.

## Inspector Feature

`src/features/inspector/model/selectionInspectorModel.ts` derives the current inspector mode from:

- the editor's default style
- the normalized top-level selection ids
- the current shape list

It returns one object that the app layer can pass straight into `PropertiesPanel`, including:

- defaults vs single vs multi-selection mode
- shared style values for the current selection
- mixed-style keys for explicit panel affordances
- selected-item metadata rows
- layout bounds and group/ungroup affordances

`src/features/inspector/model/selectedInspectorItems.ts` owns the stable type, layer, and hierarchy rows shown in the multi-select inspector.

`src/features/inspector/model/inspectorMixedValues.ts` centralizes the mixed-value flags that `PropertiesPanel` uses to label section headers, select placeholders, color rows, typography controls, and shadow controls. Keep this derivation in the model layer so inspector sections receive explicit booleans instead of rebuilding `Set<keyof ShapeStyle>` checks inline.

## Success Criteria

- [x] Inspector view-model logic stays outside `App.tsx`
- [x] Feature helpers remain pure and directly testable where possible
- [x] Component shells receive prepared data instead of re-deriving selection metadata inline

## Known Issues

- The app shell still hides the inspector when nothing is selected, so the model's `defaults` mode remains intentionally model-only behavior for now.
- Canvas interaction ownership has moved out of the component, but the hook remains broad and should be decomposed by mode over time.
