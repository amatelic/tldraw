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

### Task 11: Workspace Name Truncation & Long-Press Menu
**Status**: 🟡 In Progress
**Priority**: MEDIUM
**Description**: Add workspace name truncation with tooltips and long-press dropdown menu for rename/delete operations

**Acceptance Criteria**:

**1. Name Truncation:**
- ✅ Show full workspace name if ≤ 15 characters
- ✅ Truncate to first 15 chars + "..." if 16+ characters
- ✅ Example: "My Project Name" (15 chars) → shown in full
- ✅ Example: "My Project Name 123" (18 chars) → "My Project Name..."

**2. Tooltip on Truncated Names:**
- ✅ Tooltip shows full name when hovering for 3 seconds
- ✅ Tooltip does NOT appear if name is NOT truncated
- ✅ Tooltip positioned above the workspace tab
- ✅ Smooth fade-in animation (150ms)
- ✅ Disappears on mouse leave

**3. Long-Press Dropdown Menu:**
- ✅ Long-press workspace tab for 3 seconds to show dropdown
- ✅ Circular progress indicator fills around tab border during long-press
- ✅ Progress indicator starts at 0%, reaches 100% at 3s
- ✅ Dropdown appears when long-press completes
- ✅ Long-press canceled if mouse leaves or releases early
- ✅ Keep existing right-click context menu as alternative

**4. Dropdown Contents:**
- ✅ Option 1: "Rename" (enters edit mode)
- ✅ Option 2: "Delete" (disabled if last workspace)
- ✅ Same styling as current context menu
- ✅ Click outside to dismiss

**Technical Implementation**:

**Truncation Logic:**
```typescript
const TRUNCATE_LENGTH = 15;

const getDisplayName = (name: string): string => {
  return name.length > TRUNCATE_LENGTH 
    ? name.substring(0, TRUNCATE_LENGTH) + '...' 
    : name;
};

const isNameTruncated = (name: string): boolean => {
  return name.length > TRUNCATE_LENGTH;
};
```

**Long-Press Detection:**
- Use `onMouseDown` to start timer
- Use `onMouseUp` and `onMouseLeave` to cancel
- Show circular progress using SVG circle with `stroke-dasharray` animation
- Or CSS `conic-gradient` background
- Clear timer on unmount

**Tooltip Behavior:**
- Only render tooltip component if `isNameTruncated(name)` is true
- Start 3s timer on `onMouseEnter`
- Clear timer on `onMouseLeave`
- Position: `top: -40px`, `left: 50%`, `transform: translateX(-50%)`

**Circular Progress Indicator:**
- Use SVG circle with `stroke-dasharray` animation or CSS `conic-gradient`
- Color: `#1976d2` (active tab color)
- Size: 2px border width around tab

**Files to Modify**:
- `src/components/WorkspaceTab.tsx` - add truncation, tooltip, long-press detection, circular progress
- `src/App.css` - add tooltip styles, circular progress indicator styles
- `src/components/WorkspaceTab.test.tsx` - create comprehensive test suite

**Test Coverage Requirements** (8 tests minimum):
1. ✅ Name truncates at 16+ characters
2. ✅ Name shows full at ≤15 characters
3. ✅ Tooltip appears after 3s on truncated name
4. ✅ Tooltip does NOT appear on short name
5. ✅ Long-press progress starts at 0%
6. ✅ Long-press reaches 100% after 3s
7. ✅ Long-press canceled on mouse leave
8. ✅ Dropdown shows after successful long-press
9. ✅ Motion library renders components correctly
10. ✅ AnimatePresence handles enter/exit animations

**Visual Design**:

**Tooltip:**
```
┌────────────────────────┐
│ My Project Name 123    │  ← Full name
└────────────────────────┘
        ▼
   [My Project Na...]    ← Truncated tab
```

**Long-Press Progress:**
```
0%: [Tab]              50%: [◐Tab]           100%: [●Tab]
    (no border)            (half circle)        (full circle)
```

**Library Migration**:
- Migrated from `framer-motion` to `motion/react` (official rebrand)
- All components using motion library verified to work correctly
- Import paths updated: `import { motion, AnimatePresence } from 'motion/react'`
- Package dependency updated in package.json: `"motion": "^12.38.0"`

**Notes**:
- Tooltip trigger: Hover only (not click)
- Long-press visual feedback: Circular progress around tab
- Keep both right-click AND long-press for dropdown access
- Edge case: Exactly 15 characters → show full name (no truncation)
- Estimated effort: 2-3 hours implementation + testing

---

### Task 12: Add Agent Domain Model & Orchestrator Foundation
**Status**: 🔴 Not Started
**Priority**: HIGH
**Description**: Create the structured agent contracts and orchestration layer required for all Phase 1 agent workflows.

**Acceptance Criteria**:
- Add agent-specific types for workflow requests, proposals, findings, and canvas mutations
- Add an orchestrator that packages board context from the current workspace
- Support context scopes: current selection, visible board, full board
- Validate agent proposals before they can be shown in the UI
- Support a provider abstraction so the UI is not coupled to one model implementation
- Include a mock/local provider for development until real model wiring is added

**Implementation Details**:
1. Add `src/types/agents.ts` with structured contracts:
   - `AgentWorkflowType`
   - `AgentContextScope`
   - `AgentRequest`
   - `AgentProposal`
   - `AgentAction`
   - `AgentReviewFinding`
2. Add `src/agents/agentOrchestrator.ts`
3. Add helpers that serialize:
   - workspace metadata
   - selected shapes
   - visible shapes
   - text-bearing shapes
   - style and bounds information
