# Specifications & Active Tasks

This file contains active tasks that need to be implemented. Tasks are marked with status and priority.

## Active Tasks

## Recent Updates

- 2026-04-13: Extended the inspector redesign language into the app header/workspace rail and added Playwright coverage for the new chrome styling.
- 2026-04-14: Converted the shell to a full-viewport canvas with floating header and inspector overlays, plus Playwright checks for viewport coverage.
- 2026-04-15: Added a focused spec and task breakdown for a work-diagram agent with OpenCode transport and presentation-brief output.
- 2026-04-16: Added embed resize handles, inspector-driven layout editing for single selected frame-like shapes, a dedicated interaction spec for embed/layout behavior, and Playwright coverage for canvas resize plus inspector size edits.
- 2026-04-16: Implemented multi-selection canvas interactions with additive click selection, marquee selection, combined multi-select framing, inspector group/ungroup actions, and regression coverage.
- 2026-04-17: Added multi-select inspector selected-item metadata plus a standalone app UI presentation spec for the current shell and panel inventory.
- 2026-04-20: Refactored the agent UI into a sidebar-first composer with progressive disclosure and an expanded diagram preview sheet.
- 2026-04-21: Implemented cleanup suggestions with deterministic proposal generation, inline preview/apply controls, and grouped undo coverage.
- 2026-04-21: Started the architecture cleanup backlog by documenting the target module map, creating `specs/tasks/README.md`, and confirming the dependency order for tasks 02 through 13.
- 2026-04-21: Split core document, editor, and workspace-export contracts into focused type modules while keeping `src/types/index.ts` as the compatibility barrel.
- 2026-04-21: Extracted geometry, hit-testing, and selection/grouping helpers into focused modules and pointed the main runtime surfaces at those dedicated imports.
- 2026-04-22: Consolidated canvas-engine ownership into `Canvas.tsx`, removed render-object construction from `useCanvas`, and added focused single-owner regression coverage.
- 2026-04-22: Extracted pure document commands into `src/document/commands.ts`, moved App-level layout mutations behind hook command APIs, and added direct command coverage plus one-step layout undo tests.
- 2026-04-22: Completed Task 06 by simplifying `Canvas.tsx` effect coordination, extracting the selection, text-edit, context-menu, and embed overlay shells into focused components, and locking those paths with targeted regressions.
- 2026-04-22: Completed Task 08 by routing the inspector through a dedicated selection model, surfacing explicit mixed-value affordances in `PropertiesPanel`, and documenting the no-selection defaults mode as intentionally model-only.
- 2026-04-22: Completed Task 07 by centralizing text typography reads and updates, normalizing legacy text shapes on load, and adding renderer/export compatibility coverage.
- 2026-04-22: Completed Task 10 by making child `parentId` the canonical runtime group relationship and deriving group child ids only at command, render, and export boundaries.
- 2026-04-22: Completed Task 11 by replacing split autosave effects with one coordinated workspace snapshot save and by locking the workspace-switch history policy with focused hook coverage.
- 2026-04-22: Completed Task 12 by moving proposal validation/application into `src/agents/documentApplication.ts` so `useCanvas` only history-wraps the returned next state.
- 2026-04-22: Completed Task 13 by extracting the app shell into `src/app/`, leaving `App.tsx` as a thin root wiring layer with focused app-shell coverage.
- 2026-05-06: Added global design tokens, a 260px left project/layers sidebar, dev-only design-token overrides, a camera-aware ruler component, and app-shell layout coverage for the sidebar/right-panel offsets.
- 2026-05-07: Added a prioritized code-quality backlog for the remaining large interaction, rendering, inspector, agent, persistence, and app-shell boundaries.
- 2026-05-10: Added a focused core canvas testing pass covering keyboard shortcuts, useCanvas CRUD/camera/style behavior, and core pointer interactions.
- 2026-05-10: Added app-level tool-selection coverage for keyboard shortcuts and toolbar clicks updating the active tool.
- 2026-05-10: Added keyboard-driven group/ungroup coverage that verifies selected items become grouped and ungrouped.

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
**Status**: ✅ Completed
**Priority**: MEDIUM
**Description**: The text tool switches back to select immediately after adding text, preventing multiple text additions
**Acceptance Criteria**:
- ✅ Text tool stays active after adding text
- ✅ User can click multiple times to add multiple text shapes
- ✅ User must manually switch to another tool
- ✅ The old auto-switch effect no longer exists, and App-level regression coverage locks that behavior

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
**Status**: ✅ Completed
**Priority**: MEDIUM
**Description**: Allow users to export their canvas as image files
**Acceptance Criteria**:
- ✅ Add "Export" button to header
- ✅ Export current viewport as PNG
- ✅ Export as SVG (vector format)
- ✅ Export all shapes or just selected shapes
- ✅ Include proper filename with timestamp

**Files Modified**:
- `src/app/AppShell.tsx` - added the header export menu
- `src/app/useAppShellState.ts` - wired viewport/all/selected export callbacks
- `src/App.css` - styled the export popover and export actions
- `src/canvas/CanvasEngine.ts` - added PNG/SVG export helpers plus timestamped filenames
- `src/App.export.test.tsx` - updated app export wiring coverage
- `src/app/README.md`
- `src/canvas/README.md`
- `specs/SPECS.md`
- `specs/README.md`
- `PROGRESS.md`

**Files Created**:
- `src/canvas/CanvasEngine.export.test.ts`

**Verification**:
- `npx vitest run src/canvas/CanvasEngine.export.test.ts src/App.export.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- The header now keeps the existing JSON export and adds a separate `Export` menu for viewport PNG plus all/selected PNG and SVG exports.
- Selected exports expand selected groups to include their descendants before rendering or serializing.

---

### Task 5: Add Shape Grouping/Ungrouping
**Status**: ✅ Completed
**Priority**: MEDIUM
**Description**: Allow grouping multiple shapes so they move/scale together
**Acceptance Criteria**:
- ✅ Select multiple shapes and group them (Ctrl+G)
- ✅ Grouped shapes move together when dragged
- ✅ Ungroup shapes (Ctrl+Shift+G)
- ✅ Group appears as single selection
- ✅ Groups can be nested
- ✅ Works with undo/redo
- ✅ Right-click menu exposes delete, group/ungroup, and layer-order actions for selected shapes

**Files Modified**:
- `src/types/index.ts` - added group helpers and root-group resolution utilities
- `src/hooks/useCanvas.ts` - implemented group/ungroup plus bring-to-front / send-to-back actions
- `src/canvas/CanvasEngine.ts` - renders group bounds and labels
- `src/components/Canvas.tsx` - added right-click context menu for delete, grouping, and z-order actions
- `src/App.tsx` - wired canvas menu actions to selection state

**Files Created**:
- `src/hooks/useCanvas.grouping.test.ts` - grouping, ungrouping, delete, and layer-order coverage
- `src/components/Canvas.context-menu.test.tsx` - right-click menu interaction coverage

---

### Task 6: Fix Auto-save Race Condition
**Status**: ✅ Completed
**Priority**: LOW
**Description**: Multiple useEffect hooks with separate timeouts can cause shapes and state to get out of sync
**Acceptance Criteria**:
- ✅ Combine shapes and state auto-save into single effect
- ✅ Use debounced save instead of multiple timeouts
- ✅ Ensure atomic updates to workspace store

**Notes**:
- Completed through the coordinated workspace snapshot save work captured in Task 39.
- `useCanvas` now persists one debounced `{ shapes, state }` snapshot through `workspaceStore.saveWorkspaceSnapshot(...)`.
- Workspace switching now waits for the next workspace load before persistence resumes, preventing stale saves from landing on the wrong workspace.

---

### Task 7: Remove Unused Parameter in canDeleteWorkspace
**Status**: ✅ Completed
**Priority**: LOW
**Description**: The canDeleteWorkspace function takes an id parameter but ignores it
**Acceptance Criteria**:
- ✅ Remove id parameter from function signature
- ✅ Update all call sites
- ✅ Update interface definition
- ✅ Add regression coverage for id-free deletion eligibility

**Bad Code to Fix** (from `src/stores/workspaceStore.ts:136-140`):
```tsx
canDeleteWorkspace: (id: string) => {
  // id parameter kept for API consistency, but we only check total count
  void id;
  const state = get();
  return state.workspaces.length > 1;
},
```

**Files Modified**:
- `src/stores/workspaceStore.ts` - simplified `canDeleteWorkspace` API to use workspace count only
- `src/stores/workspaceStore.test.ts` - added id-free delete eligibility regression coverage
- `src/stores/README.md` - updated the workspace store interface and removed the resolved known issue

**Verification**:
- `npx vitest run src/stores/workspaceStore.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

---

### Task 8: Fix ESLint Disable in useCanvas Hook
**Status**: ✅ Completed
**Priority**: LOW
**Description**: The hook disables exhaustive-deps rule which hides real dependency issues
**Acceptance Criteria**:
- ✅ Remove eslint-disable comment
- ✅ Add proper dependencies to useMemo
- ✅ Ensure no stale closures
- ✅ Add regression coverage that same-workspace snapshot changes do not overwrite local edits

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

**Files Modified**:
- `src/hooks/useCanvas.ts` - replaced the disabled dependency list with explicit workspace shape/state dependencies
- `src/hooks/useCanvas.persistence.test.ts` - added same-workspace rerender coverage
- `src/hooks/README.md` - removed the resolved known issue

