# Specifications & Active Tasks

This file contains active tasks that need to be implemented. Tasks are marked with status and priority.

## Active Tasks

## Recent Updates

- 2026-04-21: Replaced split workspace auto-save timers with one debounced atomic snapshot write, added `updateWorkspaceSnapshot`, and locked the new persistence behavior in with hook/store regression tests.
- 2026-04-21: Added store-backed workspace-name validation with trimming, 50-character limits, inline tab feedback, and regression coverage for both store and overflow rename flows.
- 2026-04-21: Closed out the workspace-tab truncation and long-press menu workflow, added feature docs, and documented the architecture rule that treats broad `useEffect` orchestration as an anti-pattern.
- 2026-04-21: Added an app-level `ErrorBoundary`, wrapped bootstrap in `main.tsx`, and added retry/refresh coverage for crash recovery.
- 2026-04-21: Removed the `useCanvas` exhaustive-deps suppression, keyed initialization memoization to the live workspace object, and added regression coverage for workspace-backed initialization and switching.
- 2026-04-21: Removed the unused `canDeleteWorkspace(id)` parameter, added store-level regression coverage, and documented the simplified workspace deletion guard API.
- 2026-04-21: Added a header export menu with viewport PNG plus all-shapes/selected-shapes PNG and SVG downloads backed by new canvas export helpers and regression coverage.
- 2026-04-21: Added App-level regression coverage confirming the text tool stays active across repeated text placement until the user switches tools manually.
- 2026-04-13: Extended the inspector redesign language into the app header/workspace rail and added Playwright coverage for the new chrome styling.
- 2026-04-14: Converted the shell to a full-viewport canvas with floating header and inspector overlays, plus Playwright checks for viewport coverage.
- 2026-04-15: Added a focused spec and task breakdown for a work-diagram agent with OpenCode transport and presentation-brief output.
- 2026-04-16: Added embed resize handles, inspector-driven layout editing for single selected frame-like shapes, a dedicated interaction spec for embed/layout behavior, and Playwright coverage for canvas resize plus inspector size edits.
- 2026-04-16: Implemented multi-selection canvas interactions with additive click selection, marquee selection, combined multi-select framing, inspector group/ungroup actions, and regression coverage.
- 2026-04-17: Added multi-select inspector selected-item metadata plus a standalone app UI presentation spec for the current shell and panel inventory.
- 2026-04-20: Refactored the agent UI into a sidebar-first composer with progressive disclosure and an expanded diagram preview sheet.
- 2026-04-21: Implemented cleanup suggestions with deterministic proposal generation, inline preview/apply controls, and grouped undo coverage.

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
- ✅ Preserve group hierarchy through `parentId` and `childrenIds`
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
- Exported group nodes now carry `childrenIds` while every node carries `parentId`, so nested grouping survives export cleanly
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
