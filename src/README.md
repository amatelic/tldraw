# Source Directory

This directory contains all the source code for the TLDraw Clone application.

## Directory Structure

```
src/
├── app/            # App-shell composition and root wiring helpers
├── agents/         # Agent orchestration, providers, and transport adapters
├── features/       # Feature-scoped view models and composition helpers
├── document/       # Pure document mutation commands and durable board logic
├── components/     # React UI components
├── hooks/          # Custom React hooks
├── stores/         # Zustand state stores
├── canvas/         # Canvas rendering engine
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── test/           # Test configuration
├── assets/         # Static assets (images, fonts)
├── App.tsx         # Root application component
├── App.css         # Application styles
├── main.tsx        # Application entry point
└── index.css       # Global styles
```

## Architecture Overview

This is a React-based drawing application using:

- **React 19** with TypeScript for UI components
- **Zustand** for state management with localStorage persistence
- **Custom Canvas API** for rendering shapes
- **Framer Motion** for animations
- **Vitest** for testing

## Planned Cleanup Boundaries

The architecture cleanup backlog now lives in [specs/tasks/README.md](../specs/tasks/README.md). Until those refactors land, new code should follow these ownership rules:

- **Document domain**: durable board structure and pure board logic such as shapes, groups, geometry, selection traversal, export contracts, and document commands.
- Runtime group membership is canonical through child `parentId` links; export-only child-id lists should be derived at the boundary instead of stored on live group shapes.
- **Editor domain**: runtime interaction state such as active tool, camera, selection state, style defaults, text editing focus, and undo/redo bookkeeping.
- **Canvas engine**: rendering and coordinate math only. It should not own workspace persistence or selection-policy decisions.
- **Feature UI**: React-facing composition for canvas interactions, inspector models, workspace chrome, dialogs, and shell wiring.
- **Agents**: proposal generation, validation, transport, and proposal-to-command adaptation. Agents should not directly own canvas-local mutation state.
- **Stores**: durable workspace snapshot persistence only. Runtime-only flags and session history now stay outside persisted storage.

### Current Hotspots And Planned Future Homes

| Current file | Current load | Planned future home(s) |
|--------------|--------------|------------------------|
| `src/app/AppShell.tsx` and `src/app/useAppShellState.ts` | shell composition, dialog orchestration, export wiring, inspector/agent panel preparation, and workspace-tab callbacks | keep trimming app-shell-only logic into focused feature containers as future follow-up tasks are scheduled |
| `src/document/commands.ts` and `src/document/textStyle.ts` | pure board mutation rules plus canonical text typography normalization and compatibility helpers | keep growing `src/document/` as the durable board-logic home |
| `src/components/Canvas.tsx` | stage composition, pointer flows, overlays, text editing, embeds, context menu, and the single live engine owner | `src/features/canvas/` |
| `src/hooks/useCanvas.ts` | history, camera state, store sync, command orchestration, grouping, and thin agent-apply callbacks | `src/document/`, `src/editor/`, `src/features/workspace/`, and agent adapters |
| `src/types/index.ts`, `src/types/geometry.ts`, `src/types/hitTesting.ts`, `src/types/selection.ts` | compatibility barrel plus extracted geometry, hit-testing, and selection helpers | continue migrating runtime imports toward the dedicated helper modules instead of adding new behavior to `src/types/index.ts` |
| `src/stores/workspaceStore.ts` | durable workspace snapshots plus persistence normalization for legacy runtime-heavy data | `src/stores/` narrowed to durable workspace data |

## Complexity Guardrails

Run `npm run complexity` before completing structural cleanup work or when a source file starts absorbing unrelated responsibilities. The report is advisory by default and flags:

- source files over 500 significant lines
- hook files over 240 significant lines
- React components over 220 significant body lines
- custom hooks over 180 significant body lines or more than 10 hook calls
- `eslint-disable` directives