**Verification**:
- `npx vitest run src/hooks/useCanvas.persistence.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

---

### Task 9: Add Error Boundaries
**Status**: ✅ Completed
**Priority**: LOW
**Description**: Implement React error boundaries to prevent full app crashes
**Acceptance Criteria**:
- ✅ Create ErrorBoundary component
- ✅ Wrap main App component
- ✅ Show user-friendly error message
- ✅ Provide retry/refresh option

**Files Created**:
- `src/components/ErrorBoundary.tsx`
- `src/components/ErrorBoundary.css`
- `src/components/ErrorBoundary.test.tsx`

**Files Modified**:
- `src/main.tsx` - wrap App with ErrorBoundary
- `src/components/README.md` - document the root fallback behavior

**Verification**:
- `npx vitest run src/components/ErrorBoundary.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

---

### Task 10: Add Input Validation for Workspace Names
**Status**: ✅ Completed
**Priority**: LOW
**Description**: Workspace names can currently be empty or excessively long
**Acceptance Criteria**:
- ✅ Minimum 1 character, maximum 50 characters
- ✅ Show validation error if invalid
- ✅ Trim whitespace
- Duplicate names remain allowed for now

**Files Modified**:
- `src/stores/workspaceStore.ts` - add validation in renameWorkspace
- `src/components/WorkspaceTabs.tsx` - show validation feedback
- `src/components/WorkspaceTab.tsx` - show validation feedback for visible tabs
- `src/app/useAppShellState.ts` - return store rename result to tab UI
- `src/App.css` - style inline validation errors
- `src/stores/README.md`
- `src/components/README.md`

**Tests**:
- `src/stores/workspaceStore.test.ts`
- `src/components/WorkspaceTab.test.tsx`
- `src/components/WorkspaceTabs.test.tsx`

**Verification**:
- `npx vitest run src/stores/workspaceStore.test.ts src/components/WorkspaceTab.test.tsx src/components/WorkspaceTabs.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

---

### Task 11: Workspace Name Truncation & Long-Press Menu
**Status**: ✅ Completed
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

**Verification**:
- `npx vitest run src/components/WorkspaceTab.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

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
**Status**: ✅ Completed
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

**Files Created**:
- `src/types/agents.ts`
- `src/agents/agentOrchestrator.ts`
- `src/agents/agentOrchestrator.test.ts`

**Notes**:
- Added scoped context packaging for selection, visible board, and full board
- Added provider abstraction with proposal validation before UI consumption
- Mutation proposal validation is in place even though Phase 1 currently only wires Review Mode

---

### Task 13: Add Agent Entry Point & Panel Shell
**Status**: ✅ Completed
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

**Files Created**:
- `src/components/AgentPanel.tsx`
- `src/components/AgentPanel.test.tsx`

**Files Modified**:
- `src/App.tsx` - added `Agents` button and modal mounting
- `src/App.css` - added minimal agent modal styles

**Notes**:
- The UI intentionally stays minimal: one entry point, one modal, one workflow picker, one prompt field
- Lifecycle states are surfaced in the panel without adding provider/model controls

---

### Task 14: Implement Agent Review Mode
**Status**: ✅ Completed
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

**Files Created**:
- `src/agents/providers/reviewModeProvider.ts`
- `src/agents/providers/reviewModeProvider.test.ts`

**Files Modified**:
- `src/components/AgentPanel.tsx`
- `src/agents/agentOrchestrator.ts`

**Notes**:
- Review Mode is deterministic/mock-backed for now and returns structured findings only
- Cleanup Suggestions and Selection Rewrite stay on the deterministic/local path for the first release and do not depend on OpenCode

---

### Task 15: Implement Cleanup Suggestions With Preview/Apply
**Status**: ✅ Completed
**Priority**: MEDIUM
**Description**: Implement a workflow that suggests low-risk board cleanup operations and lets the user preview and apply them.

**Acceptance Criteria**:
- ✅ User can request cleanup suggestions from the agent panel
- ✅ Suggestions may include:
  - alignment fixes
  - spacing normalization
  - empty text cleanup
  - inconsistent style warnings
- ✅ Suggestions are presented as explicit proposed actions
- ✅ User can apply all suggestions or selected suggestions only
- ✅ Applying suggestions creates a single undoable change set

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
- `src/App.tsx`
- `src/hooks/useCanvas.mutation.test.ts`
- `src/agents/agentOrchestrator.ts`

**Testing Requirements**:
- Unit tests for cleanup suggestion generation
- Component tests for preview/apply UI
- Integration test confirming grouped undo behavior

**Verification**:
- `npx vitest run src/agents/providers/cleanupSuggestionsProvider.test.ts src/components/AgentPanel.test.tsx src/hooks/useCanvas.mutation.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- Added a deterministic `CleanupSuggestionsProvider` that proposes alignment, spacing, style normalization, and empty-text deletion actions without relying on OpenCode
- Cleanup preview now shows affected shapes, changed fields, selection toggles, and explicit deletion confirmation before apply
- Users can apply all suggestions or just the selected subset, while both paths reuse the grouped mutation-apply infrastructure so undo stays atomic

---

### Task 16: Implement Selection Rewrite Workflow
**Status**: ✅ Completed
**Priority**: MEDIUM
**Description**: Implement a selection-scoped agent workflow that rewrites selected text content and optionally proposes small layout adjustments.

**Acceptance Criteria**:
- ✅ Workflow is available only when the current selection contains text-capable shapes
- ✅ User can enter a short rewrite prompt
- ✅ Workflow only targets the current selection
- ✅ Preview clearly shows before/after text changes
- ✅ Apply updates the selected text shapes only
- ✅ Applying the rewrite is undoable in one step

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

**Verification**:
- `npx vitest run src/agents/providers/selectionRewriteProvider.test.ts src/hooks/useCanvas.mutation.test.ts src/components/AgentPanel.test.tsx src/agents/agentOrchestrator.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- Added a deterministic `SelectionRewriteProvider` so the workflow is available without waiting on server-side rewrite transport
- Locked Selection Rewrite to the current selection and disabled it when no selected text shapes exist
- Added before/after rewrite preview plus apply handling inside `AgentPanel`
- Added a grouped mutation-apply path in `useCanvas` so rewrite proposals apply atomically and undo in one step
- Reused orchestrator mutation validation so invalid rewrite actions are blocked before canvas mutation
- Cleanup Suggestions remains scaffolded and is still the next missing agent workflow after this slice

---

### Task 17: Redesign Right-Side Inspector UI
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Redesign the right-side properties panel to match the latest soft inspector reference with a more polished visual hierarchy and embedded color workflow.

**Acceptance Criteria**:
- ✅ Replace the old boxed sidebar styling with a softer floating inspector shell
- ✅ Add compact collapsible sections with section metadata and tighter spacing
- ✅ Recompose style controls into pill-style segmented groups and inline cards
- ✅ Redesign the color picker to match the reference more closely
- ✅ Keep existing behavior working for layout, text, color, opacity, and shadows
- ✅ Add regression tests verifying the new UI shell and color picker structure
- ✅ Document the redesign in `PROGRESS.md` and a dedicated sidepanel spec

**Files Modified**:
- `src/App.css`
- `src/components/PropertiesPanel.tsx`
- `src/components/PropertiesPanel.css`
- `src/components/ColorPicker.tsx`
- `src/components/ColorPicker.css`
- `src/components/ColorPicker.test.tsx`
- `src/components/README.md`
- `PROGRESS.md`
- `specs/right-panel-refactor-SPEC.md`

**Files Created**:
- `src/components/PropertiesPanel.test.tsx`

**Verification**:
- `npx vitest run`
- `npm run build`
- `npm run test:e2e`

**Notes**:
- `npm run lint` still reports pre-existing issues in `src/components/Canvas.tsx` and `src/components/Canvas.text-editing.test.tsx`
- Export controls were not added as part of this redesign; the task focused on visual/interaction parity for the inspector itself
- E2E coverage now includes a browser-level regression for legacy persisted sidepanel state

---

### Task 18: Add Diagram Generation Contracts & OpenCode Transport
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Extend the agent foundation so the app can request simple work diagrams from a server through OpenCode and receive structured diagram plus presentation output.

**Acceptance Criteria**:
- ✅ Add a new agent workflow for prompt-to-diagram generation
- ✅ Extend the proposal schema to support create actions for shapes/connectors
- ✅ Add a structured presentation brief contract to agent results
- ✅ Add an OpenCode client/adapter layer that isolates transport concerns from UI code
- ✅ Keep a mock or local fallback path for development and tests
- ✅ Reject invalid diagram proposals safely before they reach the UI

**Files Created**:
- `src/agents/openCodeClient.ts`
- `src/agents/openCodeClient.test.ts`
- `src/agents/README.md`

**Files Modified**:
- `src/types/agents.ts`
- `src/agents/agentOrchestrator.ts`
- `src/agents/agentOrchestrator.test.ts`
- `src/types/README.md`
- `src/README.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/agents/agentOrchestrator.test.ts src/agents/openCodeClient.test.ts`
- `npm run build`

**Notes**:
- Added structured diagram-generation contracts for create-shape/create-connector actions, sections, warnings, confidence, and presentation briefs
- Added an OpenCode client with deterministic mock fallback so future provider work can integrate without coupling transport details into the UI
- `npm run lint` still fails on pre-existing issues in `src/components/Canvas.tsx` and `src/components/Canvas.text-editing.test.tsx`

