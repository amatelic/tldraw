# Progress Tracker

## Overview

This document tracks the implementation progress of the TLDraw Clone application.

## ✅ Implemented Features

### Core Drawing Features
- [x] Rectangle tool - Draw rectangles with customizable styles
- [x] Circle tool - Draw circles/ellipses
- [x] Line tool - Draw straight lines
- [x] Freehand tool - Draw free-form paths
- [x] Eraser tool - Remove shapes by clicking on them
- [x] Text tool - Add text annotations
- [x] Image tool - Upload and place images (max 300px width with aspect ratio maintained)
- [x] Audio tool - Upload audio files with waveform visualization
- [x] Pan tool - Navigate the canvas

### Selection & Manipulation
- [x] Select tool - Click to select single shape, Shift+click for multi-select
- [x] Drag shapes - Move selected shapes around the canvas
- [x] Multi-selection - Select multiple shapes at once
- [x] Delete shapes - Remove selected shapes

### Styling & Properties
- [x] Shared CSS design-token system - Centralized surface, border, text, accent, radius, shadow, and spacing variables
- [x] Stroke color picker - Choose shape outline colors
- [x] Fill color picker - Choose shape fill colors
- [x] Stroke width - Adjustable line thickness (1, 2, 4, 8, 12px)
- [x] Stroke style - Solid, dashed, or dotted lines
- [x] Fill style - None, solid, or pattern fills
- [x] Opacity control - Adjust shape transparency
- [x] Text styling - Font size, family, weight, style, alignment
- [x] Context-aware inspector - Show relevant sections based on selection type
- [x] Right-side inspector redesign - Floating soft-surface panel with collapsible sections, metadata headers, inline color cards, and embedded popover color picker
- [x] Live layout readouts - Inspector now shows X/Y/W/H from the selected shape or selection frame
- [x] Multi-select inspector metadata - Inspector now lists selected item type, layer index, and group hierarchy for multi-selection
- [x] Multi-select arrange controls - Align, distribute, and tidy actions in the layout section
- [x] Shadow editor - Add, remove, recolor, and tune multiple shadows from the effects section

### View & Navigation
- [x] Zoom in/out - Scale canvas up to 5x, down to 0.1x
- [x] Reset zoom - Return to default view (1x zoom at origin)
- [x] Pan/Scroll - Navigate infinite canvas
- [x] Grid display - Visual grid background
- [x] Camera state - Track zoom and pan position

### History & Undo/Redo
- [x] Undo - Reverse last action (Ctrl+Z)
- [x] Redo - Re-apply undone action (Ctrl+Y)
- [x] History limit - Store up to 50 actions
- [x] Non-draggable updates - Only significant changes saved to history

### Workspace Management
- [x] Multiple workspaces - Up to 10 concurrent workspaces
- [x] Workspace tabs - Switch between workspaces
- [x] Add workspace - Create new workspace with auto-generated name
- [x] Delete workspace - Remove workspaces (minimum 1 required)
- [x] Rename workspace - Custom workspace names
- [x] Persistence - All workspaces saved to localStorage
- [x] Versioned workspace export - Active workspace downloads as stable JSON with hierarchy-preserving group structure

### Keyboard Shortcuts
- [x] Tool shortcuts - V (select), H (pan), R (rectangle), C (circle), etc.
- [x] Undo/Redo - Ctrl+Z, Ctrl+Y
- [x] Delete - Delete key removes selected shapes
- [x] Escape - Clear selection

