# Hooks Directory

This directory contains custom React hooks for reusable stateful logic.

## Overview

Hooks encapsulate complex logic that can be reused across components:
- **useCanvas**: Canvas state management with history
- **useKeyboard**: Global keyboard shortcuts
- **useElementSize**: Shared element resize tracking for canvas-driven layout updates

## Hook Files

| Hook | File | Purpose | Lines | Complexity |
|------|------|---------|-------|------------|
| useCanvas | `useCanvas.ts` | Canvas state, history, shapes, and agent proposal apply | ~740 | High |
| useKeyboard | `useKeyboard.ts` | Global keyboard shortcuts | 170 | Medium |
| useElementSize | `useElementSize.ts` | Observe DOM element width/height changes | ~60 | Low |

## Detailed Hook Documentation

### useCanvas

**Purpose**: Main canvas state management hook providing drawing operations, camera control, history (undo/redo), normalized selection state, text editing, grouping, and layer ordering.

**⚠️ WARNING**: This is the most complex hook in the application. It manages:
- Shape state and operations
- Selection normalization for grouped content
- Camera (pan/zoom) state
- History for undo/redo
- Workspace persistence
- Text editing state

**Interface**:
```typescript
interface UseCanvasReturn {
  // Refs
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  
  // State (from history)
  shapes: Shape[];
  editorState: EditorState;
  
  // State setters
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
  
  // Shape operations
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  deleteSelectedShapes: () => void;
  
  // Selection
  selectShapes: (ids: string[]) => void;
  clearSelection: () => void;
  
  // Coordinate conversion
  screenToWorld: (point: Point) => Point;
  worldToScreen: (point: Point) => Point;
  
  // Camera
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  zoomAt: (screenPoint: Point, factor: number) => void;
  pan: (deltaX: number, deltaY: number) => void;
  
  // Style
  updateShapeStyle: (updates: Partial<ShapeStyle>) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Text editing
  startTextEdit: (id: string) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;

  // Agent generation
  applyGeneratedDiagram: (proposal: AgentGenerationProposal) => {
    success: boolean;
    error: string | null;
    appliedShapeIds: string[];
  };

  applyMutationProposal: (proposal: AgentMutationProposal) => {
    success: boolean;
    error: string | null;
    appliedShapeIds: string[];
  };

  // Grouping and layering
  groupShapes: (shapeIds: string[]) => void;
  ungroupShapes: (groupId: string) => void;
  getAllShapesInGroup: (groupId: string) => string[];
  bringShapesToFront: (shapeIds: string[]) => void;
  sendShapesToBack: (shapeIds: string[]) => void;
}

function useCanvas(workspaceId: string): UseCanvasReturn
```

**History System**:

The hook implements a classic undo/redo pattern with three states:
- `past`: Array of previous states (newest first)
- `present`: Current state
- `future`: Array of redo states

```typescript
interface HistoryState {
  shapes: Shape[];
  editorState: EditorState;
}

// State structure
const [past, setPast] = useState<HistoryState[]>([]);
const [present, setPresent] = useState<HistoryState>(initialData);
const [future, setFuture] = useState<HistoryState[]>([]);
```

**Operations**:

1. **Add to History** (undoable operations):
   - addShape
   - deleteShape
   - deleteSelectedShapes
   - updateShapeStyle (when applied to selection)
   - applyGeneratedDiagram
   - applyMutationProposal
   - groupShapes / ungroupShapes
   - bringShapesToFront / sendShapesToBack

2. **Don't Add to History** (non-undoable):
   - Dragging (continuous updates)
   - Camera movement (pan/zoom)
   - Selection changes
   - Text editing

3. **Undo**:
   ```
   Move present → future
   Move past[0] → present
   ```

4. **Redo**:
   ```
   Move present → past
   Move future[0] → present
   ```

**Workspace Integration**:

- Loads initial state from workspace store
- Auto-saves changes back to workspace store (100ms debounce)
- Clears history when switching workspaces
- Uses refs to detect workspace changes