---

### Task 19: Add Diagram Generator Workflow UI
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Extend the agent panel with a dedicated workflow for generating simple work diagrams and collecting the minimum prompt context needed for useful results.

**Acceptance Criteria**:
- ✅ Add a "Diagram Generator" workflow to the agent panel
- ✅ Add prompt scaffolding for:
  - primary prompt
  - diagram preset/type
  - optional audience
  - optional presentation goal
- ✅ Include starter examples for:
  - backend architecture for a messaging app
  - storyboard for learning storytelling
- ✅ Show workflow-specific loading and empty states
- ✅ Avoid presenting this flow as a generic chat experience

**Files Modified**:
- `src/components/AgentPanel.tsx`
- `src/components/AgentPanel.test.tsx`
- `src/components/README.md`
- `src/App.css`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/components/AgentPanel.test.tsx`
- `npm run build`

**Notes**:
- Added a dedicated Diagram Generator workflow with preset cards, example starters, audience input, and presentation-goal scaffolding
- Locked diagram generation to full-board scope for the first draft-generation slice
- Running the workflow still reports that the provider is unavailable until Task 20 wires the OpenCode-backed implementation
- `npm run lint` still fails on pre-existing issues in `src/components/Canvas.tsx` and `src/components/Canvas.text-editing.test.tsx`

---

### Task 20: Implement OpenCode-Backed Diagram Provider
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Implement the provider that sends diagram-generation requests through OpenCode and returns a validated diagram proposal.

**Acceptance Criteria**:
- ✅ Add a provider for the diagram-generation workflow
- ✅ Provider sends structured request data, not only raw prompt text
- ✅ Provider maps server output into supported app actions
- ✅ Provider surfaces partial/low-confidence output as warnings instead of silent failure
- ✅ Unsupported shapes or connector references are rejected safely

**Files Created**:
- `src/agents/providers/openCodeDiagramProvider.ts`
- `src/agents/providers/openCodeDiagramProvider.test.ts`

**Files Modified**:
- `src/App.tsx`
- `src/components/AgentPanel.tsx`
- `src/components/AgentPanel.test.tsx`
- `src/components/README.md`
- `src/agents/README.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/agents/providers/openCodeDiagramProvider.test.ts src/components/AgentPanel.test.tsx`
- `npm run build`

**Notes**:
- Added `OpenCodeDiagramProvider` on top of `OpenCodeClient` and wired it into the app orchestrator
- Low-confidence, unsectioned, or empty drafts now surface warnings instead of appearing as clean successes
- Agent panel copy now reflects that provider wiring is complete while full generation preview still lands in the next task
- `npm run lint` still fails on pre-existing issues in `src/components/Canvas.tsx` and `src/components/Canvas.text-editing.test.tsx`

---

### Task 21: Add Diagram Preview & Presentation Brief UI
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Show users what the generated work diagram will create and how to present it before anything is applied to the board.

**Acceptance Criteria**:
- ✅ Preview shows a readable summary of planned sections, nodes, and connectors
- ✅ Preview shows how many shapes will be added
- ✅ Preview surfaces warnings and assumptions clearly
- ✅ Preview includes a presentation brief with:
  - title
  - objective
  - audience
  - narrative order
  - speaker notes
  - open questions
- ✅ Preview remains readable after generation and before apply

**Files Modified**:
- `src/components/AgentPanel.tsx`
- `src/components/AgentPanel.test.tsx`
- `src/components/README.md`
- `src/App.css`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/components/AgentPanel.test.tsx`
- `npm run build`

**Notes**:
- Added a structured generation preview for diagram sections, planned nodes, planned connectors, warnings, and presentation brief content
- Added safe empty-state rendering for missing presentation sections so the panel stays readable even when the response is sparse
- Preview is still read-only in this task; apply behavior lands next in Task 22

---

### Task 22: Apply Generated Diagrams to the Canvas
**Status**: ✅ Completed
**Priority**: MEDIUM
**Description**: Convert validated diagram proposals into real canvas shapes and connectors, applied as one undoable change set.

**Acceptance Criteria**:
- User can apply a generated diagram from preview
- Applying the diagram creates supported shapes/connectors on the board
- The full diagram generation is grouped into one undo step
- Generated shapes are editable with existing canvas tools
- Failed apply operations do not leave the board in a partial state

**Implementation Details**:
1. Add create-shape/create-connector apply helpers
2. Reuse shared mutation infrastructure where possible so this work also benefits cleanup/rewrite workflows
3. Keep the first supported primitive set intentionally small
4. Select the generated draft after apply when practical

**Files to Modify**:
- `src/hooks/useCanvas.ts`
- `src/agents/agentOrchestrator.ts`
- `src/components/AgentPanel.tsx`

**Testing Requirements**:
- Integration tests for apply flow
- Tests for grouped undo behavior
- Tests ensuring invalid apply attempts are blocked

**Verification**:
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- Added a reusable generation-validation helper so canvas apply re-checks structured diagram drafts before mutating board state
- Added `applyGeneratedDiagram` to `useCanvas` so generated drafts are created in a single undoable history step with no partial writes
- Applied rectangle/circle labels as companion text shapes so approved previews remain readable on the board
- Added AgentPanel apply actions plus success/error handling around preview approval
- Added regression coverage for canvas apply, grouped undo, invalid apply blocking, and panel-level apply behavior
- Fixed the existing `Canvas.text-editing` test bug so the full Vitest suite and lint now pass again

---

### Task 23: Add Example-Driven Coverage & Documentation for Diagram Generation
**Status**: ✅ Completed
**Priority**: MEDIUM
**Description**: Document the diagram-generation workflow and add example-driven tests that lock in the expected experience for common work prompts.

**Acceptance Criteria**:
- ✅ Add documentation for the new workflow and output contract
- ✅ Add regression coverage for the two starter examples:
  - backend architecture for a messaging app
  - storyboard for learning storytelling
- ✅ Document the temporary OpenCode transport assumption
- ✅ Document known limitations of the first release

**Files to Modify**:
- `specs/AGENT_WORKFLOWS_SPEC.md`
- `specs/README.md`
- `src/components/README.md`
- `src/agents/providers/openCodeDiagramProvider.test.ts`
- `src/components/AgentPanel.test.tsx`

**Testing Requirements**:
- Provider-level regression tests for example prompts
- UI-level tests for example preview summaries
- Documentation review to ensure setup and limitations are clear

**Verification**:
- `npx vitest run src/agents/providers/openCodeDiagramProvider.test.ts src/components/AgentPanel.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- Added provider-level regression coverage for the two built-in diagram starter prompts so the mock-backed example outputs stay stable while the live transport evolves
- Added UI-level preview assertions for the messaging-backend and storytelling-storyboard examples, including summary text and planned node/connector counts
- Documented the current generation contract, the temporary OpenCode transport boundary, and first-release limitations directly in the agent workflow spec and component docs

---

### Task 24: Add Versioned Workspace JSON Export
**Status**: ✅ Completed
**Priority**: MEDIUM
**Description**: Export the active workspace as a versioned JSON document that preserves UI structure, including grouped shapes and canvas layer order.

**Acceptance Criteria**:
- ✅ Add an export action in the app header for the active workspace
- ✅ Serialize the workspace into a dedicated `v1` export contract instead of dumping the raw Zustand payload
- ✅ Preserve group hierarchy through canonical `parentId` links and exported `childrenIds`
- ✅ Preserve layer order in the exported node list
- ✅ Exclude transient runtime-only state such as dragging, selection, text-edit mode, and audio playback
- ✅ Generate a deterministic, filesystem-safe filename

**Files Created**:
- `src/utils/workspaceExport.ts`
- `src/utils/workspaceExport.test.ts`
- `src/App.export.test.tsx`

**Files Modified**:
- `src/App.tsx`
- `src/types/index.ts`
- `src/utils/README.md`
- `src/types/README.md`
- `src/README.md`
- `PROGRESS.md`
- `specs/SPECS.md`

**Verification**:
- `npx vitest run src/utils/workspaceExport.test.ts src/App.export.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- Added a stable export contract with explicit format/version metadata to decouple downloads from internal persistence shape
- Exported group nodes now derive `childrenIds` while every node carries `parentId`, so nested grouping survives export cleanly without duplicated runtime state
- Exported node order mirrors canvas layer order and also includes `zIndex` for consumers that prefer explicit ordering metadata
- The first export slice targets JSON structure export only; PNG/SVG export remains separate work

---

### Task 25: Add Multi-Selection Canvas Interactions for Grouping
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Complete the user-facing selection workflow needed to make grouping usable: additive selection, marquee selection, and consistent group/ungroup entry points.

**Acceptance Criteria**:
- ✅ Select tool supports additive selection via `Shift + Click`
- ✅ Dragging on empty canvas with the select tool creates a marquee selection box
- ✅ Marquee selection resolves to top-level selectable entities, not raw grouped descendants
- ✅ `Shift + drag` marquee adds to the current selection
- ✅ `Shift + drag` no longer triggers panning in select mode
- ✅ Group action is available from keyboard, context menu, and inspector when selection contains 2+ distinct top-level entities
- ✅ Ungroup action is available from keyboard, context menu, and inspector when a single group is selected
- ✅ Grouping selects the newly created group
- ✅ Ungrouping selects the released children
- ✅ A combined multi-selection frame is shown for 2+ selected top-level entities
- ✅ Undo/redo preserves group and ungroup flows without partial state