Run `npm run ast-grep` for syntax-aware structural checks that are better expressed as AST rules. The first rule flags durable canvas `Shape` object literals created directly inside hook files; those should move to tested factories under `src/document`, `src/canvas`, or a focused feature module. Add rule fixtures under `ast-grep/tests` and run `npm run ast-grep:test` whenever a structural rule changes.

Hook rule: keep custom hooks as small orchestration layers. A hook should expose one coherent behavior, keep pure document or geometry work in `src/document/`, `src/canvas/`, `src/types/`, or `src/utils/`, and move broad callback groups into focused hooks or factories before adding more state/effects. Current exceptions such as `useCanvas` are tracked as cleanup hotspots; new work should avoid increasing those files unless the task is explicitly a split/refactor.

Use `npm run complexity:strict` only when intentionally testing whether the current warning list is empty. The normal report should guide refactors without blocking day-to-day commits.

## Data Flow

```
User Input → Canvas Component → useCanvas Hook → workspaceStore
     ↓              ↓                ↓                ↓
  Keyboard    Pointer Events   History/Undo   localStorage
 Shortcuts     Drag/Draw      Camera/Zoom    Persistence
```

## Key Concepts

### Coordinate Systems

- **Screen Coordinates**: Pixels relative to the canvas element (0,0 at top-left)
- **World Coordinates**: Drawing coordinates in the infinite canvas space
- **Camera**: Transform between screen and world (pan + zoom)

### Shape Lifecycle

1. **Creation**: User drags on canvas → `createShapeFromPoints()` creates shape object
2. **Rendering**: `CanvasEngine.drawShape()` renders to canvas
3. **Selection**: Click detection via `isPointInShape()` hit testing
4. **Transformation**: Drag updates via `onShapeUpdate()`
5. **Persistence**: Auto-saved to workspace store every 100ms
6. **Export**: Active workspace can be serialized into a versioned JSON document for backup or downstream processing

### History System

- Separate `past`, `present`, `future` arrays
- Significant changes saved to history (creation, deletion, style changes)
- Dragging and camera movement NOT saved to history
- Maximum 50 history states to prevent memory bloat
- History is **lost when switching workspaces**

## Success Criteria

- [ ] All directories have comprehensive README documentation
- [ ] Components render without errors in isolation
- [ ] Hooks provide correct state and callbacks
- [ ] Canvas renders shapes smoothly at 60fps
- [ ] Workspaces persist across page reloads
- [ ] Undo/redo works for all significant operations
- [ ] Right-side overlays let the user switch cleanly between inspector and agent flows without shrinking the canvas
- [ ] Keyboard shortcuts work globally (except when editing text)
- [ ] All tests pass (minimum 80% coverage)

## Constraints

1. **Browser APIs Required**:
   - Canvas 2D Context
   - localStorage (for persistence)
   - AudioContext (for audio waveforms)
   - Pointer Events (for drawing)

2. **Performance Limits**:
   - Maximum 50 history states
   - Maximum 10 workspaces
   - Image caching by URL (not by content)

3. **Design Decisions**:
   - Canvas-based rendering (not SVG) for performance
   - Zustand over Redux for simplicity
   - No external icon library (inline SVGs)
   - Cleanup and rewrite agent workflows stay deterministic/local, while diagram generation can call a local OpenCode server
   - Versioned JSON export is kept separate from the raw persisted workspace store

## Known Issues