### UI/UX
- [x] Toolbar - Tool selection with icons and keyboard shortcuts
- [x] Properties panel - Real-time style editing
- [x] Left project sidebar - Document/page placeholders plus a layer tree derived from current canvas shapes
- [x] Redesigned side panel UI - Inspector-style shell aligned to the April 13 reference
- [x] Header chrome redesign - Top bar and workspace rail now share the same soft-surface/pill styling language as the inspector
- [x] Full-viewport canvas layout - Drawing surface now spans the full window while header, inspector, toolbar, and zoom controls float above it
- [x] Workspace rail motion polish - Entry/exit transitions and pill spacing refined for tabs and add button
- [x] Shared active-tab motion - Active workspace now transitions through a moving highlight pill
- [x] Zoom controls - Visual zoom level indicator
- [x] Workspace tabs - Tab bar with add/delete/rename
- [x] Dialogs - Image and audio upload dialogs
- [x] Dark mode support - Automatic light/dark theme switching
- [x] Responsive design - Adapts to screen sizes
- [x] Dev-mode design token panel - Runtime color override tool for shared CSS variables with reset/export support

### Agent Foundations
- [x] Agent domain model and orchestrator foundation
- [x] Agent review workflow panel shell
- [x] Structured diagram-generation contracts for create actions and presentation briefs
- [x] OpenCode transport adapter with deterministic mock fallback for diagram-generation requests
- [x] Diagram generator workflow UI with presets, starter examples, and presentation-oriented prompt scaffolding
- [x] OpenCode-backed diagram provider wired into the app orchestrator with warning surfacing for low-confidence or incomplete drafts
- [x] Diagram preview UI for sections, planned nodes/connectors, warnings, and presentation brief content
- [x] Sidebar-first agent workflow UI with compact compose state and expanded diagram preview sheet
- [x] Real OpenCode HTTP transport via session/message APIs with explicit mock-fallback warnings
- [x] Example-driven regression coverage and docs for the messaging-backend and storytelling-storyboard diagram starters
- [x] Cleanup suggestions workflow with inline preview, selected-only apply, deletion confirmation, and grouped undo support

## 🚧 Partially Implemented / Known Issues

### Performance
- [ ] Canvas optimization for 1000+ shapes
- [ ] Virtual rendering for off-screen shapes

### UI Shell
- [ ] Canvas ruler component exists but is not yet mounted in `AppShell`

### Audio Feature
- [ ] Audio playback controls in UI
- [ ] Loop toggle for audio shapes
- [ ] Visual playback state indicator
- [ ] Pause/stop functionality

### Text Feature
- [ ] Text tool still auto-switches back to select after placing a text shape
- [ ] Text selection and cursor positioning
- [ ] Rich text formatting (bold/italic per character)

### Image Feature
- [ ] Image resizing after placement
- [ ] Image cropping
- [ ] Image rotation

### Advanced Drawing
- [ ] Arrow heads on lines
- [ ] Bezier curves
- [] Connector lines between shapes
- [ ] Shape rotation
- [ ] Shape scaling handles

## ❌ Not Yet Implemented

### Export/Import
- [ ] Export to PNG/SVG
- [x] Export to JSON
- [ ] Import from JSON
- [ ] Copy/paste shapes between workspaces

### Collaboration
- [ ] Real-time collaboration
- [ ] Share workspaces via link
- [ ] Comments/annotations

### Advanced Features
- [ ] Layers/z-index management
- [ ] Shape locking
- [ ] Snap to grid
- [ ] Shape templates/library

### Testing
- [x] Component tests for key editor UI pieces including PropertiesPanel and ColorPicker
- [x] Canvas text-editing regression tests
- [x] Agent workflow provider tests
- [x] E2E regression coverage for the sidepanel legacy-state path
- [x] E2E browser-style regression coverage for the redesigned header shell and workspace rail
- [x] E2E viewport-layout coverage for full-canvas floating chrome behavior
- [x] App shell layout regression coverage for the 260px left-sidebar canvas offset and right-panel top offset
- [ ] Additional unit tests for remaining utilities
- [ ] Additional Canvas engine tests
- [ ] Additional E2E tests

## 🐛 Known Bugs & Issues

