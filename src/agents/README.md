# Agents Directory

This directory contains the canvas-agent orchestration layer, transport adapters, and workflow providers.

## Overview

Agent logic is intentionally split into small layers so the UI does not depend on one provider or transport implementation:

- `agentOrchestrator.ts` packages board context and validates proposals
- `documentApplication.ts` adapts validated mutation/generation proposals into document command results
- `openCodeClient.ts` maps OpenCode server responses into app-level contracts
- `providers/` contains workflow-specific providers that call the orchestrator/client stack
- `AgentPanel` is mounted by `src/app/AppShell.tsx` in the right rail and shares global design-token styling through `src/App.css`
- `src/components/agent-panel/useAgentPanelController.ts` keeps workflow UI state, run/apply status, cleanup selection, and stale-request invalidation out of the provider layer

## Files

| File | Purpose | Notes |
|------|---------|-------|
| `agentOrchestrator.ts` | Packages board context and validates structured proposals | Supports review, cleanup, rewrite, and diagram-generation contracts |
| `documentApplication.ts` | Applies validated mutation/generation proposals through the document command layer | Keeps proposal-specific apply logic out of `useCanvas` |
| `openCodeClient.ts` | OpenCode transport adapter and response normalizer | Includes a deterministic mock fallback for local development/tests |
| `openCodeHttpTransport.ts` | Real HTTP transport for OpenCode session/message APIs | Requests JSON-schema output from `opencode serve` and cleans up ephemeral sessions |
| `openCodeRuntime.ts` | Runtime config resolver for OpenCode connectivity | Chooses dev proxy vs direct URL and disables live transport in test mode |
| `providers/reviewModeProvider.ts` | Current review-mode provider | Deterministic/mock-backed |
| `providers/cleanupSuggestionsProvider.ts` | Cleanup workflow provider | Deterministic low-risk layout/style cleanup proposals with optional deletions |
| `providers/selectionRewriteProvider.ts` | Selection rewrite provider | Deterministic text-only rewrite pass for selected text shapes |
| `providers/openCodeDiagramProvider.ts` | Diagram-generation provider | Uses the live OpenCode transport by default and adds low-confidence/incomplete draft warnings |
| `providers/openCodeDiagramProvider.test.ts` | Diagram provider tests | Locks the starter messaging-architecture and storytelling-storyboard prompts with regression coverage |
| `providers/cleanupSuggestionsProvider.test.ts` | Cleanup provider tests | Covers cleanup action generation for alignment, spacing, style normalization, and blank-text deletion |
| `agentOrchestrator.test.ts` | Orchestrator validation tests | Covers context packaging and invalid proposal rejection |
| `documentApplication.test.ts` | Agent apply adapter tests | Covers validation-plus-application handoff into document commands |
| `openCodeClient.test.ts` | OpenCode client tests | Covers response normalization and fallback behavior |
| `openCodeHttpTransport.test.ts` | OpenCode HTTP transport tests | Covers session lifecycle, JSON-schema prompting, fallback parsing, and availability failures |

## Current Capabilities

- Packages selection, visible-board, and full-board context
- Validates review findings against in-scope shapes
- Validates mutation proposals against current canvas state before apply
- Validates generation proposals for:
  - supported generated shape types
  - connector references
  - section references
  - required presentation-brief fields
- Runs cleanup requests through a deterministic provider that proposes:
  - alignment adjustments
  - spacing normalization
  - dominant stroke color/width cleanup
  - empty text deletion
- Runs selection-scoped rewrite requests through a deterministic provider that only targets selected text shapes
- Exposes reusable generation validation for canvas apply flows
- Applies generation and mutation proposals through an agent-side adapter that returns next document state plus apply metadata for `useCanvas`
- Runs diagram-generation requests through the OpenCode-backed provider path
- Creates short-lived OpenCode sessions and prompts them for structured diagram JSON
- Keeps the two starter diagram prompts stable through provider-level regression tests:
  - backend architecture for a messaging app
  - storyboard for learning storytelling
- Normalizes OpenCode diagram responses into:
  - create-shape actions
  - create-connector actions
  - diagram sections
  - presentation brief metadata
  - warnings/confidence
- Leaves workflow switching and late-result protection in the AgentPanel controller so providers stay focused on proposal generation

## Constraints

- OpenCode is currently treated as a transport boundary, not a UI concern
- Cleanup Suggestions is deterministic/local in Phase 1 and does not call OpenCode
- Selection Rewrite is deterministic/local in Phase 1 and does not call OpenCode
- The live OpenCode transport expects an `opencode serve` instance that exposes the session/message API
- The dev app proxies `/api/opencode` to `http://127.0.0.1:4096`; non-dev builds should set `VITE_OPENCODE_BASE_URL`
- Test mode bypasses the live transport and uses the deterministic mock directly to keep suite runs stable
- The agent UI shares the right rail with the inspector; opening the agent hides the properties panel until the agent rail is closed
- Pending UI runs are invalidated when the user closes the agent panel, changes workflow, or applies a starter example; providers are not currently cancelled at the transport level
- Generation contracts currently target simple primitives:
  - `rectangle`
  - `circle`
  - `text`
  - `line`
  - `arrow`

## Known Issues

- Presentation briefs currently live only in the proposal contract, not persistent workspace state
- Generated connector endpoints are still static after apply because the canvas does not yet maintain live bindings between nodes and connectors
- If the live OpenCode server is down, the app falls back to the local mock transport and marks the draft with a warning instead of failing closed