**Files to Create**:
- `src/components/Canvas.selection.test.tsx`

**Files to Modify**:
- `src/App.tsx`
- `src/components/Canvas.tsx`
- `src/components/PropertiesPanel.tsx`
- `src/components/PropertiesPanel.test.tsx`
- `src/hooks/useCanvas.ts`
- `src/hooks/useCanvas.grouping.test.ts`
- `src/types/index.ts`
- `src/canvas/CanvasEngine.ts`
- `src/components/README.md`
- `src/hooks/README.md`
- `src/types/README.md`
- `src/canvas/README.md`
- `specs/MULTI_SELECTION_GROUPING_SPEC.md`
- `specs/SPECS.md`
- `specs/README.md`

**Verification**:
- `npx vitest run src/components/Canvas.selection.test.tsx src/components/Canvas.context-menu.test.tsx src/components/PropertiesPanel.test.tsx src/hooks/useCanvas.grouping.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- Added shared selection-normalization helpers so grouped children resolve to top-level selectable entities across canvas, hook, and app layers
- Added additive `Shift + Click` selection, empty-space marquee selection, additive `Shift + drag` marquee behavior, and a combined multi-select frame
- Removed the old select-mode `Shift + drag` pan behavior and aligned panning with middle-click plus `Space + drag`
- Added inspector group/ungroup affordances so the feature is discoverable without relying on shortcuts
- Preserved audio playback by toggling it only on a click release for a singly selected audio shape, so audio items remain selectable and draggable

**Related Spec**:
- `specs/MULTI_SELECTION_GROUPING_SPEC.md`

---

### Task 26: Add Selected Item Metadata to Multi-Select Inspector
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Extend the multi-select inspector so it lists the selected top-level entities with read-only type, layer index, and group hierarchy metadata, and document the current app shell in a standalone UI presentation spec.

**Acceptance Criteria**:
- ✅ Multi-select inspector shows a `Selected Items` section above `Layout`
- ✅ Section appears only when more than one top-level entity is selected
- ✅ Each row shows type, back-to-front layer index, and group hierarchy metadata
- ✅ Selected-item rows are sorted by layer index with `0 = backmost`
- ✅ Raw ids are not exposed in the inspector list
- ✅ Single-selection inspector behavior remains unchanged
- ✅ A pure helper shapes the selected-item metadata for the panel
- ✅ `MULTI_SELECTION_GROUPING_SPEC.md` documents the new inspector behavior
- ✅ A standalone app UI presentation spec documents the shell plus `Inspector` and `AgentPanel`

**Files Created**:
- `src/components/selectedInspectorItems.ts`
- `src/components/selectedInspectorItems.test.ts`
- `specs/APP_UI_PRESENTATION_SPEC.md`

**Files Modified**:
- `src/App.tsx`
- `src/components/PropertiesPanel.tsx`
- `src/components/PropertiesPanel.css`
- `src/components/PropertiesPanel.test.tsx`
- `src/components/README.md`
- `src/README.md`
- `PROGRESS.md`
- `specs/MULTI_SELECTION_GROUPING_SPEC.md`
- `specs/SPECS.md`
- `specs/README.md`

**Verification**:
- `npx vitest run src/components/selectedInspectorItems.test.ts src/components/PropertiesPanel.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- Added a pure selected-item view-model helper so the inspector can render stable type, layer, and hierarchy metadata without mixing that derivation into `App.tsx` or `PropertiesPanel.tsx`
- Layer metadata follows the runtime `shapes` array order and is displayed as `L{index}` from backmost to frontmost
- Hierarchy labels intentionally use generic group breadcrumbs such as `Group > Group`, plus `Ungrouped` and `Top level` fallbacks, instead of surfacing raw ids
- Added a dedicated UI presentation spec so shell layout and current sidepanel contents live in one reference document instead of being spread across older implementation specs

**Related Specs**:
- `specs/MULTI_SELECTION_GROUPING_SPEC.md`
- `specs/APP_UI_PRESENTATION_SPEC.md`

---

### Task 27: Redesign Agent UI as Sidebar-First Composer
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Move the agent entry out of the crowded centered modal and into a compact right-sidebar flow, while reserving a larger preview surface for rich diagram drafts.

**Acceptance Criteria**:
- ✅ Agent opens in the right-side overlay slot instead of a centered modal
- ✅ Compose state is compact and keeps the canvas visible
- ✅ Diagram setup uses progressive disclosure instead of always-on cards
- ✅ Review and selection rewrite results render inline in the sidebar
- ✅ Diagram generation opens an expanded preview sheet after draft generation
- ✅ Applying a generated diagram still works from the preview surface
- ✅ Existing review, rewrite, and diagram workflows remain functional

**Files Modified**:
- `src/App.tsx`
- `src/App.css`
- `src/components/AgentPanel.tsx`
- `src/components/AgentPanel.test.tsx`
- `src/components/README.md`
- `src/README.md`
- `PROGRESS.md`
- `specs/SPECS.md`

**Verification**:
- `npx vitest run src/components/AgentPanel.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- Reused the existing right-side overlay slot so the agent now behaves more like the inspector and less like a blocking dashboard modal
- Replaced stacked preset/example cards with compact option surfaces and moved audience/presentation details behind a setup toggle
- Kept review and rewrite previews inline so lightweight workflows do not leave the sidebar
- Moved diagram preview into a dedicated sheet so rich draft output no longer competes with compose controls in one narrow column
- Preserved grouped apply and error handling from earlier agent tasks while simplifying the surrounding UI chrome

---

### Task 28: Wire Real OpenCode HTTP Transport
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Replace the default mock-only diagram transport with a real OpenCode HTTP transport that talks to the local session/message API, while keeping deterministic fallback behavior when the server is unavailable.

**Acceptance Criteria**:
- ✅ Add a live HTTP transport for the OpenCode session/message API
- ✅ Request structured diagram output through JSON-schema response formatting
- ✅ Use the live transport by default in app runtime
- ✅ Keep deterministic mock fallback available when the server is unavailable
- ✅ Surface fallback usage as an explicit warning in generated drafts
- ✅ Avoid live-network dependence in test mode
- ✅ Document runtime setup and proxy behavior for local development

**Files Created**:
- `src/agents/openCodeHttpTransport.ts`
- `src/agents/openCodeHttpTransport.test.ts`
- `src/agents/openCodeRuntime.ts`

**Files Modified**:
- `src/agents/openCodeClient.ts`
- `src/agents/openCodeClient.test.ts`
- `src/agents/providers/openCodeDiagramProvider.ts`
- `src/agents/README.md`
- `src/README.md`
- `vite.config.ts`
- `specs/SPECS.md`
- `specs/README.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/agents/openCodeClient.test.ts src/agents/openCodeHttpTransport.test.ts src/agents/providers/openCodeDiagramProvider.test.ts src/components/AgentPanel.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- The live transport creates short-lived OpenCode sessions, prompts them for strict JSON-schema output, and deletes the session afterward so diagram generation stays stateless from the app’s point of view
- Dev mode now proxies `/api/opencode` to `http://127.0.0.1:4096`, which avoids browser CORS issues when `opencode serve` is running locally
- Test mode still uses the deterministic mock transport directly so suite runs remain fast and stable
- If the live OpenCode server is unavailable, the client falls back to the existing mock transport and prepends a warning so the user knows the draft was not generated by the live backend

---

### Task 29: Define Architecture Cleanup Boundaries And Module Map
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Document the target module map for the structural cleanup backlog before moving production code.

**Acceptance Criteria**:
- ✅ Document clear ownership boundaries for document, editor, canvas, agents, stores, app shell, and feature UI code
- ✅ Map the current oversized files to their future homes
- ✅ Confirm the dependency order for cleanup tasks 02 through 13
- ✅ Avoid runtime behavior changes while producing the documentation

**Files Created**:
- `specs/tasks/README.md`

