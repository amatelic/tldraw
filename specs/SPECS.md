# Specifications & Active Tasks

This file contains active tasks that need to be implemented. Tasks are marked with status and priority.

## Active Tasks

### Task 1: Add Vitest Testing Framework
**Status**: 🔴 Not Started
**Priority**: HIGH
**Description**: Set up Vitest testing framework and create basic test infrastructure
**Acceptance Criteria**:
- Install vitest and @testing-library/react as dev dependencies
- Create `vitest.config.ts` configuration file
- Add test scripts to package.json
- Create example test file `src/utils/audioProcessor.test.ts`
- All tests should pass with `npm test`

**Files to Modify**:
- `package.json` - add vitest dependencies and scripts
- `vite.config.ts` - add vitest configuration
- Create `src/utils/audioProcessor.test.ts`

---

### Task 2: Implement Text Shape In-Place Editing
**Status**: 🔴 Not Started
**Priority**: HIGH
**Description**: Currently text tool adds a new shape each time. Allow editing existing text shapes by double-clicking.
**Acceptance Criteria**:
- Double-clicking a text shape enters edit mode
- User can modify the text content inline
- Pressing Enter or clicking outside saves changes
- Pressing Escape cancels editing
- Text shape updates with new content
- Undo/redo works with text edits

**Files to Modify**:
- `src/types/index.ts` - may need to add editing state
- `src/components/Canvas.tsx` - handle double-click events
- `src/hooks/useCanvas.ts` - add text editing methods
- `src/App.tsx` - manage edit mode state

**Related Bug**: Issue 1 in PROGRESS.md - Text tool auto-switches too quickly

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
