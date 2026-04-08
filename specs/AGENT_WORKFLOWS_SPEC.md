# Agent Workflows Specification

## Summary

This specification proposes a set of agent-powered workflows that would make the TLDraw clone more useful as a thinking, planning, and presentation tool. The goal is not to bolt on a generic chat sidebar, but to introduce agents that can act on the canvas, help structure messy boards, and accelerate common workflows without taking control away from the user.

The strongest product direction is to make agents operate on explicit canvas context:

- the current board
- the current selection
- the visible viewport
- recent user actions

This keeps agent behavior grounded in what the user is actually working on.

## Problem

The application already supports drawing, editing, media embedding, and workspace organization, but the workflow is still mostly manual. Users can place shapes, text, and media, yet the app does not help them:

- turn rough notes into structured diagrams
- clean up cluttered boards
- generate consistent labels and sections
- prepare boards for review or export
- move from idea capture to presentation-ready output quickly

Without guided workflows, the app risks feeling like a capable canvas with limited leverage.

## Goals

- Introduce high-value agent workflows that improve real canvas tasks.
- Keep the user in control with preview-first actions and easy undo.
- Make agent behavior selection-aware and context-aware.
- Use agents to improve organization, clarity, and speed, not just novelty.
- Create a phased plan that can be implemented incrementally.

## Non-Goals

- Building a general-purpose chatbot with no canvas awareness
- Allowing agents to mutate the board silently without user confirmation
- Solving every use case in the first iteration
- Adding real-time multiplayer orchestration in the first phase

## Product Principles

1. Human-in-the-loop by default
   Agent changes should be previewed before they are applied.

2. Canvas-first, chat-second
   The board and selection should be the main source of context.

3. Fast narrow workflows beat vague broad intelligence
   Specific actions like “organize this flow” or “label these nodes” are better than open-ended prompting.

4. Every agent action should be reversible
   Agent-applied mutations should be grouped into a single undo step where possible.

## Proposed Agent Workflows

### Workflow 1: Prompt to First Draft

Users can describe what they want to create, and an agent generates an initial board structure.

Examples:

- “Create a user signup flow with happy path and failure states”
- “Turn these meeting notes into a product roadmap”
- “Draft a system architecture diagram for a web app with API, database, cache, and worker”

Agent output:

- sections
- text nodes
- arrows/connectors
- grouped layout suggestions
- suggested color hierarchy

Why it matters:

- reduces blank-canvas friction
- makes the app useful earlier in the workflow

### Workflow 2: Selection Rewrite

Users select shapes or text and invoke an agent to transform only that region.

Examples:

- “Rewrite this in clearer product language”
- “Convert these bullets into a simple flow”
- “Shorten these labels for presentation slides”
- “Turn this messy cluster into three grouped themes”

Agent output:

- updates to selected text
- optional layout adjustments
- optional grouping and spacing suggestions

Why it matters:

- keeps agents scoped and predictable
- supports iterative editing instead of one-shot generation

### Workflow 3: Board Cleanup Agent

The app can inspect the current board and suggest cleanup actions.

Examples:

- align overlapping elements
- normalize spacing between related blocks
- detect inconsistent font sizes or colors
- flag disconnected shapes that likely belong to a flow
- identify empty or placeholder text

Recommended interaction:

- present a checklist of suggested fixes
- let users apply suggestions individually or all at once

Why it matters:

- improves polish quickly
- creates obvious value even for users who do not want generative creation

### Workflow 4: Diagram Critic / Review Mode

An agent reviews a board and gives structured feedback instead of directly editing it.

Examples:

- “What is unclear in this user journey?”
- “Which parts of this architecture are ambiguous?”
- “Where are we missing labels or decision points?”

Output format:

- clarity issues
- style consistency issues
- missing information
- suggestions for next edits

Why it matters:

- helps users improve thinking quality, not just visual layout
- safer than automatic mutation for high-trust tasks

### Workflow 5: Presentation Prep

An agent transforms a working board into a review-ready artifact.

Examples:

- generate section headers
- simplify wording
- create a narrative order
- highlight key frames
- produce a short summary for stakeholders

Potential outputs:

- presentation mode ordering
- summary panel
- export title and description
- “before review” cleanup checklist

Why it matters:

- bridges the gap between working canvas and polished deliverable

### Workflow 6: Research to Canvas