**Files Modified**:
- `specs/tasks/01-domain-boundaries-and-module-map.md`
- `src/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- The agreed target split keeps durable board logic under `src/document/`, runtime interaction state under `src/editor/`, rendering under `src/canvas/`, and React-facing surfaces under `src/features/` and `src/app/`
- `src/types/index.ts` is now treated as a migration barrel rather than the permanent home for mixed document, editor, and geometry logic
- The new backlog index records the exact dependency order so later cleanup tasks can move code without re-inventing the structure

---

### Task 30: Split Core Types Into Focused Modules
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Split the mixed `src/types/index.ts` file into focused document, editor, and export modules without breaking existing imports.

**Acceptance Criteria**:
- ✅ Create focused modules for document, editor, and export contracts
- ✅ Keep `src/types/index.ts` as a compatibility barrel during the migration
- ✅ Avoid circular type dependencies
- ✅ Keep the app green after the split
- ✅ Add focused import/barrel verification where coverage was missing

**Files Created**:
- `src/types/document.ts`
- `src/types/editor.ts`
- `src/types/export.ts`
- `src/types/index.test.ts`

**Files Modified**:
- `src/types/index.ts`
- `src/types/README.md`
- `src/README.md`
- `specs/tasks/02-split-core-types.md`
- `specs/tasks/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/types/index.test.ts src/utils/workspaceExport.test.ts src/components/selectedInspectorItems.test.ts`
- `npm run lint`
- `npm run build`
- `npx vitest run`

**Notes**:
- Runtime imports from `../types` and `./types` remain intact because `src/types/index.ts` now re-exports the focused modules
- Geometry, grouping, and selection helpers intentionally remain in the compatibility barrel so Task 03 can extract them in one focused move
- The split reduced the mixed-contract load in `src/types/index.ts` without changing the shape schema

---

### Task 31: Extract Geometry And Selection Helpers
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Move geometry, hit-testing, grouping traversal, and selection helpers out of `src/types/index.ts` into focused helper modules without changing selection behavior.

**Acceptance Criteria**:
- ✅ Move geometry helpers into a focused module
- ✅ Move hit-testing into a focused module
- ✅ Move selection and grouping traversal helpers into a focused module
- ✅ Keep grouped and ungrouped selection behavior unchanged
- ✅ Add focused unit coverage for the extracted helpers

**Files Created**:
- `src/types/geometry.ts`
- `src/types/hitTesting.ts`
- `src/types/selection.ts`
- `src/types/geometry.test.ts`
- `src/types/hitTesting.test.ts`
- `src/types/selection.test.ts`

**Files Modified**:
- `src/types/index.ts`
- `src/types/README.md`
- `src/App.tsx`
- `src/components/Canvas.tsx`
- `src/hooks/useCanvas.ts`
- `src/README.md`
- `specs/tasks/03-extract-geometry-and-selection-helpers.md`
- `specs/tasks/README.md`
- `specs/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/types/index.test.ts src/types/geometry.test.ts src/types/hitTesting.test.ts src/types/selection.test.ts`
- `npm run lint`
- `npm run build`
- `npx vitest run`

**Notes**:
- `src/types/index.ts` remains the compatibility barrel so existing imports continue to work
- `App.tsx`, `Canvas.tsx`, and `useCanvas.ts` now import geometry, hit-testing, and selection helpers from their dedicated modules
- The extracted selection tests explicitly lock the current group-bounds behavior, including the expectation that nested groups maintain their own bounds

---

### Task 32: Single Canvas Engine Owner
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Remove duplicate `CanvasEngine` ownership so one mounted canvas surface owns one rendering engine and one transform path.

**Acceptance Criteria**:
- ✅ Only one `CanvasEngine` instance is created for the active canvas surface
- ✅ Render, resize, and coordinate transforms behave the same after the ownership cleanup
- ✅ Existing canvas rendering and interaction tests remain green
- ✅ Focused regression coverage locks the single-owner boundary

**Files Created**:
- `src/components/Canvas.engine-owner.test.tsx`

**Files Modified**:
- `src/canvas/CanvasEngine.ts`
- `src/components/Canvas.tsx`
- `src/components/Canvas.context-menu.test.tsx`
- `src/components/Canvas.embed-resize.test.tsx`
- `src/components/Canvas.selection.test.tsx`
- `src/components/Canvas.text-editing.test.tsx`
- `src/hooks/useCanvas.ts`
- `src/App.tsx`
- `src/canvas/README.md`
- `src/components/README.md`
- `src/hooks/README.md`
- `src/README.md`
- `specs/tasks/04-single-canvas-engine-owner.md`
- `specs/tasks/README.md`
- `specs/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/components/Canvas.selection.test.tsx src/components/Canvas.context-menu.test.tsx src/components/Canvas.embed-resize.test.tsx src/components/Canvas.text-editing.test.tsx src/components/Canvas.engine-owner.test.tsx src/App.export.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- `Canvas.tsx` now owns the only live `CanvasEngine` instance and uses it for render, resize, and transform work
- `useCanvas` remains the document/editor state coordinator and no longer constructs or resizes render objects
- `CanvasEngine.ts` now exports pure transform helpers so parent surfaces like `App.tsx` can reuse the same camera math without creating another engine

---

### Task 33: Document Command Layer
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Extract pure document mutation commands so board changes no longer live inline across `App.tsx` and `useCanvas.ts`.

**Acceptance Criteria**:
- ✅ A dedicated command layer exists for document mutations
- ✅ Board mutation logic is removed from `App.tsx`
- ✅ Document commands are unit tested without requiring component rendering
- ✅ Undo and redo still work across extracted command paths

**Files Created**:
- `src/document/commands.ts`
- `src/document/commands.test.ts`
- `src/document/README.md`
- `src/hooks/useCanvas.layout.test.ts`

**Files Modified**:
- `src/App.tsx`
- `src/App.export.test.tsx`
- `src/hooks/useCanvas.ts`
- `src/hooks/README.md`
- `src/README.md`
- `specs/tasks/05-document-command-layer.md`
- `specs/tasks/README.md`
- `specs/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/document/commands.test.ts src/hooks/useCanvas.layout.test.ts src/hooks/useCanvas.grouping.test.ts src/hooks/useCanvas.generation.test.ts src/hooks/useCanvas.mutation.test.ts src/App.export.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- The new document command layer now owns shape CRUD, grouping, reordering, align/distribute/tidy, and proposal-to-shape application helpers
- `useCanvas` remains the history/persistence coordinator and wraps those pure commands with validation plus undo bookkeeping
- Group-aware layout actions still follow the current top-level group-bounds behavior; that caveat is recorded for the later group-model cleanup

---

### Task 34: Split Canvas Interaction Surface
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Break `Canvas.tsx` into smaller interaction slices without changing the user-facing canvas behavior.

**Acceptance Criteria**:
- [x] `Canvas.tsx` is reduced to a composition surface instead of a monolith.
- [x] Extracted interaction pieces have clear ownership and names.
- [x] Effect-heavy engine/render/context-menu coordination is simplified before extraction.
- [x] Existing component and interaction tests still pass.
- [x] Missing coverage is added for any extracted interaction path that was previously implicit.

**Files Created**:
- `src/components/CanvasSelectionOverlays.tsx`
- `src/components/CanvasTextEditor.tsx`
- `src/components/CanvasContextMenu.tsx`
- `src/components/CanvasEmbedOverlays.tsx`

**Files Modified**:
- `src/components/Canvas.tsx`
- `src/components/Canvas.selection.test.tsx`
- `src/components/Canvas.text-editing.test.tsx`
- `src/components/Canvas.context-menu.test.tsx`
- `src/components/Canvas.embed-resize.test.tsx`
- `src/components/Canvas.engine-owner.test.tsx`
- `src/components/README.md`
- `specs/tasks/06-canvas-interaction-split.md`
- `specs/tasks/README.md`
- `specs/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/components/Canvas.context-menu.test.tsx src/components/Canvas.text-editing.test.tsx src/components/Canvas.selection.test.tsx src/components/Canvas.embed-resize.test.tsx src/components/Canvas.engine-owner.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- `Canvas.tsx` now stays focused on the stage-level pointer/session coordinator, engine ownership, and render loop while the overlay shells live in dedicated component files.
- The extracted surfaces keep the existing user-facing behavior stable while making the canvas tree easier to navigate and test directly.

---

### Task 35: Text Style Source of Truth
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Make text typography come from one canonical model instead of being duplicated across root text fields and `shape.style`.

**Acceptance Criteria**:
- ✅ One canonical text-style representation is chosen and documented.
- ✅ Render, textarea overlay, style updates, and export all use that same source.
- ✅ Existing text-editing and inspector tests still pass.
- ✅ Compatibility logic for persisted workspaces is covered by tests.

**Files Created**:
- `src/document/textStyle.ts`
- `src/document/textStyle.test.ts`
- `src/hooks/useCanvas.text-style.test.ts`

**Files Modified**:
- `src/types/document.ts`
- `src/document/commands.ts`
- `src/document/commands.test.ts`
- `src/hooks/useCanvas.ts`
- `src/components/Canvas.tsx`
- `src/components/Canvas.text-editing.test.tsx`
- `src/canvas/CanvasEngine.ts`
- `src/canvas/CanvasEngine.test.ts`
- `src/utils/workspaceExport.ts`
- `src/utils/workspaceExport.test.ts`
- `src/document/README.md`
- `src/hooks/README.md`
- `src/components/README.md`
- `src/canvas/README.md`
- `src/utils/README.md`
- `src/types/README.md`
- `src/README.md`
- `specs/tasks/07-text-style-source-of-truth.md`
- `specs/tasks/README.md`
- `specs/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/document/textStyle.test.ts src/document/commands.test.ts src/hooks/useCanvas.text-style.test.ts src/utils/workspaceExport.test.ts src/components/Canvas.text-editing.test.tsx src/canvas/CanvasEngine.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- `TextShape` typography is now the canonical runtime source, while typography inside `style` remains a compatibility mirror during migration.
- `useCanvas` now normalizes loaded shapes so legacy persisted text nodes still render, edit, and export correctly without a manual workspace migration step.
- Inspector-style updates and agent mutation style changes now keep text typography fields and the compatibility mirror aligned.

---

### Task 36: Selection-Driven Inspector Model
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Move inspector derivation behind a dedicated feature model so single-selection values come from the selected shapes, multi-selection can preserve shared values, and the panel stops behaving like a tool-default editor.

**Acceptance Criteria**:
- ✅ A dedicated selection-driven inspector model exists under `src/features/inspector/model/`
- ✅ Single-selection inspector props come from the selected shape instead of only editor defaults
- ✅ Selected-item metadata now lives beside the rest of the inspector model code
- [x] Mixed values are surfaced explicitly in the panel where needed
- [x] The no-selection `defaults` mode is either surfaced intentionally in UI or documented as model-only behavior

**Files Created**:
- `src/features/README.md`
- `src/features/inspector/model/selectionInspectorModel.ts`
- `src/features/inspector/model/selectionInspectorModel.test.ts`
- `src/features/inspector/model/selectedInspectorItems.ts`
- `src/features/inspector/model/selectedInspectorItems.test.ts`
- `src/App.inspector.test.tsx`

**Files Modified**:
- `src/App.tsx`
- `src/app/useAppShellState.ts`
- `src/components/PropertiesPanel.tsx`
- `src/components/PropertiesPanel.css`
- `src/components/PropertiesPanel.test.tsx`
- `src/components/README.md`
- `src/README.md`
- `specs/tasks/08-selection-driven-inspector-model.md`
- `specs/tasks/README.md`
- `specs/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/features/inspector/model/selectionInspectorModel.test.ts src/features/inspector/model/selectedInspectorItems.test.ts src/App.inspector.test.tsx src/components/PropertiesPanel.test.tsx src/App.export.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- The app layer now builds one `inspectorModel` value and passes that prepared data into `PropertiesPanel` instead of deriving the same state inline.
- The selected-item helper moved out of `src/components/` and into `src/features/inspector/model/`, matching the cleanup backlog ownership rules.
- `PropertiesPanel` now uses `mixedStyleKeys` to surface explicit mixed-state affordances through section metadata, disabled select placeholders, mixed value labels, and slider aria text.
- The model supports a no-selection `defaults` mode now, and the current shell behavior of hiding the inspector with no selection is explicitly documented as intentional model-only behavior.