### Issue 1: Text Tool Auto-switches Too Quickly
**Problem**: When using the text tool, it auto-switches back to select tool after adding text, but this can happen before the user is done editing.
**Location**: `App.tsx:64-70`
**Bad Code**:
```tsx
useEffect(() => {
  if (editorState.tool === 'text' && shapes.length > prevShapesLengthRef.current) {
    setEditorState((prev) => ({ ...prev, tool: 'select' }));
  }
  prevShapesLengthRef.current = shapes.length;
}, [shapes.length, editorState.tool, setEditorState]);
```
**Impact**: Users cannot add multiple text shapes in sequence without re-selecting the text tool.

### Issue 2: ESLint Disable Comment in Hook
**Status**: Resolved on May 4, 2026 by the Task 8 hook dependency cleanup.
**Problem**: The `useCanvas` hook disables the exhaustive-deps rule which can hide real dependency issues.
**Location**: `src/hooks/useCanvas.ts:74`
**Fix**: `initialData` now depends on the workspace shapes/state values it reads, and same-workspace rerenders are covered so local edits are not overwritten.

### Issue 3: Unused Parameter Warning Suppression
**Status**: Resolved on May 4, 2026 by the Task 7 store API cleanup.
**Problem**: The `canDeleteWorkspace` function takes an `id` parameter but only uses it with `void id` to suppress warnings.
**Location**: `src/stores/workspaceStore.ts:136-140`
**Fix**: `canDeleteWorkspace()` now takes no arguments and checks deletion eligibility from workspace count only.

### Issue 4: Auto-save Race Condition
**Status**: Resolved on April 22, 2026 by the atomic workspace save/history refactor.
**Fix**: `useCanvas` now debounces one coordinated workspace snapshot save, and `workspaceStore` writes shapes plus durable editor state through one `saveWorkspaceSnapshot()` path.
**Remaining Watch Item**: Undo/redo history still clears on workspace switch by design; preserving per-workspace history would be separate future work.

### Issue 5: Missing Error Boundaries
**Status**: Resolved on May 4, 2026 by Task 9.
**Problem**: No React error boundaries are implemented to catch rendering errors.
**Fix**: The root app now renders inside `ErrorBoundary`, with a friendly fallback plus retry and refresh actions.

### Issue 6: No Input Validation on Workspace Names
**Status**: Resolved on May 4, 2026 by Task 10.
**Problem**: Workspace names can be empty strings or excessively long.
**Location**: `src/stores/workspaceStore.ts:117-126`
**Fix**: Workspace renames are trimmed, limited to 1-50 characters, rejected in the store when invalid, and surfaced inline from visible and overflow tab rename fields.

## 📊 Test Coverage Status

- **Unit Tests**: In progress - utility, canvas, and provider coverage exists but is not complete
- **Component Tests**: In progress - interactive coverage exists for Toolbar, PropertiesPanel, ColorPicker, Workspace tabs, dialogs, and text editing
- **Integration Tests**: In progress - text editing and agent provider flows have regression coverage
- **E2E Tests**: In progress - legacy-state inspector regression and header chrome checks now run in Playwright

## 📌 Recent Milestones

### April 13, 2026
- Completed a full right-side inspector redesign to match the latest UI reference more closely
- Extended the same visual language to the application header and workspace tab rail

### April 14, 2026
- Switched the application shell to a full-viewport canvas with floating header, inspector, toolbar, and zoom controls

### April 17, 2026
- Added a selected-items metadata section to the multi-select inspector with type, layer index, and group hierarchy labels
- Added a standalone app UI presentation spec covering the current desktop shell plus the Inspector and Agent panel inventories
- Rebuilt the color workflow around a tactile floating popover with centered header, segmented tabs, larger gradient surface, and grouped HSLA/hex controls
- Added UI-focused regression coverage for the new inspector shell and color picker presentation
- Added a Playwright E2E regression test that seeds legacy persisted workspace state and verifies the inspector no longer crashes when `shapeStyle.shadows` is missing
- Verified the redesign with `npx vitest run` and `npm run build`

