# Embed & Layout Interactions Specification

## Status

- Status: ✅ Implemented
- Last updated: 2026-04-16
- Primary implementation:
  - `src/components/Canvas.tsx`
  - `src/components/PropertiesPanel.tsx`
  - `src/App.tsx`
  - `src/App.css`
  - `src/index.css`

## Goal

Define how embedded website/video elements behave on the canvas and how the inspector layout fields should edit element bounds. This spec is the reference for selection, movement, resizing, and inspector-driven size changes so future UI work keeps the interaction model consistent.

## Scope

This spec covers:

1. Embedded element movement on the canvas
2. Embedded element resize behavior
3. Inspector layout field editing for frame-like shapes
4. Embedded-shell responsiveness when the app is mounted inside a resizable host element

## Implemented Behavior

### 1. Embedded Canvas Elements

Embedded elements render as overlay DOM nodes above the canvas drawing surface.

Supported element kinds:

- website embeds
- YouTube embeds

Each embed renders with:

- a top drag bar
- a visible frame border when selected
- sandboxed iframe content
- resize handles when selected in the `select` tool

### 2. Embed Movement

Movement rules:

- The top blue drag bar is the dedicated move affordance
- Dragging is only active when the current tool is `select`
- Dragging updates the embed `bounds.x` and `bounds.y`
- Width and height remain unchanged while moving

### 3. Embed Resizing

Selected embeds expose eight resize handles:

- corners: `nw`, `ne`, `se`, `sw`
- edges: `n`, `e`, `s`, `w`

Resize rules:

- Handles are only visible when:
  - the current tool is `select`
  - the embed is selected
- Corner handles resize both axes
- Edge handles resize one axis only
- Resize math uses screen drag distance divided by camera zoom so behavior stays correct under zoom
- Resize updates the embed `bounds` directly
- Resizing does not currently preserve aspect ratio
- Resizing does not snap to a grid

Minimum size:

- Minimum width: `160`
- Minimum height: `120`

Clamp behavior:

- If a drag would shrink below the minimum size, the frame clamps at the minimum
- For west/north handles, clamping keeps the opposite edge fixed
- For east/south handles, clamping keeps the origin fixed

### 4. Inspector Layout Editing

The right-side inspector exposes `X`, `Y`, `W`, and `H` fields in the `Layout` section.

Editable cases:

- single selected `rectangle`
- single selected `image`
- single selected `audio`
- single selected `text`
- single selected `embed`

Read-only cases:

- multi-selection
- `circle`
- `line`
- `arrow`
- `pencil`
- `group`

This is intentional because those read-only shapes need geometry-aware resizing beyond simple `bounds` replacement.

### 5. Inspector Commit Rules

Field behavior:

- Inputs show the rounded integer form of the current bounds
- Editing is draft-based while the field is focused
- `Enter` commits the current numeric value
- blur commits the current numeric value
- `Escape` restores the current rendered value and exits the field

Validation behavior:

- Empty values revert to the current rendered bounds
- Non-numeric values revert to the current rendered bounds
- Values equal to the current rounded bounds do not dispatch an update

Bounds constraints:

- Width and height are clamped to at least `1` when committed from the inspector

### 6. Embedded Host Responsiveness

The app shell now behaves relative to its host container rather than assuming the browser viewport.

Shell rules:

- `.app` is the primary layout container
- header, toolbar, zoom controls, dialogs, and inspector overlays are positioned relative to `.app`
- responsive shell behavior is driven by container queries rather than viewport media queries alone
- popovers from the inspector prefer to portal into the nearest `.app` shell

This allows the board to work correctly when embedded in:

- resizable panels
- split panes
- iframes with explicit width/height
- host containers that change size independently of the browser window

## Interaction Reference

### Embed: select + move

1. Select the embed
2. Drag the top bar
3. Element moves without resizing

### Embed: resize from the canvas

1. Select the embed
2. Drag one of the eight resize handles
3. Bounds update immediately
4. The frame clamps at the minimum size if dragged too small

### Embed: resize from the inspector

1. Select a single embed
2. Edit `W` and/or `H` in the inspector
3. Commit with `Enter` or blur
4. Bounds update immediately

## Constraints

- Embed resizing currently applies only to embed overlays, not all canvas shapes
- Inspector layout editing is intentionally limited to simple frame-like shapes
- No aspect-ratio lock is currently applied to embeds
- No multi-select layout edit workflow is implemented yet
- No transform handles are rendered for non-embed shapes yet

## Verification

### Automated Tests

- `src/components/Canvas.embed-resize.test.tsx`
- `src/components/PropertiesPanel.test.tsx`
- `src/components/themeStyles.test.ts`
- `e2e/embed-layout.spec.ts`

Coverage includes:

- presence of all eight embed resize handles
- corner resize updates
- edge resize updates
- minimum-size clamping
- inspector width/height commits
- inspector read-only behavior when layout editing is unavailable
- shell/container-query style guards
- browser-level resize-handle persistence checks
- browser-level inspector width/height persistence checks

### Commands

```bash
npx vitest run
npm run test:e2e
npm run lint
npm run build
```

## Related

- `specs/right-panel-refactor-SPEC.md`
- `src/components/README.md`
- `src/components/Canvas.tsx`
- `src/components/PropertiesPanel.tsx`