---

### Task 37: Persisted Versus Runtime Workspace State
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Separate durable workspace persistence from transient editor/session state so reloads restore the board without reviving in-progress drag, draw, text-edit, or audio-playback sessions.

**Acceptance Criteria**:
- ✅ Durable and transient workspace state are separated and documented.
- ✅ Persisted storage excludes runtime-only editor flags.
- ✅ Existing workspaces load safely after the boundary change.
- ✅ Store and hook tests cover defaulting plus backwards compatibility.

**Files Created**:
- `src/stores/workspaceStore.test.ts`
- `src/hooks/useCanvas.runtime-state.test.ts`

**Files Modified**:
- `src/types/editor.ts`
- `src/stores/workspaceStore.ts`
- `src/hooks/useCanvas.ts`
- `src/components/WorkspaceTabs.test.tsx`
- `src/components/WorkspaceTab.test.tsx`
- `src/utils/workspaceExport.test.ts`
- `src/stores/README.md`
- `src/hooks/README.md`
- `src/types/README.md`
- `src/README.md`
- `specs/tasks/09-persisted-vs-runtime-workspace-state.md`
- `specs/tasks/README.md`
- `specs/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/stores/workspaceStore.test.ts src/hooks/useCanvas.runtime-state.test.ts src/components/WorkspaceTabs.test.tsx src/components/WorkspaceTab.test.tsx src/utils/workspaceExport.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- Added `PersistedEditorState` and `EditorRuntimeState` so the persistence boundary is explicit in the editor type contracts.
- `workspaceStore` now strips runtime-only editor flags and audio playback state both when persisting and when merging older localStorage snapshots.
- `useCanvas` now recreates runtime editor defaults on load instead of trusting persisted drag/draw/text-edit session flags.
- The store is now closer to its intended durable-snapshot role, but `useCanvas` still combines history, runtime editor state, and persistence orchestration even after the app-shell extraction.

---

### Task 38: Single Source Group Model
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Remove duplicated runtime group relationship state so live grouping is driven by one canonical model and every other view derives from it.

**Acceptance Criteria**:
- ✅ The canonical group relationship model is documented.
- ✅ Redundant relationship state is removed or clearly derived.
- ✅ Grouping, ungrouping, deletion, and layer-order tests still pass.
- ✅ Nested group behavior remains unchanged for users.

**Files Modified**:
- `src/types/document.ts`
- `src/types/selection.ts`
- `src/document/commands.ts`
- `src/canvas/CanvasEngine.ts`
- `src/components/Canvas.tsx`
- `src/utils/workspaceExport.ts`
- `src/canvas/CanvasEngine.test.ts`
- `src/hooks/useCanvas.grouping.test.ts`
- `src/types/selection.test.ts`
- `src/utils/workspaceExport.test.ts`
- `src/components/Canvas.context-menu.test.tsx`
- `src/features/inspector/model/selectedInspectorItems.test.ts`
- `src/features/inspector/model/selectionInspectorModel.test.ts`
- `src/types/README.md`
- `src/document/README.md`
- `src/canvas/README.md`
- `src/components/README.md`
- `src/utils/README.md`
- `src/README.md`
- `specs/tasks/10-single-source-group-model.md`
- `specs/tasks/README.md`
- `specs/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/document/commands.test.ts src/hooks/useCanvas.grouping.test.ts src/types/selection.test.ts src/utils/workspaceExport.test.ts src/canvas/CanvasEngine.test.ts src/components/Canvas.context-menu.test.tsx src/features/inspector/model/selectedInspectorItems.test.ts src/features/inspector/model/selectionInspectorModel.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- Runtime `GroupShape` membership is now canonical through child `parentId` links instead of duplicated `childrenIds` arrays on group nodes.
- `selection.ts` now exposes `getGroupChildIds()` so command, render, and export callers can derive ordered child ids from the same source of truth.
- Canvas group labels still show child counts and exports still include `childrenIds`, but both are now derived at the boundary rather than synchronized manually in document state.

---

### Task 39: Atomic Workspace Save and History
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Make workspace persistence atomic and clarify history boundaries between document edits, editor updates, and workspace switching.

**Acceptance Criteria**:
- ✅ Shapes and durable editor state save through one coordinated flow.
- ✅ Separate autosave race windows are removed.
- ✅ Workspace-switching and history behavior are documented and tested.
- ✅ Regression tests cover at least one shape update plus one editor-state update in the same save cycle.

**Files Created**:
- `src/hooks/useCanvas.persistence.test.ts`

**Files Modified**:
- `src/hooks/useCanvas.ts`
- `src/stores/workspaceStore.ts`
- `src/hooks/useCanvas.runtime-state.test.ts`
- `src/hooks/useCanvas.generation.test.ts`
- `src/hooks/useCanvas.grouping.test.ts`
- `src/hooks/useCanvas.layout.test.ts`
- `src/hooks/useCanvas.mutation.test.ts`
- `src/hooks/useCanvas.text-style.test.ts`
- `src/stores/workspaceStore.test.ts`
- `src/App.export.test.tsx`
- `src/App.inspector.test.tsx`
- `src/hooks/README.md`
- `src/stores/README.md`
- `src/README.md`
- `specs/tasks/11-atomic-workspace-save-and-history.md`
- `specs/tasks/README.md`
- `specs/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/hooks/useCanvas.persistence.test.ts src/hooks/useCanvas.runtime-state.test.ts src/stores/workspaceStore.test.ts src/hooks/useCanvas.layout.test.ts src/hooks/useCanvas.mutation.test.ts src/hooks/useCanvas.generation.test.ts src/hooks/useCanvas.grouping.test.ts src/hooks/useCanvas.text-style.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- `workspaceStore` now exposes one `saveWorkspaceSnapshot()` method that writes shapes and durable editor state together.
- `useCanvas` now debounces one coordinated snapshot save instead of separate shape/state effects.
- Switching workspaces now clears undo/redo history as the new workspace loads, and persistence waits until that load completes before saving again.

---

### Task 40: Agent Document Application Boundary
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Separate agent proposal validation, adaptation, and document application from `useCanvas`.

**Acceptance Criteria**:
- ✅ Proposal validation and proposal application have separate ownership.
- ✅ Agent apply logic no longer lives directly in `useCanvas`.
- ✅ Existing agent tests still pass after the move.
- ✅ Focused tests cover proposal-to-command adaptation where coverage is missing.

**Files Created**:
- `src/agents/documentApplication.ts`
- `src/agents/documentApplication.test.ts`

**Files Modified**:
- `src/hooks/useCanvas.ts`
- `src/agents/README.md`
- `src/hooks/README.md`
- `src/document/README.md`
- `src/README.md`
- `specs/tasks/12-agent-document-application-boundary.md`
- `specs/tasks/README.md`
- `specs/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/agents/documentApplication.test.ts src/agents/agentOrchestrator.test.ts src/document/commands.test.ts src/hooks/useCanvas.generation.test.ts src/hooks/useCanvas.mutation.test.ts src/components/AgentPanel.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- Validation remains in the orchestrator layer, while `documentApplication.ts` now owns proposal-to-command adaptation and application.
- `useCanvas` still exposes the apply callbacks used by the app layer, but it no longer chooses validation rules or document apply helpers itself.
- Focused adapter tests now cover the validation-plus-application boundary directly instead of relying only on hook coverage.

---

### Task 41: App Shell Composition
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Reduce `App.tsx` to a thin root wiring layer by moving shell composition and app-level callback preparation into a dedicated app layer.

**Acceptance Criteria**:
- ✅ `App.tsx` is primarily composition and high-level wiring.
- ✅ Shell-specific derivation logic moved into focused app helpers.
- ✅ Existing shell behavior remained unchanged.
- ✅ Coverage was updated around the new app boundary.

