# Specifications & Active Tasks

This file contains active tasks that need to be implemented. Tasks are marked with status and priority.

## Active Tasks

### Task 1: Add Vitest Testing Framework
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Set up Vitest testing framework and create basic test infrastructure
**Acceptance Criteria**:
- ✅ Install vitest and @testing-library/react as dev dependencies
- ✅ Create `vitest.config.ts` configuration file
- ✅ Add test scripts to package.json
- ✅ Create example test file `src/utils/audioProcessor.test.ts`
- ✅ All tests should pass with `npm test`

**Files Modified**:
- `package.json` - added vitest dependencies and scripts
- `vitest.config.ts` - created Vitest configuration
- `src/test/setup.ts` - created test setup file
- `src/utils/audioProcessor.test.ts` - created comprehensive test suite (11 tests, 100% coverage)
- `tsconfig.app.json` - excluded test files from build

**Notes**:
- Installed: vitest, @testing-library/react, @testing-library/jest-dom, jsdom
- Added test commands: `npm test`, `npm run test:watch`, `npm run test:coverage`
- Tests cover both formatDuration (4 tests) and extractWaveform (7 tests)
- Mocked AudioContext and fetch APIs for browser environment

---

### Task 2: Implement Text Shape In-Place Editing
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Currently text tool adds a new shape each time. Allow editing existing text shapes by double-clicking.

**Acceptance Criteria**:
- ✅ Double-clicking a text shape enters edit mode
- ✅ User can modify the text content inline
- ✅ Pressing Enter or clicking outside saves changes
- ✅ Pressing Escape cancels editing
- ✅ Text shape updates with new content
- ✅ Undo/redo works with text edits

**Detailed Specification**:
1. **Multiline Support**: Use `<textarea>` element to support `\n` newlines in text
2. **Auto-grow Behavior**: Shape bounds (width and height) automatically expand as user types to accommodate content
3. **Empty Text Handling**: If text becomes empty when committing changes, delete the shape entirely
4. **Click-Switching**: Clicking another text shape while editing switches edit focus to that shape (commits current, enters edit on new)
5. **Styling Match**: The textarea overlay must match canvas font rendering (font-family, font-size, font-weight, font-style, text-align, color)
6. **Camera Transform**: Handle zoom/pan correctly - textarea positioned using `worldToScreen()` math
7. **Default Text**: Change placeholder from "Double-click to edit" to empty string ("")

**Files Modified**:
- `src/types/index.ts` - added `editingTextId: string | null` to EditorState
- `src/stores/workspaceStore.ts` - added `editingTextId` to WorkspaceState and createInitialState
- `src/hooks/useCanvas.ts` - added text editing methods (startTextEdit, commitTextEdit, cancelTextEdit) and worldToScreen function
- `src/components/Canvas.tsx` - implemented double-click handler, textarea overlay, auto-grow, keyboard shortcuts
- `src/App.tsx` - removed auto-switch behavior, added text editing props to Canvas

**Files Created**:
- `src/components/Canvas.text-editing.test.tsx` - comprehensive test suite (23 tests)

**Test Coverage**: 23 tests covering all functionality:
- Double-click to enter edit mode
- Textarea styling matches canvas
- Auto-grow behavior (width and height)
- Keyboard interactions (Enter, Shift+Enter, Escape)
- Click outside to commit
- Empty text deletion
- Click-switching between text shapes
- Camera transform handling
- Undo/Redo integration
- Focus management
- Default text behavior

---

### Task 3: Fix Text Tool Auto-Switch Behavior
**Status**: 🔴 Not Started
**Priority**: MEDIUM
**Description**: The text tool switches back to select immediately after adding text, preventing multiple text additions
**Acceptance Criteria**:
- Text tool stays active after adding text
- User can click multiple times to add multiple text shapes
- User must manually switch to another tool
- Remove the problematic useEffect that auto-switches

**Bad Code to Fix** (from `App.tsx:64-70`):
```tsx
useEffect(() => {
  if (editorState.tool === 'text' && shapes.length > prevShapesLengthRef.current) {
    setEditorState((prev) => ({ ...prev, tool: 'select' }));
  }
  prevShapesLengthRef.current = shapes.length;
}, [shapes.length, editorState.tool, setEditorState]);
```

---

### Task 4: Add Export to PNG/SVG Feature
**Status**: 🔴 Not Started
**Priority**: MEDIUM
**Description**: Allow users to export their canvas as image files
**Acceptance Criteria**:
- Add "Export" button to header
- Export current viewport as PNG
- Export as SVG (vector format)
- Export all shapes or just selected shapes
- Include proper filename with timestamp

