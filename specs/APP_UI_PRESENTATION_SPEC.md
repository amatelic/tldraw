# App UI Presentation Spec

## Status

- Status: ✅ Implemented / Reference
- Last updated: 2026-04-17
- Primary implementation references:
  - `src/App.tsx`
  - `src/components/PropertiesPanel.tsx`
  - `src/components/AgentPanel.tsx`
  - `src/components/Toolbar.tsx`
  - `src/components/ZoomControls.tsx`
  - `src/components/WorkspaceTabs.tsx`

## Goal

Provide one current-source markdown snapshot of the application's visual shell and the main panel surfaces that exist today, so feature work can reference the real UI without spreading that inventory across older feature specs.

This is a desktop-first reference. It documents the current shell, `Inspector`, and `AgentPanel`. Dialogs and small popovers are intentionally out of scope for the main inventory.

## Desktop Shell

```text
+--------------------------------------------------------------------------------------------------+
|                                      Floating Header                                             |
|  +--------------------------------------+  +--------------------------------------------------+  |
|  | Workspace rail / tabs                |  | Export JSON | Agents | Undo | Redo | Delete     |  |
|  +--------------------------------------+  +--------------------------------------------------+  |
|                                                                                                  |
|  Canvas / board area                                                                              |
|                                                                                   +-------------+|
|                                                                                   | Inspector   ||
|                                                                                   | Selection   ||
|                                                                                   | badge       ||
|                                                                                   | Selected    ||
|                                                                                   | Items*      ||
|                                                                                   | Layout      ||
|                                                                                   | Style       ||
|                                                                                   | Type**      ||
|                                                                                   | Color       ||
|                                                                                   | Effects     ||
|                                                                                   +-------------+|
|                                                                                                  |
|  +----------------+                                                                              |
|  | Zoom controls  |                                                                              |
|  +----------------+                                                                              |
|                                                                                                  |
|                                +--------------------------------------+                          |
|                                | Floating bottom toolbar              |                          |
|                                | Select Pan Pencil Eraser Arrow ...   |                          |
|                                +--------------------------------------+                          |
+--------------------------------------------------------------------------------------------------+

* `Selected Items` appears only for multi-select
** `Type` appears only when text is part of the current selection
```

## Agent Overlay State

```text
+--------------------------------------------------------------------------------------------------+
| App shell remains visible behind a dimmed backdrop                                               |
|                                                                                                  |
|                                   +----------------------------------------+                     |
|                                   | Agent                                  |                     |
|                                   | Workflow selector                      |                     |
|                                   | Context selector                       |                     |
|                                   | Context summary                        |                     |
|                                   | Diagram presets*                       |                     |
|                                   | Audience / Presentation Goal*          |                     |
|                                   | Starter examples*                      |                     |
|                                   | Prompt                                 |                     |
|                                   | Status + Run/Generate/Cancel           |                     |
|                                   | Review preview OR generation preview   |                     |
|                                   | Apply to board**                       |                     |
|                                   +----------------------------------------+                     |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+

* Diagram-generation workflow only
** Generation preview only
```

## Sidepanel Inventory

### Inspector

**Surface role**
- Persistent right-side selection inspector
- Visible only when at least one top-level entity is selected
- Read-only layout summary for multi-select, editable layout fields for supported single frame-like selections

**Header**
- `Selection` kicker
- `Inspector` title
- live selection count badge using `layer` / `layers`

**States**
- Hidden: no selection
- Single selection: `Layout`, `Style`, `Color`, `Effects`, plus `Type` when text is selected
- Multi-selection: `Selected Items` plus `Layout`, `Style`, `Color`, `Effects`
- Group selection: `Layout` can expose `Ungroup`
- Text selection: `Type` becomes available with font controls

**Sections and items**
- `Selected Items`
  - shown only for `selectedCount > 1`
  - one row per selected top-level entity
  - type label
  - `L{layerIndex}` badge
  - group hierarchy label
- `Layout`
  - X / Y / W / H
  - align left / center / right
  - align top / middle / bottom
  - distribute horizontally / vertically
  - tidy selection
  - `Group selection`
  - `Ungroup`
- `Style`
  - stroke width picker with `Visual`, `Slider`, `Compact`
  - stroke style segmented control
  - fill style segmented control
  - blend mode select
  - opacity slider
- `Type`
  - typeface
  - size
  - weight
  - emphasis
  - alignment
- `Color`
  - stroke card
  - fill card
  - quick swatches
  - custom color launcher
- `Effects`
  - shadow cards
  - X / Y / Blur inputs
  - color button
  - opacity slider
  - delete shadow
  - add shadow

**Adjacent overlay note**
- The floating `ColorPicker` belongs to the inspector workflow, but it is not a primary side panel and is intentionally excluded from this inventory

### AgentPanel

**Surface role**
- Modal right-side workflow panel for canvas-aware agent actions
- Opens from the `Agents` header action
- Sits above the board with a dismissible backdrop

**States**
- Closed: no overlay surface
- Default workflow form: workflow + context + prompt + status/actions
- Diagram generation form: adds presets, audience, presentation goal, and starter examples
- Review preview: grouped findings and summary
- Generation preview: diagram plan, node/connector preview, presentation brief, warnings, apply action

**Shared controls**
- workflow selector
- context selector
- context summary
- prompt textarea
- status chip
- `Cancel`
- `Run` or `Generate draft`

**Diagram-generation-only controls**
- diagram preset cards
- audience input
- presentation goal input
- starter example cards

**Preview content**
- review findings grouped by category and severity
- diagram stats
- diagram plan sections
- planned nodes
- planned connectors
- presentation brief
  - title
  - audience
  - objective
  - summary
  - narrative order
  - speaker notes
  - assumptions
  - open questions
- warnings
- `Apply to board`

## Notes

- This spec is inventory-first, not a redesign brief
- The older right-panel and toolbar specs remain useful as implementation history, but this file is the live visual map of the current shell
- Responsive adaptations exist, but this reference intentionally anchors on the desktop composition