**Files Created**:
- `src/app/AppShell.tsx`
- `src/app/useAppShellState.ts`
- `src/app/useAppShellState.test.tsx`
- `src/app/useAppWorkspace.ts`
- `src/app/README.md`

**Files Modified**:
- `src/App.tsx`
- `src/App.export.test.tsx`
- `src/App.inspector.test.tsx`
- `src/README.md`
- `src/hooks/README.md`
- `specs/APP_UI_PRESENTATION_SPEC.md`
- `specs/tasks/13-app-shell-composition.md`
- `specs/tasks/README.md`
- `specs/README.md`
- `specs/SPECS.md`
- `PROGRESS.md`

**Verification**:
- `npx vitest run src/App.export.test.tsx src/App.inspector.test.tsx src/app/useAppShellState.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Notes**:
- `App.tsx` now just wires the workspace store, `useCanvas`, keyboard shortcuts, and agent orchestrator into the extracted app layer.
- `src/app/useAppWorkspace.ts` keeps the first-workspace boot flow explicit without leaving that bootstrap logic in the root component.
- `src/app/useAppShellState.ts` now owns shell-level dialog toggles, export wiring, inspector-model consumption, workspace-tab actions, and right-rail state.
- `src/app/AppShell.tsx` is the declarative shell composition surface for the floating header, canvas stage, rail panels, and dialogs.

---

### Task 42: Split Canvas Interaction Controller
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: `src/components/Canvas.tsx` still owns engine mounting, rendering, pointer sessions, pan/zoom, marquee selection, drag updates, resize handles, text editing, context menus, and audio playback in one component.

**Why This Matters**:
- The component has many mutable refs for independent interaction modes, making new canvas behavior easy to regress.
- Text auto-grow reaches through `CanvasEngine` with a private `ctx` cast, weakening the renderer boundary.
- Pointer handlers mix DOM event concerns with pure document/session logic that should be directly testable.

**Acceptance Criteria**:
- Extract pointer/session logic into focused canvas feature modules, such as `src/features/canvas/useCanvasInteractions.ts` and pure helpers for drag, resize, marquee, and text measurement.
- Keep `Canvas.tsx` focused on engine lifecycle, render scheduling, and overlay composition.
- Replace the private `CanvasEngine` context cast used for text measuring with a public measurement helper or pure canvas-text utility.
- Preserve behavior for select, drag, marquee, resize, pan, wheel zoom, text edit, context menu, and audio click/toggle flows.
- Add focused unit tests for extracted pure helpers and update component tests for the high-risk interaction paths.

**Files to Inspect/Modify**:
- `src/components/Canvas.tsx`
- `src/features/canvas/`
- `src/canvas/CanvasEngine.ts`
- `src/components/Canvas.engine-owner.test.tsx`
- `src/components/Canvas.selection.test.tsx`
- `src/components/Canvas.text-editing.test.tsx`
- `src/components/Canvas.embed-resize.test.tsx`
- `src/components/README.md`
- `src/features/README.md`

**Verification**:
- `npx vitest run src/components/Canvas.engine-owner.test.tsx src/components/Canvas.selection.test.tsx src/components/Canvas.text-editing.test.tsx src/components/Canvas.embed-resize.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Completed 2026-05-07**:
- Extracted canvas interaction state and handlers into `src/features/canvas/useCanvasInteractions.ts`.
- Added pure drag, resize, and text-measurement helpers with direct unit coverage.
- Added `CanvasEngine.measureTextWidth()` and moved text auto-grow off the private renderer context cast.
- Updated component, feature, and canvas documentation for the new ownership boundary.

---

### Task 43: Split Canvas Renderer, Export, And Geometry Utilities
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: `src/canvas/CanvasEngine.ts` mixes image caching, raster export, SVG serialization, render-time drawing, shape bounds, arrowhead math, grid drawing, and shape factory creation.

**Why This Matters**:
- Export logic and live rendering currently change in the same file, increasing risk for unrelated regressions.
- Bounds and arrowhead calculations are duplicated between export helpers and live renderer methods.
- Shape construction belongs outside the renderer so document rules remain testable without canvas APIs.

**Acceptance Criteria**:
- Move export/download/SVG serialization into focused modules such as `src/canvas/export.ts` and `src/canvas/svgExport.ts`.
- Move reusable bounds, arrowhead, and draw-preview shape factory helpers into pure document/canvas utility modules.
- Keep `CanvasEngine` centered on live canvas rendering and coordinate transforms.
- Reuse one source of truth for bounds and arrowhead geometry in both SVG export and live drawing.
- Preserve current PNG/SVG export behavior, including all/selected/group descendants and viewport export.
- Add direct tests around the new export and geometry helper boundaries.

**Files to Inspect/Modify**:
- `src/canvas/CanvasEngine.ts`
- `src/canvas/CanvasEngine.export.test.ts`
- `src/canvas/CanvasEngine.test.ts`
- `src/types/geometry.ts`
- `src/document/commands.ts`
- `src/canvas/README.md`
- `src/document/README.md`

**Verification**:
- `npx vitest run src/canvas/CanvasEngine.export.test.ts src/canvas/CanvasEngine.test.ts src/canvas/geometry.test.ts src/canvas/shapeFactory.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Completed 2026-05-08**:
- Moved PNG/SVG export orchestration and download helpers into `src/canvas/export.ts`.
- Added `src/canvas/geometry.ts` for shared bounds, resize-handle, and arrowhead geometry used by live rendering and SVG export.
- Added `src/canvas/shapeFactory.ts` for pure drag-point shape construction while keeping the `CanvasEngine` method as a compatibility delegate.
- Updated app export wiring, focused export/geometry/factory tests, and canvas/document documentation.

---

### Task 44: Harden Workspace Persistence Hydration
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Workspace persistence currently normalizes some editor state and audio runtime flags, but hydrated localStorage data is still treated as a broadly trusted partial snapshot.

**Why This Matters**:
- Corrupt or older localStorage records can introduce invalid camera values, bad selected ids, malformed shapes, or impossible active workspace ids.
- Store actions log warnings but do not expose structured failure results for storage or validation failures.
- Future import/export and agent-generated data will benefit from the same validation boundary.

**Acceptance Criteria**:
- Add pure validation/normalization for persisted workspace snapshots, including workspace arrays, active workspace id, finite camera values, selected ids that exist, shape timestamps, and shape style defaults.
- Strip or repair invalid runtime-only fields at hydration and save boundaries.
- Return structured success/failure information from persistence-sensitive operations where callers need feedback.
- Add regression tests for malformed persisted snapshots, invalid active ids, invalid camera zoom, stale selected ids, malformed shapes, and audio `isPlaying` reset.
- Document storage limits and validation behavior in the store README.

**Files to Inspect/Modify**:
- `src/stores/workspaceStore.ts`
- `src/stores/workspaceStore.test.ts`
- `src/types/document.ts`
- `src/document/textStyle.ts`
- `src/stores/README.md`

**Verification**:
- `npx vitest run src/stores/workspaceStore.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Completed 2026-05-08**:
- Added structured workspace persistence validation for hydrated store payloads and per-workspace snapshots.
- Normalized active workspace ids, finite camera values, selected ids, shape styles, shape timestamps, parent ids, and runtime-only audio playback state at hydration/save boundaries.
- Updated `saveWorkspaceSnapshot()` to return structured success/failure metadata without mutating missing workspaces.
- Added regression coverage for malformed persisted snapshots, invalid active ids, invalid camera zoom, stale selected ids, malformed shapes, style defaults, timestamps, and audio playback reset.
- Documented persistence validation behavior and storage constraints in `src/stores/README.md`.

---

### Task 45: Extract Agent Panel Workflow Controller
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: `src/components/AgentPanel.tsx` owns four workflow UIs, workflow-specific preview derivation, async run/apply state, diagram preview modal markup, and cleanup selection state in one component.

**Why This Matters**:
- Async agent results can become stale if the user changes workflow, closes the panel, or starts another run before a provider resolves.
- Workflow-specific rendering is large enough that changes to one workflow can accidentally affect others.
- Preview derivation is mixed with JSX, making it harder to test without rendering the full panel.

**Acceptance Criteria**:
- Move run/apply/status handling into a `useAgentPanelController` hook or equivalent controller module.
- Add stale-run protection with a request id, abort signal, or explicit ignore-on-close/workflow-change behavior.
- Split review, cleanup, rewrite, and diagram preview rendering into focused components.
- Move preview derivation helpers into pure functions with direct tests.
- Preserve current panel behavior and apply flows.

**Files to Inspect/Modify**:
- `src/components/AgentPanel.tsx`
- `src/components/AgentPanel.test.tsx`
- `src/agents/agentOrchestrator.ts`
- `src/agents/README.md`
- `src/components/README.md`

