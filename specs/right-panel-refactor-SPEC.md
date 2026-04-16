# Right-Side Inspector UI Spec

## Status

- Status: ✅ Implemented
- Last updated: 2026-04-13
- Primary implementation:
  - `src/components/PropertiesPanel.tsx`
  - `src/components/PropertiesPanel.css`
  - `src/components/ColorPicker.tsx`
  - `src/components/ColorPicker.css`
  - `src/App.css`

## Goal

Redesign the right-side selection inspector so it feels closer to the April 13 reference: softer surfaces, tighter hierarchy, pill-like controls, and a refined floating color popover. The redesign should preserve existing editing behavior while making the right panel feel more like a modern design-tool inspector than a generic settings sidebar.

The same visual system also extends into the top application chrome so the header and workspace rail no longer feel like a separate, flatter product surface.

## Reference Direction

The target visual language is driven by two cues from the reference images:

1. The inspector shell should feel light, tactile, and compressed rather than boxy.
2. The color picker should feel like a focused design-tool popover with a centered title, segmented tabs, a large color field, and grouped numeric inputs.

## Implemented Scope

### Companion Header Chrome

- `src/App.css` now applies the inspector-inspired token family to the application header
- The top title row, workspace rail, add button, and action buttons now share:
  - soft gradient backing
  - rounded pill controls
  - subtle inset highlights
  - accent-gradient active state for the current workspace
- Existing header behavior is unchanged; this is a visual parity pass only

### Full-Viewport Canvas Shell

- The canvas now occupies the full browser viewport instead of losing space to a fixed app column layout
- Supporting chrome is treated as floating overlays:
  - header fixed near the top edge
  - inspector fixed on the right when a selection exists
  - toolbar fixed at the bottom center
  - zoom controls fixed near the lower-left corner
- On narrow screens the inspector shifts into a shorter bottom-sheet treatment to preserve canvas visibility

### Inspector Shell

- Floating right-side panel with rounded outer shell
- Soft gradient background instead of a flat white card
- Compact header with:
  - `Selection` kicker
  - `Inspector` title
  - live selection count badge
- Scrollable interior that preserves the existing slide-in behavior from `App.tsx`

### Section Structure

The inspector is organized into collapsible sections:

1. `Layout`
2. `Style`
3. `Type` when text is selected
4. `Color`
5. `Effects`

Each section header includes:
- uppercase section title
- compact metadata summary
- chevron expand/collapse affordance

### Layout Section

- X/Y/W/H readouts reflect the selected shape bounds or the combined selection frame while remaining non-editable
- Multi-select actions are surfaced as a more intentional arrangement cluster:
  - align left / center / right
  - align top / middle / bottom
  - distribute horizontally / vertically
  - tidy selection

### Style Section

- Stroke weight rendered as a row of pill buttons
- Stroke pattern rendered as a segmented control
- Fill mode rendered as a segmented control
- Blend mode and opacity grouped into a split row
- Text selections also show a lightweight “No Text Style” preview chip to echo the reference

### Type Section

Shown only when `hasTextSelection` is true.

Controls:
- typeface select
- size select
- weight segmented control
- emphasis segmented control
- align segmented control

### Color Section

Stroke and fill are presented as independent cards:

- label + current value
- optional `None` chip for fill
- preview button to open the custom picker
- quick swatch grid
- custom swatch launcher

The current state is summarized in the section header as `#RRGGBB`.

### Effects Section

- Empty-state copy when no shadows are present
- Shadow cards with:
  - title + opacity summary
  - color button
  - delete button
  - X/Y/Blur inputs
  - opacity slider
- `Add Shadow` call-to-action

## Color Picker Spec

### Overall Layout

The redesigned picker is an embedded floating popover used for stroke, fill, and shadow color editing.

Structure:

1. top bar
2. tab strip
3. saturation/lightness field
4. hue slider
5. alpha slider when enabled
6. format/meta toolbar
7. grouped HSLA inputs
8. grouped Hex/Alpha inputs

### Top Bar

- left utility slot for eyedropper when supported
- centered title: `Color`
- right close button

### Tabs

- `Custom` is the active visual tab
- `Variables` is visible but disabled
- Tab strip is styled as a rounded segmented container to match the reference

### Color Controls

- Large rectangular field for saturation/lightness selection
- Rounded hue slider with circular handle
- Rounded alpha slider with checkerboard background and circular handle
- Toolbar row showing:
  - `HSLA`
  - current swatch preview
  - alpha readout when alpha is enabled

### Inputs

- HSLA inputs use grouped pill fields
- Hex input is emphasized as the wider bottom field
- All inputs keep the existing parsing and update behavior

## Visual Tokens

The inspector uses local component tokens instead of relying only on app-wide neutrals.

Primary tokens:
- `--panel-bg`
- `--panel-surface`
- `--panel-surface-strong`
- `--panel-border`
- `--text-primary`
- `--text-secondary`
- `--accent-color`

The color picker uses its own token set:
- `--picker-bg`
- `--picker-surface`
- `--picker-stroke`
- `--picker-text`
- `--picker-muted`
- `--picker-accent`

Both components provide dark-mode overrides using `prefers-color-scheme`.

## Responsive Behavior

- Desktop:
  - panel wrapper width is clamped in `src/App.css`
  - inspector keeps the floating shell appearance
- Narrow screens:
  - wrapper padding is removed
  - split rows collapse to one column
  - alignment matrix simplifies into stacked rows
  - inspector corners flatten toward a bottom sheet treatment

## Behavior Constraints

- Existing style update callbacks remain unchanged at the public API level
- The redesign is visual/structural and does not add export controls
- Fill style still supports `none`, `solid`, and `pattern`
- Layout values are still read-only in the current implementation
- Variables in the color picker are present visually only and are not wired to token data

## Accessibility Expectations

- Collapsible sections expose `aria-expanded`
- Color picker tabs use `role="tablist"` and `role="tab"`
- Inputs retain labels
- Buttons keep readable titles for tests and screen-reader naming

## Verification

### Automated Tests

Files:
- `src/components/ColorPicker.test.tsx`
- `src/components/PropertiesPanel.test.tsx`
- `e2e/properties-panel.logic.spec.ts`
- `e2e/header-ui.spec.ts`

Coverage includes:
- inspector shell and section presence
- new color cards and swatch grid presence
- opening the redesigned color popover
- text-only inspector controls
- multi-select arrange actions
- color picker title, tabs, close control, and inputs
- computed-style checks for the header shell, action pills, workspace rail, and active workspace tab
- viewport/layout checks that the canvas still fills the window while header and inspector remain fixed overlays

### Commands

```bash
npx vitest run
npx vitest run src/components/ColorPicker.test.tsx src/components/PropertiesPanel.test.tsx
npm run test:e2e
npm run build
```

## Documentation Dependencies

The following docs must stay in sync with the implementation:

- `PROGRESS.md`
- `specs/SPECS.md`
- `src/components/README.md`

## Follow-up Work

Not part of this completed redesign, but still reasonable future enhancements:

- editable layout position and size values
- live variable-backed color tokens
- export section matching the original aspirational panel draft
- visual regression testing for the inspector shell