### April 21, 2026
- Added `specs/tasks/README.md` as the architecture cleanup backlog index so structural refactors now have one sequenced entry point
- Documented the target ownership split between document, editor, canvas engine, feature UI, agents, stores, and the transitional `src/types/index.ts` barrel
- Mapped the current hotspots in `src/App.tsx`, `src/components/Canvas.tsx`, `src/hooks/useCanvas.ts`, `src/types/index.ts`, and `src/stores/workspaceStore.ts` to their intended future homes
- Confirmed the dependency order for cleanup tasks 02 through 13 before moving production code
- Split the core contracts into `src/types/document.ts`, `src/types/editor.ts`, and `src/types/export.ts` while keeping `src/types/index.ts` as the compatibility barrel

### April 22, 2026
- Completed Task 4 by adding a header export menu for viewport PNG plus all/selected PNG and SVG exports, backed by new `CanvasEngine` export helpers and app-level wiring tests
- Completed Task 3 by adding App-level regression coverage that keeps the text tool active after inserting text, so repeated text creation now stays behind manual tool switching instead of a shape-count auto-switch
- Completed Task 08 by introducing a dedicated selection-driven inspector model under `src/features/inspector/model/`
- Moved selected-item inspector metadata helpers out of `src/components/` and into the new feature-model home
- Added app-level regression coverage so the app layer now proves the inspector receives selected-shape values, mixed-style keys, and shared multi-selection metadata from the model
- Finished the remaining Task 08 UI pass by surfacing explicit mixed-state affordances in `PropertiesPanel`, while documenting that the no-selection `defaults` mode remains intentionally model-only because the shell still hides the panel with no selection
- Completed Task 09 by splitting durable `PersistedEditorState` fields from runtime-only editor flags and stripping audio playback state at the workspace persistence boundary
- Added store-level persistence helper coverage and a `useCanvas` runtime-state hydration regression so older localStorage snapshots no longer restore drag, draw, text-edit, or audio playback sessions
- Added a focused barrel test to verify runtime exports and type imports keep working through `src/types/index.ts`
- Extracted bounds math into `src/types/geometry.ts`, hit-testing into `src/types/hitTesting.ts`, and selection/group traversal into `src/types/selection.ts`
- Pointed `App.tsx`, `Canvas.tsx`, and `useCanvas.ts` at the focused helper modules instead of the type barrel
- Added focused unit coverage for geometry, hit-testing, and selection helpers to lock the extracted behavior

