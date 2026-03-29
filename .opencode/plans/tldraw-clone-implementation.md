# TLDraw Clone Implementation Plan

## Current State Analysis

The project has a working canvas with:

- Drawing tools (select, rectangle, circle, line, freehand, eraser)
- Shape rendering with selection indicators
- Camera pan/zoom functionality
- Properties panel with colors, stroke width, opacity controls
- Basic shape manipulation (drag, update)

## Missing Features to Implement

### 1. Undo/Redo System

**Location:** `src/hooks/useCanvas.ts`

**Implementation:**

- Add history state management with `past`, `present`, `future` arrays
- Track state changes for shapes and editorState
- Implement `undo()` and `redo()` functions
- Add keyboard shortcuts (Ctrl+Z, Ctrl+Y)

**Key changes:**

- Wrap state setters to push to history
- Expose `undo`, `redo`, `canUndo`, `canRedo` to components

### 2. Delete Functionality

**Location:** Multiple files

**Implementation:**

- Wire up `deleteShape` in `useCanvas.ts` (already exists but not exposed)
- Add `deleteSelectedShapes()` function
- Implement eraser tool in `Canvas.tsx` (currently has TODO)
- Add Delete key keyboard shortcut
- Add delete button to UI

**Key changes:**

- `Canvas.tsx`: Implement eraser click to delete shape
- `App.tsx`: Add keyboard listener for Delete key
- `Toolbar.tsx`: Already has eraser button

### 3. Color Changing Support

**Status:** Already implemented!

**Verification:**

- `PropertiesPanel.tsx` has color pickers for stroke and fill
- `updateShapeStyle` updates default style
- `applyStyleToSelection` applies to selected shapes

**Enhancement opportunities:**

- Ensure color picker is intuitive
- Maybe add color presets or custom color input

## Implementation Order

1. **Undo/Redo** (Most complex, foundational)
2. **Delete functionality** (Eraser tool + keyboard)
3. **Test color changing** (Verify it works properly)
4. **Add UI polish** (Undo/redo buttons, delete confirmation)

## Files to Modify

1. `src/hooks/useCanvas.ts` - Add history management
2. `src/App.tsx` - Wire up undo/redo/delete, add keyboard shortcuts
3. `src/components/Canvas.tsx` - Implement eraser tool deletion
4. `src/components/Toolbar.tsx` - May need undo/redo buttons

## Technical Details

### History State Structure

```typescript
interface HistoryState {
  shapes: Shape[];
  editorState: EditorState;
}

const [history, setHistory] = useState<{
  past: HistoryState[];
  present: HistoryState;
  future: HistoryState[];
}>({
  past: [],
  present: { shapes: [], editorState: initialState },
  future: [],
});
```

### Keyboard Shortcuts

- `Ctrl+Z` / `Cmd+Z` - Undo
- `Ctrl+Y` / `Cmd+Shift+Z` / `Cmd+Y` - Redo
- `Delete` / `Backspace` - Delete selected shapes
- `Esc` - Clear selection

### State Management Strategy

- Push to `past` before any state-changing operation
- Clear `future` when new action occurs after undo
- Limit history size to prevent memory issues (e.g., 50 states)

## Next Steps

1. Exit Plan Mode
2. Start implementation with undo/redo system
3. Implement delete functionality
4. Test and verify color changing works
5. Add UI buttons for undo/redo
6. Test all keyboard shortcuts

## Estimated Effort

- Undo/Redo: ~2 hours
- Delete functionality: ~1 hour
- Color verification: ~30 minutes
- UI polish: ~30 minutes
- **Total: ~4 hours**
