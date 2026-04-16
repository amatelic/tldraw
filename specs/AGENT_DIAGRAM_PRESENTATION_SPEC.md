# Agent Diagram Presentation Specification

## Summary

This specification defines a focused agent feature for generating simple work diagrams from a prompt and returning presentation-ready guidance alongside the canvas draft. The goal is to help users move from prompt to board to presentation narrative quickly, without turning the app into a generic chat product.

For the first implementation, the app should use OpenCode as the transport layer to connect to the server-side agent. The app should still own the UX, preview, validation, and apply flow.

## Problem

The current agent foundation supports review-oriented workflows, but it does not yet help users start from a prompt and get a useful work artifact. Users who want to create a board for common work scenarios still need to manually place every shape, invent the structure, and separately think through how to present it.

That creates three gaps:

- blank-canvas friction when users only have an idea or prompt
- inconsistent structure for common work artifacts
- no presentation guidance that explains how to talk through the generated board

## Intended Use Cases

This feature should focus on simple work diagrams that are common, explainable, and easy to validate.

### Example 1: Backend Architecture

Prompt:

> Create a backend architecture for a messaging app.

Expected result:

- a simple system diagram with clients, API layer, auth, message service, websocket delivery, queue, storage, notifications, and observability
- clear labels and directional connectors
- a short presentation brief that explains the flow, tradeoffs, and talking order

### Example 2: Learning Storyboard

Prompt:

> Create a storyboard for how to learn storytelling.

Expected result:

- a staged sequence such as fundamentals, structure, practice, feedback, iteration, and presentation
- simple visual grouping that reads left-to-right or top-to-bottom
- a short presentation brief that explains how to walk an audience through the learning journey

## Product Goals

- Generate useful first-draft diagrams for work-oriented prompts.
- Keep the output simple enough that users can review and trust it.
- Return presentation guidance together with the diagram, not as a separate hidden response.
- Use structured output so the app can preview and validate the result before applying it.
- Use OpenCode as the initial transport without coupling the UI to a permanent backend choice.

## Non-Goals

- Building a free-form conversational assistant inside the canvas
- Supporting every diagram genre in the first release
- Producing polished slide exports in the same task
- Allowing the agent to apply changes without preview and confirmation
- Generating visuals that exceed the existing shape system

## Current State

- The app already has an `AgentPanel` with workflow selection and prompt input.
- The agent orchestrator can package board context and validate structured proposals.
- Review Mode is implemented.
- Cleanup Suggestions and Selection Rewrite are planned but not complete.
- The current proposal schema does not support prompt-to-diagram creation or presentation metadata.

## Target State

The user opens the agent panel, chooses a diagram-generation workflow, enters a work prompt, reviews a generated draft, and applies it to the board in one undoable step.

The generated result should have two first-class parts:

1. **Canvas Draft**
   A structured plan for shapes, labels, sections, and connectors that can be previewed and applied.

2. **Presentation Brief**
   A readable explanation of how to present the diagram, including:
   - title
   - objective
   - intended audience
   - narrative order
   - speaker notes / talk track
   - assumptions
   - open questions

## Primary User Action

Describe a work concept in plain language and receive a simple diagram plus the information needed to present it clearly.

## Recommended Interaction Model

### Entry

Use the existing `Agents` entry point and add a new workflow for diagram generation.

### Inputs

The workflow should support:

- a primary prompt
- a diagram type or preset
- an optional audience field
- an optional presentation goal or output tone

Suggested starter presets:

- Architecture Diagram
- Process Flow
- Storyboard
- Learning Journey

### Output Preview

Before apply, the panel should show:

- a short summary of what will be created
- a structured preview of sections, nodes, and connectors
- the presentation brief
- warnings if the result is partial, low-confidence, or missing information

### Apply

When accepted, the draft should:

- create all shapes in one grouped change
- become one undo step
- leave the board in a selectable, editable state
- preserve visibility of the presentation brief in the panel or another review surface

## Functional Requirements

### FR1: New Workflow Type

Add a new workflow for prompt-to-diagram generation. Suggested name:

- `generate-diagram`

### FR2: Structured Diagram Output

The agent must return structured output that the app can validate before apply. The output should support:

- section/group definitions
- shape creation instructions
- connector creation instructions
- layout hints
- board title and summary

The agent should only use supported canvas primitives from the current app.

### FR3: Presentation Brief Contract

The result must include structured presentation guidance, at minimum:

