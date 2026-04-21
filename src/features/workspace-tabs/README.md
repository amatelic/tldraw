# Workspace Tabs Feature

## Purpose

Document the workspace-tab interactions that make workspace management readable and discoverable when names get long or pointer-based context menus are not available.

## User Flows

### Truncated Labels

- Workspace names with 15 or fewer characters render in full.
- Workspace names longer than 15 characters render as the first 15 characters followed by `...`.
- Truncated labels reveal the full workspace name after a 3-second hover delay.

### Long-Press Actions

- Pressing and holding a workspace tab for 3 seconds shows a circular progress ring around the tab.
- Completing the hold opens the same workspace action menu used for right-click access.
- Releasing early or leaving the tab cancels the long-press state and clears the progress ring.

### Workspace Actions

- `Rename` enters inline editing for the current workspace tab.
- `Close` removes the workspace when deletion is allowed.
- The close action is disabled when only one workspace remains.

## Timing Rules

- Truncation threshold: `15` visible characters.
- Tooltip delay: `3000ms`.
- Long-press duration: `3000ms`.
- Long-press progress updates every `50ms`.

## Implementation Notes

- UI behavior lives in [`WorkspaceTab.tsx`](../../components/WorkspaceTab.tsx).
- Shared workspace-rail composition lives in [`WorkspaceTabs.tsx`](../../components/WorkspaceTabs.tsx).
- Tooltip and progress styling live in [`App.css`](../../App.css).
- Regression coverage lives in [`WorkspaceTab.test.tsx`](../../components/WorkspaceTab.test.tsx) and [`WorkspaceTabs.test.tsx`](../../components/WorkspaceTabs.test.tsx).

## Success Criteria

- Long names stay readable without forcing the workspace rail to expand unpredictably.
- Full names remain available through the delayed tooltip.
- Pointer and touch-style users can reach workspace actions without relying on right-click alone.
- Rename and close flows remain inline with the existing workspace model.

## Known Issues

- The 3-second hold is deliberate but may feel slow for power users.
- Long-press feedback currently uses a conic-gradient ring instead of a true stroke animation.
- Tooltip positioning is tuned for the current header layout and may need adjustment if the workspace rail moves.
