# App Directory

This directory contains app-shell composition helpers that sit above feature/domain modules.

## Overview

The app layer now owns root-shell composition and app-specific wiring concerns that should not live in `src/App.tsx` or in lower-level document/editor modules.

Current responsibilities:
- bootstrapping an initial workspace
- preparing shell-level derived props and callbacks from focused action groups
- composing the fixed left sidebar, edge-aligned header, canvas stage area, right rail, dialogs, and dev-only design-token panel

## Files

| File | Purpose |
|------|---------|
| `AppShell.tsx` | Pure shell composition for the left sidebar, header, canvas area, right rail, dialogs, export popover, and dev color tool |
| `useAppShellActionGroups.ts` | Focused shell action groups for export actions, media insertion, workspace tabs, selection/layout actions, and agent panel props |
| `useAppShellActionGroups.test.tsx` | Focused coverage for action-group helpers and hooks |
| `useAppWorkspace.ts` | Bootstraps a first workspace and returns the active workspace |
| `useAppShellState.ts` | Thin shell-state composition around `useCanvas`, inspector models, dialogs, and action groups |

## Current Shell Layout

- Desktop reserves a 260px left sidebar for project navigation and shape layers.
- The header and canvas stage are offset from the left sidebar, while the inspector and agent panel animate in from the right rail.
- The left sidebar receives current shapes, normalized selected ids, and a selection callback from `useAppShellState`.
- Export menu actions, media insertion callbacks, workspace tab callbacks, selection/layout callbacks, and agent panel props are prepared by `useAppShellActionGroups.ts`.
- One-shot canvas creation tools return to Select through shell-level callbacks after a shape is created or a text edit is committed/canceled.
- Vite dev mode adds a design-token button in the header and mounts `DevColorTool`; production builds omit that tool.

## Ownership Rules

- `AppShell.tsx` should stay mostly declarative and JSX-focused.
- `useAppShellState.ts` should compose app-level state and prop groups, while focused action hooks prepare export, media, workspace, selection, and agent callbacks.
- Media insertion should create document shapes through `src/document/shapeFactories.ts` instead of inline object literals in app-shell code.
- `useAppWorkspace.ts` should stay focused on app bootstrapping rather than broader persistence orchestration.

## Success Criteria

- [x] `src/App.tsx` stays readable as a root wiring layer
- [x] Shell-specific callback preparation no longer lives inline next to large JSX blocks
- [x] The visual shell remains unchanged after extraction
- [x] The header can export the current viewport, all shapes, or the current selection without pushing render/export logic down into `src/App.tsx`
- [x] JSON export serializes the live canvas shapes and durable editor state instead of waiting for the debounced workspace snapshot
- [x] The desktop shell keeps the canvas and header aligned after reserving the 260px left sidebar
- [x] The app shell can pass layer-tree selection data to the left sidebar
- [x] The app shell returns drawing and text creation flows to the Select tool after creation completes
- [x] Dev-only color-token overrides are applied at the document root without involving production shell state
- [x] Export, media insertion, workspace tab, selection/layout, and agent panel wiring are split out of `useAppShellState`
- [x] Media insertion uses reusable document shape factories with focused tests

## Known Issues

- The app shell is thinner now, but `AppShell` still composes the current header and right rail around existing monolithic surfaces like `Canvas.tsx`, `PropertiesPanel.tsx`, and `AgentPanel.tsx`.
- Workspace initialization still depends on the first client render; the shell uses the same boot flow as before rather than introducing a pre-render loading state.
- `useAppShellState.ts` still owns dialog open/close state and tool routing. Later cleanup tasks can keep moving modal state into narrower hooks if that surface grows again.
- `LeftSidebar` currently uses static document/page defaults; only the Layers section is wired to live canvas data.
- `CanvasRulers.tsx` exists, but the shell does not mount it yet.