### April 22, 2026
- Consolidated canvas-engine ownership into `src/components/Canvas.tsx` so one mounted canvas surface now owns one live `CanvasEngine`
- Removed render-object construction and resize work from `src/hooks/useCanvas.ts`, keeping the hook focused on document/editor state, history, and persistence
- Exported shared `screenToWorldPoint()` and `worldToScreenPoint()` helpers from `src/canvas/CanvasEngine.ts` so parent code can reuse the camera math without creating another engine
- Added focused regression coverage to lock the single-engine boundary while keeping the existing canvas interaction suites green
- Added `src/document/commands.ts` as the new pure board-mutation layer for shape CRUD, grouping, reordering, layout actions, and proposal application
- Moved App-level align/distribute/tidy and layout-bound edits behind high-level `useCanvas` command APIs so those mutations no longer live inline in `App.tsx`
- Added direct command-level coverage plus a hook-level regression to verify layout commands undo in one step
- Started Task 06 with a focused `Canvas.tsx` effect cleanup that now keeps resize work separate from ordinary redraws, removes the panning state-to-ref sync effect, and closes invalid context menus without the extra animation-frame hop
- Added focused canvas regressions to verify unchanged rerenders do not call `engine.resize()` again and that the context menu closes when selection state invalidates it
- Added `src/document/textStyle.ts` so text typography now has one shared normalization and compatibility path across commands, rendering, textarea editing, and export
- Normalized legacy text shapes on `useCanvas` load so persisted workspaces recover canonical text fields from style-only typography data
- Added focused regression coverage for text-style sync in document commands, renderer fallback, textarea overlay fallback, export serialization, and legacy hook hydration
- Completed Task 10 by making child `parentId` the canonical runtime group relationship, deriving group child ids where needed, and keeping exported `childrenIds` as a compatibility field instead of duplicated live state
- Completed Task 11 by replacing the split shape/state autosave effects with one coordinated workspace snapshot save, and by documenting/testing that undo history resets when switching workspaces
- Completed Task 12 by moving proposal validation/application into an agent-side document adapter, leaving `useCanvas` responsible only for history-wrapping the returned next state
- Completed Task 13 by extracting the app shell into `src/app/`, leaving `App.tsx` as a thin root that wires store, canvas, keyboard, and agent orchestration into `AppShell`
- Added direct app-layer regression coverage for dialog gating, rail toggling, and inspector layout-bound clamping in `src/app/useAppShellState.test.tsx`
- Watch item: layout commands still treat a selected group as one bounds box instead of repositioning grouped descendants as a block. The canonical group-model cleanup is done, but grouped layout movement still needs a separate follow-up.
- Watch item: undo/redo history is still scoped to the currently loaded workspace. Switching workspaces intentionally clears it, and preserving history per workspace would need a separate design.
- Watch item: `useCanvas` still exposes the apply callbacks that the app layer wires into `AgentPanel`, even though proposal validation and application now live under `src/agents/`.
- Completed Task 06 by extracting `CanvasSelectionOverlays.tsx`, `CanvasTextEditor.tsx`, `CanvasContextMenu.tsx`, and `CanvasEmbedOverlays.tsx` so `Canvas.tsx` now composes focused overlay surfaces instead of rendering those shells inline
- Added extracted-surface regressions for selection overlays, text editing, context-menu behavior, and embed resize behavior, then verified the full architecture-cleanup sequence through Task 13
- Watch item: `Canvas.tsx` still owns the stage-level pointer/session coordinator and live engine wiring, so it remains one of the larger files even after the overlay split
- Watch item: `useAppShellState.ts` is now the shell-level orchestration hotspot. It is much narrower than the old `App.tsx`, but remaining cleanup work should keep peeling feature-specific wiring out instead of letting that hook become the next monolith.

### May 6, 2026
- Added `src/styles/design-tokens.css` and migrated the app shell, toolbar, panels, dialogs, sidebar, and color controls toward shared token variables
- Added a fixed 260px `LeftSidebar` with collapsible Documents, Pages, and Layers sections; layer rows are derived from current shapes and nested by `parentId`
- Added `DevColorTool`, `devToolStore`, and `useDevColorOverrides` for dev-only runtime CSS variable overrides with reset and CSS export support
- Added `CanvasRulers.tsx` as a camera-aware ruler component, with the remaining work item that it still needs to be mounted in the app shell
- Updated app-shell layout tests around the left-sidebar canvas offset and right-panel top offset
- Fixed grid rendering so the canvas background now tracks camera pan and zoom in the same screen-space transform path as shapes
- Fixed camera-only pan/zoom rerenders so the mounted canvas redraws even when shapes and selection are unchanged

## 🎯 Next Priority Items

1. Add Vitest test framework and basic test setup
2. Write unit tests for type utilities and shape operations
3. Implement text editing in-place
4. Add export functionality (PNG/SVG)
5. Add shape grouping feature
6. Implement proper error boundaries
7. Fix the text tool auto-switch behavior

## 📝 Notes

- Application uses localStorage for persistence - data is lost if user clears browser storage
- No server-side persistence or backup
- Audio files are stored as base64 in localStorage - large audio files may hit storage limits
- Canvas performance degrades with 500+ complex shapes
- Mobile/touch support is minimal - primarily designed for desktop use
