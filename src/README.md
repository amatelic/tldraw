# Source Directory

This directory contains all the source code for the TLDraw Clone application.

## Directory Structure

```
src/
├── agents/         # Agent orchestration, providers, and transport adapters
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

1. **Canvas Component Size**: 923 lines - too large, needs refactoring
2. **ESLint Warnings**: Some hooks have disabled exhaustive-deps rules
3. **Audio Cleanup**: Audio elements cached in ref but not cleaned up on unmount
4. **History Loss**: Switching workspaces clears undo/redo history
5. **Text Editing**: Complex coordinate transformation between canvas and textarea overlay

## Dependencies Between Modules

```
App.tsx
├── useCanvas (shapes, camera, history, text editing)
├── AgentPanel / agentOrchestrator / providers (review, cleanup, rewrite, and diagram workflows)
├── useKeyboard (shortcuts)
├── workspaceStore (persistence)
├── workspaceExport utils (versioned JSON serialization + download)
├── selectedInspectorItems (multi-select inspector metadata)
├── Toolbar (tool selection)
├── Canvas (rendering, interactions)
├── PropertiesPanel (conditional, animated, multi-select metadata)
├── ZoomControls
├── WorkspaceTabs (workspace management)
└── Dialogs (Image, Audio, Embed)

useCanvas
├── CanvasEngine (rendering)
├── workspaceStore (load/save)
└── types (Shape, EditorState)

agents
├── agentOrchestrator (context packaging + validation)
├── openCodeClient (transport normalization + fallback warnings)
├── openCodeHttpTransport (OpenCode session/message HTTP bridge)
└── providers (workflow-specific behavior)

Canvas
├── CanvasEngine (rendering)
└── types (Shape, Point)

workspaceStore
├── types (Shape, WorkspaceState)
└── zustand (persistence)
```

## Adding New Features

When adding new features:

1. **New Shape Type**: Update `types/index.ts`, `CanvasEngine.ts`, `Canvas.tsx`
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
- [Agents](./agents/README.md) - Agent orchestration and transport
- [Hooks](./hooks/README.md) - Custom React hooks
- [Stores](./stores/README.md) - State management
- [Canvas](./canvas/README.md) - Rendering engine
- [Types](./types/README.md) - Type definitions
- [Utils](./utils/README.md) - Utility functions
- [Test](./test/README.md) - Testing configuration
- [Assets](./assets/README.md) - Static assets