**Files to Modify**:
- `src/App.tsx` - add export buttons
- `src/canvas/CanvasEngine.ts` - add export methods

---

### Task 5: Add Shape Grouping/Ungrouping
**Status**: 🔴 Not Started
**Priority**: MEDIUM
**Description**: Allow grouping multiple shapes so they move/scale together
**Acceptance Criteria**:
- Select multiple shapes and group them (Ctrl+G)
- Grouped shapes move together when dragged
- Ungroup shapes (Ctrl+Shift+G)
- Group appears as single selection
- Groups can be nested
- Works with undo/redo

**Files to Modify**:
- `src/types/index.ts` - add GroupShape type
- `src/hooks/useCanvas.ts` - add group/ungroup methods
- `src/canvas/CanvasEngine.ts` - render groups

---

### Task 6: Fix Auto-save Race Condition
**Status**: 🔴 Not Started
**Priority**: LOW
**Description**: Multiple useEffect hooks with separate timeouts can cause shapes and state to get out of sync
**Acceptance Criteria**:
- Combine shapes and state auto-save into single effect
- Use debounced save instead of multiple timeouts
- Ensure atomic updates to workspace store

**Bad Code to Fix** (from `src/hooks/useCanvas.ts:112-124`):
```tsx
useEffect(() => {
  const timeoutId = setTimeout(() => {
    workspaceStore.updateWorkspaceShapes(workspaceId, shapes);
  }, 100);
  return () => clearTimeout(timeoutId);
}, [shapes, workspaceId, workspaceStore]);

useEffect(() => {
  const timeoutId = setTimeout(() => {
    workspaceStore.updateWorkspaceState(workspaceId, editorState);
  }, 100);
  return () => clearTimeout(timeoutId);
}, [editorState, workspaceId, workspaceStore]);
```

---

### Task 7: Remove Unused Parameter in canDeleteWorkspace
**Status**: 🔴 Not Started
**Priority**: LOW
**Description**: The canDeleteWorkspace function takes an id parameter but ignores it
**Acceptance Criteria**:
- Remove id parameter from function signature
- Update all call sites
- Update interface definition

**Bad Code to Fix** (from `src/stores/workspaceStore.ts:136-140`):
```tsx
canDeleteWorkspace: (id: string) => {
  // id parameter kept for API consistency, but we only check total count
  void id;
  const state = get();
  return state.workspaces.length > 1;
},
```

---

### Task 8: Fix ESLint Disable in useCanvas Hook
**Status**: 🔴 Not Started
**Priority**: LOW
**Description**: The hook disables exhaustive-deps rule which hides real dependency issues
**Acceptance Criteria**:
- Remove eslint-disable comment
- Add proper dependencies to useMemo
- Ensure no stale closures

**Bad Code to Fix** (from `src/hooks/useCanvas.ts:74`):
```tsx
const initialData = useMemo(
  () => ({
    shapes: workspace?.shapes || [],
    editorState: workspace?.state || defaultEditorState,
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [workspaceId]
);
```

---

### Task 9: Add Error Boundaries
**Status**: 🔴 Not Started
**Priority**: LOW
**Description**: Implement React error boundaries to prevent full app crashes
**Acceptance Criteria**:
- Create ErrorBoundary component
- Wrap main App component
- Show user-friendly error message
- Provide retry/refresh option

**Files to Create**:
- `src/components/ErrorBoundary.tsx`

**Files to Modify**:
- `src/main.tsx` - wrap App with ErrorBoundary

---

### Task 10: Add Input Validation for Workspace Names
**Status**: 🔴 Not Started
**Priority**: LOW
**Description**: Workspace names can currently be empty or excessively long
**Acceptance Criteria**:
- Minimum 1 character, maximum 50 characters
- Show validation error if invalid
- Trim whitespace
- Prevent duplicate names (optional)

**Files to Modify**:
- `src/stores/workspaceStore.ts` - add validation in renameWorkspace
- `src/components/WorkspaceTabs.tsx` - show validation feedback

---

## Task Selection Workflow

When working on tasks:
1. Pick the highest priority task marked as "🔴 Not Started"
2. Create a feature branch (if using git)
3. Implement the feature following code style guidelines
4. Write comprehensive tests
5. Run all tests to ensure nothing broke
6. Update this file - change status to "✅ Completed"
7. Move task details to PROGRESS.md under appropriate section

## Priority Legend

- **HIGH**: Critical functionality, blocks other work
- **MEDIUM**: Important features, improves UX
- **LOW**: Nice to have, technical debt, code cleanup

## Status Legend

- 🔴 Not Started
- 🟡 In Progress
- 🟢 Ready for Review
- ✅ Completed
