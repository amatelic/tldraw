# Task 12 - Agent Document Application Boundary

## Status

- Status: Completed
- Sequence: 12
- Completed: 2026-04-22

## Goal

Separate agent proposal validation, adaptation, and document application from `useCanvas`.

## Why This Task Exists

The agent contract is already fairly clean, but applying agent output still lives inside the main canvas hook. That keeps agent-specific behavior coupled to the general editor state manager.

## Flow To Support

1. The orchestrator builds request context and validates proposals.
2. An adapter layer converts valid proposals into document command batches.
3. The document command layer applies those batches.
4. `useCanvas` coordinates history and state but does not own agent-specific application logic.

## Success Criteria

- [x] Proposal validation and proposal application have separate ownership.
- [x] Agent apply logic no longer lives directly in `useCanvas`.
- [x] Existing agent tests still pass after the move.
- [x] Focused tests cover proposal-to-command adaptation where coverage is missing.

## Constraints

- Do not add new workflows in this task.
- Do not redesign `AgentPanel`.
- Keep the current provider contracts stable unless a small adapter is enough.

## Likely Files

- `src/hooks/useCanvas.ts`
- `src/agents/agentOrchestrator.ts`
- `src/types/agents.ts`
- new agent adapter or apply modules

## Depends On

- `05-document-command-layer.md`

## Implementation Notes

- Added `src/agents/documentApplication.ts` as the pure adapter that validates proposals through the orchestrator layer and then applies them through the document command helpers.
- `useCanvas` now only coordinates history around the returned next document state; it no longer owns proposal-specific validation or command selection.
- Added `src/agents/documentApplication.test.ts` to cover the validation-plus-application boundary directly instead of only testing it through the hook.