Users paste rough notes, docs, or transcripts, and an agent turns them into structured visual content.

Examples:

- meeting notes to action plan
- feature brief to flowchart
- brainstorm notes to clustered themes

Why it matters:

- expands the app from drawing tool to synthesis tool

## Recommended UX

### Entry Points

The application should expose agent workflows through multiple intentional entry points:

- a top-level “Agents” button in the header
- a contextual floating action on current selection
- a command menu for quick actions
- empty-state suggestions for first-time users

### Agent Panel

Use a right-side panel or modal with:

- selected workflow
- short prompt input
- context summary
- generated plan or preview
- apply / cancel actions

The panel should explain what context the agent will use:

- whole board
- current selection
- visible area
- pasted text

### Preview-First Interaction

Before mutating the canvas, the app should show:

- which shapes will be added
- which shapes will be edited
- which text values will change
- which layout adjustments are proposed

For larger changes, a diff-like preview is recommended.

### Undo and Trust

Agent actions should:

- create a single undo checkpoint
- include a short activity label such as “Agent: Cleaned up board”
- never apply hidden background edits

## Suggested First Release Scope

Phase 1 should focus on practical, low-risk workflows:

1. Selection Rewrite
2. Board Cleanup Suggestions
3. Diagram Critic / Review Mode

These are better first releases than full prompt-to-diagram because they:

- require less generation complexity
- are easier to trust
- fit the current editing model
- can reuse existing shape update flows

## Functional Requirements

### FR1: Agent Context Packaging

The app must be able to package structured context for an agent:

- workspace metadata
- selected shapes
- visible shapes
- text content
- shape bounds and relationships
- style tokens

### FR2: Agent Result Format

The app should define a structured result contract for agent responses:

- `summary`
- `proposedActions`
- `shapeCreates`
- `shapeUpdates`
- `shapeDeletes`
- `reviewFindings`

This avoids brittle free-form parsing.

### FR3: Safe Apply Flow

Agent output should go through validation before being applied:

- shape ids must exist for updates/deletes
- bounds must be finite numbers
- text changes must target text-capable shapes
- invalid operations should be rejected with a visible error

### FR4: Activity State

Agent jobs should expose clear lifecycle states:

- idle
- collecting-context
- generating
- preview-ready
- applying
- failed

### FR5: Auditability

Each applied agent action should record:

- workflow used
- timestamp
- summary of changes

This can later support history, analytics, and collaboration features.

## Agent Constraints

The following constraints should define agent behavior and implementation boundaries.

### 1. Scope Constraints

- Agents must operate only on explicitly provided context.
- Default scope should be the current selection when one exists.
- If no selection exists, the agent may use the visible viewport or full board only when the UI states that clearly.
- Agents must not inspect hidden application state or unrelated workspaces unless the user explicitly requests it.

### 2. Mutation Constraints

- Agents must never apply changes automatically without a user-confirmed apply step.
- All agent-generated mutations must be previewable before execution.
- Agent changes should be batched into one logical undo step.
- Agents must not delete user content by default unless the deletion is explicitly previewed and approved.

### 3. Output Constraints

- Agent output must use a structured schema, not raw free-form text for mutations.
- Invalid or partially invalid action payloads must be rejected safely.
- If confidence is low, the agent should return suggestions or findings instead of direct mutations.
- The agent should prefer additive or reversible suggestions over destructive edits.

### 4. UX Constraints

- The UI must always show what context the agent is using.
- The UI must distinguish clearly between “review only” workflows and “will modify canvas” workflows.
- Long-running agent actions must expose progress states.
- Users must always have a cancel path before apply.
- Agent suggestions should feel assistive, not interruptive.

### 5. Trust and Safety Constraints

- Agents must not silently rewrite the entire board.
- Agents must not fabricate unsupported canvas entities or properties.
- Agents must not produce hidden state that cannot be inspected in the UI.
- High-impact actions such as bulk delete, bulk rewrite, or board-wide re-layout should require an extra confirmation step.

### 6. Performance Constraints

- Agent requests must be bounded by payload-size limits.
- Very large boards should be summarized before sending context.
- Repeated requests during typing should be debounced.
- Agent interactions should not block core canvas interactions such as pan, zoom, draw, or select.

### 7. Privacy and Data Constraints