- `title`
- `objective`
- `audience`
- `summary`
- `narrativeSteps`
- `speakerNotes`
- `assumptions`
- `openQuestions`

### FR4: OpenCode Transport

The app should call the server through an OpenCode integration layer for the first release.

Implementation assumptions for now:

- OpenCode acts as the temporary request transport
- the browser app does not hardcode provider-specific prompting logic into the UI
- request and response mapping remain isolated behind a client/provider abstraction
- local mock mode should remain available for development and testing

### FR5: Preview-First Apply

The generated diagram must be previewed before the user can apply it.

Preview should make clear:

- how many shapes will be added
- whether existing shapes will be touched
- what the board title and sections will be
- what the generated presentation flow is

### FR6: Presentation Guidance in App

The app should expose the generated presentation information in the UI so the user can immediately understand how to present the board.

The first release can keep this inside the agent panel as long as it remains readable after generation and after apply.

## Technical Design

### 1. Extend Agent Types

The agent domain model should be extended to support:

- a new workflow type for diagram generation
- create-shape and create-connector actions
- optional grouping or section metadata
- a structured presentation brief
- warnings or confidence metadata

### 2. Add an OpenCode Client Layer

Create a dedicated client or adapter that sends structured requests to the server through OpenCode and maps the response into app-level types.

Responsibilities:

- accept app-level `AgentRequest`
- enrich the request with generation-specific payload if needed
- call OpenCode transport
- parse the server result
- normalize invalid or missing fields into safe errors

This keeps `AgentPanel` and `AgentOrchestrator` unaware of transport details.

### 3. Diagram Generation Provider

Add a provider dedicated to `generate-diagram`.

Responsibilities:

- convert the prompt and optional fields into a diagram-generation request
- request a structured diagram plan
- request presentation guidance in the same response
- return one validated proposal object

### 4. Validation Rules

The app must reject responses that:

- use unsupported shape types
- reference missing targets
- include empty required labels
- create invalid connector references
- omit the required presentation brief fields

### 5. Canvas Apply Strategy

Generated diagrams should use a small supported primitive set in the first release:

- text blocks
- rectangles/cards
- arrows/connectors
- optional section containers if already supported by the canvas model

If section containers are not supported yet, use grouped text + shapes instead of inventing a new primitive.

## Phased Implementation Plan

### Phase 1: Contract and Transport

- extend agent types for diagram creation and presentation brief output
- add OpenCode transport abstraction
- keep a mock fallback for tests and local development

### Phase 2: Panel Workflow

- add the new workflow to the panel
- add preset examples and structured prompt fields
- add loading, error, and preview states specific to diagram generation

### Phase 3: Diagram Preview and Apply

- render a readable preview of the generated diagram plan
- apply supported create actions to the canvas in one undo step
- keep the presentation brief visible after generation

### Phase 4: Quality and Guardrails

- add regression tests for example prompts
- add validation and error messaging for incomplete server output
- refine prompt scaffolding based on actual work-oriented examples

## Proposed Subtasks

1. Add diagram-generation contracts and OpenCode transport abstraction.
2. Extend the agent panel with diagram presets and prompt scaffolding.
3. Implement the OpenCode-backed diagram provider.
4. Add preview UI for the diagram plan and presentation brief.
5. Apply generated diagrams to the canvas with grouped undo support.
6. Add example-driven tests and documentation for work diagram generation.

## Success Criteria

- A user can generate a simple work diagram from a prompt.
- The result is previewed before apply.
- The response includes presentation guidance inside the app.
- The initial examples work well for architecture and storyboard prompts.
- Invalid server responses fail safely with clear UI messaging.
- The generated board remains editable with existing tools after apply.

## Constraints

- The first release should stay inside the current canvas capability set.
- Simple diagrams are better than ambitious but brittle generation.
- OpenCode transport should be treated as an implementation detail, not a permanent UI concept.
- Presentation guidance must be structured and visible, not hidden in raw markdown.

## Open Questions

- Should generated diagrams always append to the current board, or should the user be able to create them in a fresh workspace?
- Should the presentation brief persist with the workspace, or only live in the session panel for now?
- Should diagram generation support inserting into an existing selection later, or stay full-board only at first?
- Should the app expose confidence levels or only warnings when output quality is uncertain?

## Related

- `specs/AGENT_WORKFLOWS_SPEC.md`
- `specs/SPECS.md`
- `src/components/AgentPanel.tsx`
- `src/agents/agentOrchestrator.ts`
- `src/types/agents.ts`
