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
| `providers/openCodeDiagramProvider.ts` | Diagram-generation provider | Sends structured requests through `OpenCodeClient` and adds low-confidence/incomplete draft warnings |
| `agentOrchestrator.test.ts` | Orchestrator validation tests | Covers context packaging and invalid proposal rejection |
| `openCodeClient.test.ts` | OpenCode client tests | Covers response normalization and fallback behavior |

## Current Capabilities

- Packages selection, visible-board, and full-board context
- Validates review findings against in-scope shapes
- Validates generation proposals for:
  - supported generated shape types
  - connector references
  - section references
  - required presentation-brief fields
- Runs diagram-generation requests through the OpenCode-backed provider path
- Normalizes OpenCode diagram responses into:
  - create-shape actions
  - create-connector actions
  - diagram sections
  - presentation brief metadata
  - warnings/confidence

## Constraints

- OpenCode is currently treated as a transport boundary, not a UI concern
- The mock transport only supports `generate-diagram`
- Generation contracts currently target simple primitives:
  - `rectangle`
  - `circle`
  - `text`
  - `line`
  - `arrow`

## Known Issues

- Generated diagram actions are validated but not yet applied to the canvas
- Presentation briefs currently live only in the proposal contract, not persistent workspace state
- Full diagram preview UI is still pending, so generation currently surfaces status and counts rather than a structured preview