- The app must disclose when board content is sent to an external model or service.
- Users should be able to understand whether the workflow is local-only, heuristic, or model-backed.
- Sensitive text or embedded content should be excluded unless it is part of the chosen context.
- Agent request/response logging should avoid storing raw sensitive board content unless required and disclosed.

### 8. Integration Constraints

- Agents must reuse existing shape creation, update, delete, selection, and undo infrastructure.
- Agent-specific logic should be isolated from rendering code.
- The system should support swapping agent providers without rewriting the UI contract.
- Cleanup-only workflows should be able to run without requiring full generative capabilities.

### 9. Product Constraints

- Phase 1 should focus on narrow, reliable workflows.
- The first release should optimize for trust and clarity over maximum autonomy.
- Agent workflows should improve existing user goals, not introduce a second disconnected product inside the app.
- The app should remain fully usable without agent features enabled.

## Technical Approach

### 1. Add an Agent Domain Model

Suggested new types:

- `AgentWorkflowType`
- `AgentRequest`
- `AgentProposal`
- `AgentAction`
- `AgentReviewFinding`

Suggested location:

- `src/types/agents.ts`

### 2. Create an Agent Orchestration Layer

Suggested module:

- `src/agents/agentOrchestrator.ts`

Responsibilities:

- collect board context
- serialize context for the selected workflow
- call an agent provider
- validate the structured result
- return a preview model to the UI

### 3. Add UI Surfaces

Suggested components:

- `src/components/AgentPanel.tsx`
- `src/components/AgentPromptBar.tsx`
- `src/components/AgentSuggestionList.tsx`

### 4. Reuse Existing Canvas Mutation APIs

Agent application should flow through the same internal update paths already used for user edits:

- add shape
- update shape
- delete shape
- selection changes
- undo/redo history

This keeps the system more debuggable and consistent.

### 5. Preserve Performance

Large boards should not send raw unfiltered context every time. The orchestrator should:

- prioritize current selection
- summarize distant or off-screen content
- cap payload size
- debounce repeated requests while the user is still typing

## Developer Workflow Improvements

Agents can improve the project itself, not only the end-user experience. Recommended internal workflows:

### Spec Authoring Agent

Helps turn rough feature ideas into structured specs with:

- goals
- edge cases
- acceptance criteria
- rollout plan

### QA / Regression Agent

Given a feature spec, it proposes:

- risky user flows
- missing test cases
- regression scenarios

### Canvas Review Agent

Used during development to inspect saved board fixtures and flag:

- rendering inconsistencies
- layout regressions
- missing labels

### Support / Onboarding Agent

Can generate:

- quick-start board templates
- tutorial walkthroughs
- example prompts for new users

## Rollout Plan

### Phase 1: Safe Helpers

- selection rewrite
- review mode
- cleanup suggestions
- no autonomous creation outside current context

### Phase 2: Canvas Generation

- prompt to first draft
- notes to board
- layout generation from structured text

### Phase 3: Collaborative Flows

- agent-generated presentation sequences
- handoff summaries
- workspace-level suggestions across tabs

## Acceptance Criteria

- A user can run an agent workflow against the current selection.
- The system shows exactly what the agent plans to change before apply.
- The user can cancel without mutating the board.
- Applied changes are undoable in one logical step.
- Review-mode workflows can return findings without mutating shapes.
- The UI clearly states whether the workflow uses selection, viewport, or full board context.
- Invalid agent outputs are rejected safely.

## Success Metrics

- reduced time from blank canvas to first structured board
- reduced time from rough draft to review-ready board
- percentage of agent suggestions accepted
- repeat usage of selection-based agent workflows
- lower cleanup effort before export or stakeholder review

## Open Questions

- Should agent capabilities be available offline via local heuristics for cleanup-only workflows?
- Should prompt-to-board be template-based first, then become model-driven later?
- How much board history should be included in context?
- Should review findings appear inline on the canvas, in a panel, or both?
- Which workflows should be free-form prompt driven versus button-driven?

## Recommendation

The best next step is to implement a narrow Phase 1 slice:

1. add an `Agents` entry point
2. support selection-scoped context packaging
3. ship review mode and cleanup suggestions first
4. add prompt-based selection rewrite after the preview/apply loop feels reliable

That sequence gives the app a meaningful intelligence layer while keeping the experience trustworthy and implementation scope realistic.