**Hardcoded Values**:
```typescript
const MAX_HISTORY_SIZE = 50;  // Prevent memory bloat
const SAVE_DEBOUNCE_MS = 100; // Auto-save delay
```

**Default Editor State**:
```typescript
const defaultEditorState: EditorState = {
  tool: 'select',
  selectedShapeIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  isDragging: false,
  isDrawing: false,
  shapeStyle: { /* default styles */ },
  editingTextId: null,
};
```

**Success Criteria**:
- [ ] Shapes can be added, updated, deleted
- [ ] Undo/redo works for all significant operations
- [ ] Generated diagram drafts apply atomically in one undo step
- [ ] Invalid generated drafts fail without partial board changes
- [ ] Mutation proposals such as Selection Rewrite apply atomically in one undo step
- [ ] Camera can be panned and zoomed
- [ ] Selection works correctly
- [ ] Selection normalizes grouped child ids to top-level selectable entities
- [ ] Auto-saves to workspace store
- [ ] Text editing state managed correctly
- [ ] Selected shapes can be grouped and ungrouped
- [ ] Selected shapes can be moved to front or back without splitting groups
- [ ] History limited to 50 states
- [ ] History cleared on workspace switch

**Constraints**:
- History is lost when switching workspaces
- Maximum 50 history states
- Auto-save debounced at 100ms
- Shape updates during drag not saved to history
- Selection APIs normalize grouped child ids to their top-level group before storing selection state
- Layer ordering normalizes child selections up to their root group so grouped content moves as one stack item
- Generated rectangle/circle labels are applied as companion text shapes because those primitives do not yet render inline text
- Selection Rewrite validation is intentionally strict in Phase 1: only text updates are allowed, with no layout or style mutations

**Known Issues**:
1. **ESLint Warning**: `react-hooks/exhaustive-deps` disabled for initialData useMemo
   ```typescript
   // eslint-disable-next-line react-hooks/exhaustive-deps
   [workspaceId]
   ```
   This is intentional - we only want to recalculate when workspaceId changes, not when workspace data changes.

2. **History Loss**: When switching workspaces, all undo history is lost. This is by design but could be improved to preserve history per-workspace.

3. **Generated Connectors Are Static**: Applied diagram connectors keep their generated start/end points. Moving nodes later does not automatically retarget connector endpoints.

4. **Cleanup Apply Is Still Pending**: The generic mutation apply path exists now, but Cleanup Suggestions still needs its own provider and preview UX.

5. **Memory Usage**: All shapes stored in memory. Very large drawings could cause issues.

**Testing Requirements**:

Unit tests should cover:
- Shape CRUD operations
- History operations (undo/redo)
- Camera transformations
- Workspace switching
- Text editing state

**Usage Example**:
```typescript
const {
  canvasRef,
  shapes,
  editorState,
  addShape,
  updateShape,
  deleteShape,
  deleteSelectedShapes,
  groupShapes,
  bringShapesToFront,
  undo,
  redo,
  canUndo,
  canRedo,
} = useCanvas(workspaceId);
```

---

### useKeyboard

**Purpose**: Global keyboard shortcut handler using native keydown event listener.

**Interface**:
```typescript
interface KeyboardActions {
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  clearSelection: () => void;
  setTool: (tool: ToolType) => void;
}

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description: string;
  preventDefault?: boolean;
}

function useKeyboard(actions: KeyboardActions): void
```

---

### useElementSize

**Purpose**: Observe a DOM element and return its current rendered width and height so components can react to layout-driven size changes.

**Interface**:
```typescript
interface ElementSize {
  width: number;
  height: number;
}

function useElementSize<T extends Element>(
  elementRef: React.RefObject<T | null>
): ElementSize
```

**Behavior**:
- Reads the current element size from `getBoundingClientRect()`
- Uses `ResizeObserver` when available so panel toggles and app-shell resizes update immediately
- Falls back to `window.resize` in environments without `ResizeObserver`
- Avoids unnecessary state updates when the size has not changed

