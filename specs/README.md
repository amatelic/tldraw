# Specs Directory

This directory contains detailed specifications for features, architecture, and active tasks.

## Overview

Specs serve as:
- Design documents for new features
- Implementation guides for developers
- Task tracking for ongoing work
- Architecture documentation

## Files

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `SPECS.md` | Main task list (23 tasks) | ~800 | Active |
| `TASK_WORKFLOW.md` | How to work on tasks | ~100 | Reference |
| `SELECTION_SIDEBAR_SPEC.md` | Properties panel spec | ~150 | Completed |
| `toolbar-refactor-SPEC.md` | Toolbar redesign spec | ~350 | Completed |
| `AGENT_WORKFLOWS_SPEC.md` | AI agent integration | ~400 | Planning |
| `AGENT_DIAGRAM_PRESENTATION_SPEC.md` | Work-diagram generation and presentation brief agent | ~250 | Planning |

## Active Tasks (from SPECS.md)

### Completed ✅
1. **Vitest Testing Framework** - Full test setup with coverage
2. **Text Shape In-Place Editing** - Double-click to edit text

### In Progress 🟡
3. **Workspace Name Truncation & Long-Press Menu** - Tab enhancements

### Not Started 🔴
4. **Text Tool Auto-Switch Behavior** - Auto-switch to select after text
5. **Export to PNG/SVG** - Export drawings
6. **Shape Grouping/Ungrouping** - Group multiple shapes
7. **Auto-save Race Condition** - Fix timing issues
8. **Remove Unused Parameter** - Fix `canDeleteWorkspace`
9. **Fix ESLint Disable** - Fix `useCanvas` hook deps
10. **Add Error Boundaries** - Error handling
11. **Input Validation** - Workspace name validation
12-16. **Agent Workflow Tasks** - AI integration foundations
18-23. **Diagram Generator Agent Tasks** - Work diagram creation and presentation guidance

## Task Status Legend

- 🔴 **Not Started** - Not yet implemented
- 🟡 **In Progress** - Currently being worked on
- 🔵 **In Review** - Awaiting code review
- ✅ **Completed** - Done and merged

## Working on Tasks

### 1. Read TASK_WORKFLOW.md
Understand the process for picking up and completing tasks.

### 2. Choose a Task
Pick from 🔴 Not Started tasks in SPECS.md.

### 3. Create Spec (if needed)
For complex features, create a new spec file:
```
specs/FEATURE-NAME-SPEC.md
```

### 4. Update SPECS.md
Change status from 🔴 to 🟡 and add your name.

### 5. Implement
Follow the spec and implement the feature.

### 6. Update SPECS.md
Change status to ✅ and add completion notes.

## Spec Template

```markdown
# Feature Name Specification

## Overview
Brief description of the feature.

## Current State
What's there now.

## Target State
What it should be.

## Design
### Visual Design
Screenshots, mockups, descriptions.

### Technical Design
Architecture, data flow, APIs.

## Implementation Plan
1. Step one
2. Step two
3. Step three

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Constraints
- Limitation 1
- Limitation 2

## Known Issues
- Issue 1
- Issue 2

## Related
- Links to related specs
- Links to related code
```

## Completed Specs

### Toolbar Refactor ✅
**File**: `toolbar-refactor-SPEC.md`

Refactored vertical sidebar to floating bottom toolbar:
- Horizontal layout with icons only
- Floating card design with shadow
- Expandable "More" menu
- Custom tooltip component
- Added Arrow tool, renamed Freehand→Pencil

**Implementation Date**: April 2025
**Status**: Completed and merged

### Selection Sidebar ✅
**File**: `SELECTION_SIDEBAR_SPEC.md`

Properties panel animation:
- Slide in from right
- Spring animation
- AnimatePresence for enter/exit

**Implementation Date**: March 2025
**Status**: Completed and merged

## Architecture Specs

### AGENT_WORKFLOWS_SPEC.md
Planning document for AI agent integration:
- Task automation
- Code generation
- Review assistance
- Documentation generation

**Status**: Planning phase

### AGENT_DIAGRAM_PRESENTATION_SPEC.md
Focused planning document for prompt-to-diagram generation:
- simple diagrams for work
- OpenCode-backed server transport
- structured presentation brief output
- example flows for architecture and storyboard generation

**Status**: Planning phase

## Maintenance

### When to Update SPECS.md

1. **Starting a task**: Change 🔴 → 🟡
2. **Completing a task**: Change 🟡 → ✅
3. **Finding a bug**: Add to Known Issues
4. **Adding task**: Add to bottom of list

### When to Create New Spec

Create a new spec file when:
- Feature is complex (> 2 days work)
- Multiple implementation options
- Needs design review
- Affects multiple components
- Has complex UI/UX

### When to Archive Spec

Move completed specs to `specs/archive/` when:
- Feature stable for 3+ months
- No longer referenced
- Superseded by new spec

## Spec Review Process

1. **Draft**: Write initial spec
2. **Review**: Share with team for feedback
3. **Revise**: Update based on feedback
4. **Approve**: Mark as approved
5. **Implement**: Follow spec
6. **Verify**: Confirm implementation matches spec
7. **Archive**: Move to archive when stable

## Success Criteria

- [ ] All active tasks tracked in SPECS.md
- [ ] Complex features have detailed specs
- [ ] Specs kept up-to-date
- [ ] Completed specs archived
- [ ] Task workflow documented

## Constraints

- Specs are documentation, not code
- Must be kept in sync with implementation
- Large specs can become outdated
- Not a substitute for code comments

## Known Issues

1. **Spec Drift**: SPECS.md may not reflect current priorities
2. **Outdated Specs**: Completed specs not archived
3. **Missing Specs**: Some features lack detailed specs

## Best Practices

1. **Keep SPECS.md Updated**: Status changes immediately
2. **Write Specs Early**: Before implementation
3. **Include Examples**: Screenshots, code snippets
4. **Define Done**: Clear success criteria
5. **Version Control**: Specs are code, commit them
6. **Link to Code**: Reference specific files/functions

## Related Documentation

- [AGENTS.md](../AGENTS.md) - Agent workflow guide
- [../src/README.md](../src/README.md) - Source code overview
- [../README.md](../README.md) - Project readme
