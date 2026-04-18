# Agents Directory

This directory contains the canvas-agent orchestration layer, transport adapters, and workflow providers.

## Overview

Agent logic is intentionally split into small layers so the UI does not depend on one provider or transport implementation:

- `agentOrchestrator.ts` packages board context and validates proposals
- `openCodeClient.ts` maps OpenCode server responses into app-level contracts
- `providers/` contains workflow-specific providers that call the orchestrator/client stack

## Files

| File | Purpose | Notes |
|------|---------|-------|
| `agentOrchestrator.ts` | Packages board context and validates structured proposals | Supports review, cleanup, rewrite, and diagram-generation contracts |
| `openCodeClient.ts` | OpenCode transport adapter and response normalizer | Includes a deterministic mock fallback for local development/tests |
| `providers/reviewModeProvider.ts` | Current review-mode provider | Deterministic/mock-backed |
| `providers/selectionRewriteProvider.ts` | Selection rewrite provider | Deterministic text-only rewrite pass for selected text shapes |
| `providers/openCodeDiagramProvider.ts` | Diagram-generation provider | Sends structured requests through `OpenCodeClient` and adds low-confidence/incomplete draft warnings |
| `agentOrchestrator.test.ts` | Orchestrator validation tests | Covers context packaging and invalid proposal rejection |
| `openCodeClient.test.ts` | OpenCode client tests | Covers response normalization and fallback behavior |

## Current Capabilities

- Packages selection, visible-board, and full-board context
- Validates review findings against in-scope shapes
- Validates mutation proposals against current canvas state before apply
- Validates generation proposals for:
  - supported generated shape types
  - connector references
  - section references
  - required presentation-brief fields
- Runs selection-scoped rewrite requests through a deterministic provider that only targets selected text shapes
- Exposes reusable generation validation for canvas apply flows
- Runs diagram-generation requests through the OpenCode-backed provider path
- Normalizes OpenCode diagram responses into:
  - create-shape actions
  - create-connector actions
  - diagram sections
  - presentation brief metadata
  - warnings/confidence

## Constraints

- OpenCode is currently treated as a transport boundary, not a UI concern
- Selection Rewrite is deterministic/local in Phase 1 and does not call OpenCode
- The mock OpenCode transport only supports `generate-diagram`
- Generation contracts currently target simple primitives:
  - `rectangle`
  - `circle`
  - `text`
  - `line`
  - `arrow`

## Known Issues

- Cleanup Suggestions is still scaffolded and not yet backed by a provider
- Presentation briefs currently live only in the proposal contract, not persistent workspace state
- Generated connector endpoints are still static after apply because the canvas does not yet maintain live bindings between nodes and connectors