**Verification**:
- `npx vitest run src/components/AgentPanel.test.tsx src/agents/agentOrchestrator.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Completed 2026-05-10**:
- Extracted AgentPanel workflow state, run/apply handling, cleanup selection state, and stale async request guards into `useAgentPanelController`.
- Split review, cleanup, rewrite, and expanded diagram previews into focused `agent-panel` components while preserving the existing panel behavior.
- Moved prompt, scope, grouped finding, cleanup, rewrite, and generation preview derivation into pure model helpers with direct unit coverage.
- Added a regression test proving late review results are ignored after switching workflows before the provider resolves.
- Updated component and agent documentation for the new controller/model boundary and request invalidation behavior.

---

### Task 46: Split Inspector Panel Into Section Components
**Status**: ✅ Completed
**Priority**: MEDIUM
**Description**: `src/components/PropertiesPanel.tsx` contains layout editing, collapsible state, floating color picker positioning, color/fill controls, stroke controls, typography controls, mixed-value UI, and shadow editing in one file.

**Why This Matters**:
- The inspector is hard to review because local state, derived style flags, portal positioning, and JSX sections are tightly interleaved.
- Adding a new style control requires touching a very large component and increases accessibility regression risk.
- Shadow and color picker behaviors need smaller direct tests than the full panel can provide.

**Acceptance Criteria**:
- Extract section components for selected items, layout, style, type, color, and effects.
- Extract floating picker positioning and outside-click handling into a hook.
- Keep mixed-value derivation centralized and covered by tests.
- Preserve keyboard, blur/commit, Escape, mixed-value, shadow, and gradient behavior.
- Update component documentation with the new section ownership.

**Files to Inspect/Modify**:
- `src/components/PropertiesPanel.tsx`
- `src/components/PropertiesPanel.test.tsx`
- `src/components/ColorPicker.tsx`
- `src/features/inspector/model/`
- `src/components/README.md`

**Verification**:
- `npx vitest run src/components/PropertiesPanel.test.tsx src/components/ColorPicker.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Completed 2026-05-09**:
- Slimmed `src/components/PropertiesPanel.tsx` to inspector orchestration, layout draft state, picker portal rendering, and section composition.
- Added `src/components/properties-panel/PropertiesPanelSections.tsx` for selected items, layout, style, type, color, and effects section components.
- Added `src/components/properties-panel/useFloatingColorPicker.ts` for portal host detection, anchored positioning, resize/scroll updates, outside-click dismissal, and Escape dismissal.
- Added `src/features/inspector/model/inspectorMixedValues.ts` so mixed-value flags are centralized and directly tested.
- Added focused tests for the floating picker hook and mixed-value model while preserving the existing `PropertiesPanel` behavior coverage.
- Updated component and feature documentation with the new inspector ownership boundaries.

---

### Task 47: Remove Color Picker Hook Rule Disable
**Status**: ✅ Completed
**Priority**: MEDIUM
**Description**: `src/components/ColorPicker.tsx` disables `react-hooks/set-state-in-effect` to synchronize external color props into local HSL/hex/alpha state.

**Why This Matters**:
- The disable hides a React Hooks rule violation in production component code.
- The picker has several related local values that would be safer as one reducer-driven state object.
- Color synchronization is subtle and should be testable without relying on a lint exception.

**Acceptance Criteria**:
- Remove the `react-hooks/set-state-in-effect` disable.
- Replace effect-driven multi-state synchronization with a reducer, keyed remount, derived state, or another rule-compliant pattern.
- Preserve controlled color, alpha, gradient stop, format menu, pointer drag, and text input behavior.
- Add regression tests for external color prop changes, alpha prop changes, gradient stop editing, and invalid hex input recovery.

**Files to Inspect/Modify**:
- `src/components/ColorPicker.tsx`
- `src/components/ColorPicker.test.tsx`
- `src/components/README.md`

**Verification**:
- `npx vitest run src/components/ColorPicker.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Completed 2026-05-11**:
- Removed the `react-hooks/set-state-in-effect` disable from `ColorPicker`.
- Replaced effect-driven HSL/hex/alpha synchronization with reducer-backed draft state that derives cleanly from controlled color, alpha, and active gradient stop inputs.
- Preserved local input responsiveness for hex, HSL/RGBA controls, alpha edits, gradient stop edits, and pointer-driven color changes.
- Added regression coverage for external color changes, external alpha changes, active gradient stop synchronization, and invalid hex input recovery.
- Updated component documentation for the reducer-backed synchronization behavior.

---

### Task 48: Extract App Shell Action Factories
**Status**: ✅ Completed
**Priority**: MEDIUM
**Description**: `src/app/useAppShellState.ts` still prepares workspace actions, export actions, media insertion shape factories, inspector actions, canvas props, zoom props, agent props, and keyboard bindings in one hook.

**Why This Matters**:
- The hook is better than the old root component, but it is still a broad app-layer coordinator with several unrelated reasons to change.
- Image/audio/embed insertion creates document shapes inline instead of using reusable factories.
- Export wiring, workspace tab wiring, and selection actions can be tested more directly if split.

**Acceptance Criteria**:
- Extract export action preparation, media insertion, selection/layout actions, workspace tab actions, and agent panel props into focused hooks or pure factories.
- Add reusable shape factories for image, audio, embed, and text creation where appropriate.
- Keep `useAppShellState` as a thin composition layer that assembles the extracted results.
- Preserve existing app-shell tests and add focused tests for the new factories/hooks.

**Files to Inspect/Modify**:
- `src/app/useAppShellState.ts`
- `src/app/useAppShellState.test.tsx`
- `src/document/`
- `src/app/README.md`
- `src/document/README.md`

**Verification**:
- `npx vitest run src/app/useAppShellState.test.tsx`
- `npx vitest run`
- `npm run lint`
- `npm run build`

**Completed 2026-05-11**:
- Extracted app-shell export, media insertion, workspace tab, selection/layout, and agent panel wiring into `useAppShellActionGroups`.
- Kept `useAppShellState` focused on shell state composition, inspector derivation, dialog state, keyboard bindings, and final `AppShellProps` assembly.
- Added reusable document shape factories for image, audio, embed, and text insertion.
- Added focused tests for group-aware export selection, agent panel prop creation, workspace-limit guarding, viewport-centered media insertion, and document shape factories.
- Updated app and document documentation with the new ownership boundaries.

---

### Task 49: Add Code Complexity Guardrails
**Status**: ✅ Completed
**Priority**: LOW
**Description**: Several modules have grown past the point where line count and mixed responsibilities are warning signs, but the repo has no automated guardrail to catch the next oversized component or hook.

**Why This Matters**:
- The same files can grow again after refactors unless the repo makes module size and architectural boundaries visible.
- Lightweight checks can nudge future work toward feature modules without blocking normal iteration too aggressively.

**Acceptance Criteria**:
- Add a documented script or lint-style check that reports oversized source files, large React components, or disabled lint rules.
- Keep thresholds advisory at first unless the team decides to enforce them.
- Document expected exceptions and how to split files when a warning appears.
- Add the check to documentation and optionally to CI/package scripts.

**Files to Inspect/Modify**:
- `package.json`
- `eslint.config.js`
- `src/README.md`
- `specs/README.md`

**Verification**:
- `npm run complexity`
- `npm run ast-grep`
- `npm run ast-grep:test`
- `npm run lint`
- `npm run build`
- `npx vitest run`

**Completed 2026-05-11**:
- Added `npm run complexity` and `npm run complexity:strict` for an advisory project complexity report.
- Added reporting for oversized source files, hook files, large React components, custom hook simplicity, and disabled lint directives.
- Added advisory ESLint hook guardrails for function length and cyclomatic complexity in hook source files.
- Documented the hook simplicity rule and expected exceptions in `src/README.md` and added the guardrail step to `specs/README.md`.
- Added Vitest coverage for the complexity report analyzer and formatter.
- Added ast-grep validation support with `sgconfig.yml`, `npm run ast-grep`, `npm run ast-grep:test`, and a tested hook rule that flags inline durable shape literals in hook files.

---

### Task 50: Strengthen Core Canvas Test Suite
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Add focused regression coverage for the canvas app's core user flows so future refactors catch shortcut, document-state, camera, and pointer interaction regressions early.

**Why This Matters**:
- The app already has many focused model/component tests, but the central user flows still need durable coverage at the hook and component interaction boundaries.
- Keyboard shortcuts are global and easy to regress when tool mappings or grouping behavior change.
- Camera operations and history boundaries are core editor contracts that should not rely only on indirect UI coverage.

**Acceptance Criteria**:
- Cover global keyboard shortcuts, modifier routing, text-entry guards, preventDefault behavior, and unmount cleanup.
- Cover app-level tool selection so keyboard shortcuts and toolbar clicks update the active toolbar button and canvas tool.
- Cover keyboard-driven grouping so `Ctrl+G` creates a group from selected items and `Ctrl+Shift+G` ungroups it.
- Cover `useCanvas` core CRUD/history, selection deletion, camera pan/zoom, pointer-anchored zoom, zoom clamping, and selected/default style updates.
- Cover canvas pointer workflows for text insertion, tiny-draw rejection, pencil commit, eraser topmost delete, and Space-drag panning.
- Update testing and feature documentation with the new coverage map.
- Run focused tests, full Vitest, lint, and build.

**Files Modified**:
- `src/hooks/useKeyboard.test.tsx`
- `src/App.tool-selection.test.tsx`
- `src/hooks/useCanvas.core.test.ts`
- `src/hooks/useCanvas.grouping.test.ts`
- `src/components/Canvas.core-interactions.test.tsx`
- `src/hooks/README.md`
- `src/components/README.md`
- `src/test/README.md`
- `specs/SPECS.md`

**Verification**:
- `npx vitest run src/hooks/useKeyboard.test.tsx src/hooks/useCanvas.core.test.ts src/components/Canvas.core-interactions.test.tsx`
- `npx vitest run src/App.tool-selection.test.tsx`
- `npx vitest run src/hooks/useCanvas.grouping.test.ts`
- `npx vitest run`
- `npm run lint`
- `npm run build`

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