4. Add proposal validation:
   - target ids must exist
   - action payloads must match shape capabilities
   - invalid proposals fail safely

**Files to Create**:
- `src/types/agents.ts`
- `src/agents/agentOrchestrator.ts`
- `src/agents/agentOrchestrator.test.ts`

**Files to Modify**:
- `src/types/index.ts` - export agent types if needed
- `src/hooks/useCanvas.ts` - expose any missing board context helpers if needed

**Testing Requirements**:
- Unit tests for context packaging
- Unit tests for proposal validation
- Tests for invalid action rejection

---

### Task 13: Add Agent Entry Point & Panel Shell
**Status**: 🔴 Not Started
**Priority**: HIGH
**Description**: Add the initial UI shell for agent workflows, including a header entry point, workflow picker, prompt area, and preview-ready panel states.

**Acceptance Criteria**:
- Add an `Agents` entry point in the header
- Open an agent panel or modal from the header
- Show workflow picker for:
  - Review Mode
  - Cleanup Suggestions
  - Selection Rewrite
- Show current context scope in the UI
- Show lifecycle states:
  - idle
  - collecting-context
  - generating
  - preview-ready
  - failed
- Support cancel/close without mutating the board

**Implementation Details**:
1. The panel should not apply any mutations yet unless a valid proposal is available
2. If selection exists, default the scope to selection
3. If no selection exists, default to visible board and explain that in the UI
4. The panel should render both review-only and mutating workflows

**Files to Create**:
- `src/components/AgentPanel.tsx`
- `src/components/AgentPanel.test.tsx`

**Files to Modify**:
- `src/App.tsx` - add `Agents` button and panel mounting
- `src/App.css` - add agent panel styles

**Testing Requirements**:
- Component tests for open/close behavior
- Component tests for workflow switching
- Component tests for context scope messaging

---

### Task 14: Implement Agent Review Mode
**Status**: 🔴 Not Started
**Priority**: MEDIUM
**Description**: Implement the first non-mutating workflow where the agent reviews the board and returns clarity/style findings without changing shapes.

**Acceptance Criteria**:
- User can run Review Mode from the agent panel
- Review Mode can target the current selection or visible board
- The result displays grouped findings:
  - clarity issues
  - missing information
  - consistency issues
  - suggested next edits
- Review Mode must not mutate the board
- Empty findings state should be handled gracefully

**Implementation Details**:
1. Use the orchestrator/provider pipeline introduced in Task 12
2. Return findings in structured form, not free-form markdown only
3. The panel should visually distinguish Review Mode from mutating workflows

**Files to Create**:
- `src/agents/providers/reviewModeProvider.ts`
- `src/agents/providers/reviewModeProvider.test.ts`

**Files to Modify**:
- `src/components/AgentPanel.tsx`
- `src/agents/agentOrchestrator.ts`

**Testing Requirements**:
- Unit tests for provider output mapping
- Component tests for findings rendering
- Regression test confirming no board mutation occurs

---

### Task 15: Implement Cleanup Suggestions With Preview/Apply
**Status**: 🔴 Not Started
**Priority**: MEDIUM
**Description**: Implement a workflow that suggests low-risk board cleanup operations and lets the user preview and apply them.

**Acceptance Criteria**:
- User can request cleanup suggestions from the agent panel
- Suggestions may include:
  - alignment fixes
  - spacing normalization
  - empty text cleanup
  - inconsistent style warnings
- Suggestions are presented as explicit proposed actions
- User can apply all suggestions or selected suggestions only
- Applying suggestions creates a single undoable change set

**Implementation Details**:
1. Start with deterministic or mock-backed cleanup rules if needed
2. Proposal preview must list:
   - shapes affected
   - fields changed
   - deletions, if any
3. High-impact actions such as deletion must require explicit confirmation

**Files to Create**:
- `src/agents/providers/cleanupSuggestionsProvider.ts`
- `src/agents/providers/cleanupSuggestionsProvider.test.ts`

**Files to Modify**:
- `src/components/AgentPanel.tsx`
- `src/hooks/useCanvas.ts` - support grouped apply if needed
- `src/agents/agentOrchestrator.ts`

**Testing Requirements**:
- Unit tests for cleanup suggestion generation
- Component tests for preview/apply UI
- Integration test confirming grouped undo behavior

---

### Task 16: Implement Selection Rewrite Workflow
**Status**: 🔴 Not Started
**Priority**: MEDIUM
**Description**: Implement a selection-scoped agent workflow that rewrites selected text content and optionally proposes small layout adjustments.

**Acceptance Criteria**:
- Workflow is available only when the current selection contains text-capable shapes
- User can enter a short rewrite prompt
- Workflow only targets the current selection
- Preview clearly shows before/after text changes
- Apply updates the selected text shapes only
- Applying the rewrite is undoable in one step

**Implementation Details**:
1. Reject the workflow with helpful UI if no text-capable shapes are selected
2. Limit Phase 1 to text rewrites only
3. Optional layout adjustments must remain previewable and low-risk
4. Do not support full prompt-to-diagram generation in this task

**Files to Create**:
- `src/agents/providers/selectionRewriteProvider.ts`
- `src/agents/providers/selectionRewriteProvider.test.ts`

**Files to Modify**:
- `src/components/AgentPanel.tsx`
- `src/agents/agentOrchestrator.ts`
- `src/hooks/useCanvas.ts` - support grouped mutation apply if needed

**Testing Requirements**:
- Unit tests for rewrite proposal generation
- Component tests for before/after preview
- Integration test confirming only selected text shapes change

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