**Success Criteria**:
- [ ] Returns the initial rendered size after mount
- [ ] Updates when the observed element changes size without a full window resize
- [ ] Falls back cleanly when `ResizeObserver` is unavailable

**Constraints**:
- Returns `{ width: 0, height: 0 }` until the element is mounted
- Measures layout size, not canvas backing-store pixels
- Intended for stable refs to mounted DOM elements

**Dependencies**:
- Native `ResizeObserver` when available
- `window.resize` as a compatibility fallback

**Shortcuts**:

| Key | Modifier | Action | Description |
|-----|----------|--------|-------------|
| z | Ctrl | undo | Undo last action |
| y | Ctrl | redo | Redo last undone action |
| z | Ctrl+Shift | redo | Redo (alternative) |
| Delete | - | deleteSelected | Delete selected shapes |
| Backspace | - | deleteSelected | Delete selected shapes |
| Escape | - | clearSelection | Clear selection |
| v | - | setTool('select') | Select tool |
| h | - | setTool('pan') | Hand/Pan tool |
| r | - | setTool('rectangle') | Rectangle tool |
| c | - | setTool('circle') | Circle tool |
| l | - | setTool('line') | Line tool |
| a | - | setTool('arrow') | Arrow tool |
| d | - | setTool('pencil') | Pencil tool |
| e | - | setTool('eraser') | Eraser tool |
| i | - | setTool('image') | Image tool |
| t | - | setTool('text') | Text tool |

**Important Behavior**:

Shortcuts are **DISABLED** when user is typing in:
- `<input>` elements
- `<textarea>` elements
- `contenteditable` elements

This prevents accidental shortcut triggering during text input.

**Implementation**:

```typescript
useEffect(() => {
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleKeyDown]);
```

**Key Matching Logic**:
```typescript
const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
const shiftMatch = !!shortcut.shift === e.shiftKey;
const altMatch = !!shortcut.alt === e.altKey;
```

**Success Criteria**:
- [ ] All shortcuts work when not editing text
- [ ] Shortcuts disabled when typing in inputs
- [ ] Ctrl+Z/Y work for undo/redo
- [ ] Delete/Backspace delete selected shapes
- [ ] Tool shortcuts switch tools correctly
- [ ] PreventDefault works for system shortcuts

**Constraints**:
- Uses native event listener (not React events)
- Key comparison is case-insensitive
- Ctrl key matches both Ctrl and Cmd (meta) on Mac
- Must be careful not to interfere with browser shortcuts

**Known Issues**:
- None currently

**Exported Constants**:

```typescript
export const keyboardShortcuts = [
  { keys: ['V'], description: 'Select tool' },
  { keys: ['H'], description: 'Pan tool' },
  // ... etc
];
```

Used for displaying shortcut help.

**Testing Requirements**:

Unit tests should cover:
- Each shortcut fires correct action
- Shortcuts disabled in input fields
- Modifier key combinations work
- PreventDefault prevents default behavior

**Usage Example**:
```typescript
useKeyboard({
  undo,
  redo,
  deleteSelected: deleteSelectedShapes,
  clearSelection,
  setTool: handleToolChange,
});
```

## Testing

Hooks are tested via integration tests in component tests or dedicated hook tests.

To test hooks in isolation, use React Testing Library's `renderHook`:
```typescript
import { renderHook, act } from '@testing-library/react';

const { result } = renderHook(() => useCanvas('workspace-1'));

act(() => {
  result.current.addShape(newShape);
});
```

## Best Practices

1. **Keep hooks focused**: Each hook should have a single responsibility
2. **Return stable references**: Use `useCallback` for returned functions
3. **Document side effects**: Note any event listeners or subscriptions
4. **Test thoroughly**: Hooks contain complex logic that needs testing
5. **Handle cleanup**: Always remove event listeners, clear intervals, etc.

## Adding New Hooks

1. Create `useNewHook.ts`
2. Define clear interface with TypeScript
3. Add JSDoc comments for complex logic
4. Create tests
5. Add to this README