1. **Canvas Stage Complexity**: `src/components/Canvas.tsx` now composes extracted overlay surfaces, but it still carries the stage-level pointer/session coordinator and remains one of the larger files in the app.
2. **Canvas Session Size**: `src/hooks/useCanvas.ts` is about 673 lines and still combines document commands, history, camera, persistence, grouping, and the history-wrapped agent apply callbacks.
3. **Compatibility Barrel**: `src/types/index.ts` is now the migration surface for backwards-compatible imports. New geometry, hit-testing, or selection behavior should go into the dedicated helper modules instead of back into the barrel.
4. **ESLint Warnings**: Some hooks have disabled exhaustive-deps rules.
5. **Audio Cleanup**: Audio elements cached in ref but not cleaned up on unmount.
6. **History Loss**: Switching workspaces clears undo/redo history.
7. **Text Editing**: Complex coordinate transformation between canvas and textarea overlay.
8. **Viewport Placement**: Parent surfaces can reuse shared camera math from `src/canvas/CanvasEngine.ts` without constructing another engine.
9. **Text Style Compatibility**: Legacy text shapes may still carry duplicated typography in `style`, but `src/document/textStyle.ts` is now the canonical read/write path while the rest of the cleanup continues.
10. **Workspace History Boundary**: Persisted workspace data is now durable-only and save batching is atomic, but `useCanvas` still couples history, runtime editor state, and persistence coordination in one large hook even after the app-shell extraction.
11. **Workspace History Scope**: Save batching is now atomic, but undo/redo history is still cleared when switching workspaces instead of being preserved per workspace.

## Dependencies Between Modules

```
App.tsx
├── app/AppShell (shell composition)
├── app/useAppWorkspace (workspace bootstrapping)
├── app/useAppShellState (shell-level derivation and callbacks)
├── useCanvas (shapes, camera, history, text editing)
├── useKeyboard (shortcuts)
├── workspaceStore (persistence)
└── agentOrchestrator / providers (review, cleanup, rewrite, and diagram workflows)

src/app
├── AppShell (header, stage, rail, and dialog composition)
├── useAppWorkspace (first-workspace boot flow)
├── useAppShellState (export wiring, dialog toggles, inspector model consumption, and panel callbacks)
├── workspaceExport utils (versioned JSON serialization + download)
├── features/inspector/model (selection-driven inspector data + metadata)
├── Toolbar / Canvas / PropertiesPanel / AgentPanel / ZoomControls / WorkspaceTabs
└── types + canvas helpers used to prepare shell props

useCanvas
├── document/commands (pure board mutations)
├── workspaceStore (durable load/save + runtime-state stripping)
└── types (Shape, PersistedEditorState, EditorState)

agents
├── agentOrchestrator (context packaging + validation)
├── openCodeClient (transport normalization + fallback warnings)
├── openCodeHttpTransport (OpenCode session/message HTTP bridge)
└── providers (workflow-specific behavior)

Canvas
├── CanvasEngine (single render/transform owner)
├── useElementSize (resize-driven refresh)
└── types (Shape, Point)

workspaceStore
├── types (Shape, PersistedEditorState)
└── zustand (persistence)
```

## Adding New Features

When adding new features:

1. **New Shape Type**: Update `types/document.ts`, `CanvasEngine.ts`, `Canvas.tsx`, and any affected helper modules
2. **New Tool**: Update `ToolType`, `Toolbar.tsx`, `useKeyboard.ts`, `Canvas.tsx`
3. **New Component**: Create in `components/`, add tests, update this README
4. **New Store Action**: Add to `workspaceStore.ts`, test integration
5. **New Utility**: Create in `utils/`, add tests, export from index

## Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

## Build

```bash
npm run build
```

Build output goes to `dist/` directory.

## Development

```bash
npm run dev
```

Development server runs on port 5175 (configured in `vite.config.ts`).
In development, `/api/opencode` is proxied to `http://127.0.0.1:4096` so the agent can talk to `opencode serve` without extra browser CORS setup.

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+
- Mobile Safari (iOS 14+)
- Chrome Android

## Related Documentation

- [Components](./components/README.md) - UI components
- [Document](./document/README.md) - Pure document mutation commands
- [Agents](./agents/README.md) - Agent orchestration and transport
- [Hooks](./hooks/README.md) - Custom React hooks
- [Stores](./stores/README.md) - State management
- [Canvas](./canvas/README.md) - Rendering engine
- [Types](./types/README.md) - Type definitions
- [Utils](./utils/README.md) - Utility functions
- [Test](./test/README.md) - Testing configuration
- [Assets](./assets/README.md) - Static assets
