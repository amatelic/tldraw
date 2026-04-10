# AGENTS.md

Guide for AI agents working on this TLDraw Clone repository.

## Project Overview

React + TypeScript + Vite application - a drawing/canvas clone similar to TLDraw.

## Build Commands

```bash
// Install dependencies
npm install
```

## Test Commands

```bash
# Run all tests once
npx vitest run

# Run tests in watch mode (for development)
npx vitest

# Run tests with coverage
npx vitest run --coverage

# Run a single test file
npx vitest run src/path/to/test.test.ts

# Run tests matching a pattern
npx vitest run --reporter=verbose
```

## Testing Requirements

### Test Types by Task Category

Choose the appropriate test type based on what you're implementing:

**Unit Tests** (Required for):
- Utility functions (`src/utils/`)
- Store actions and state logic (`src/stores/`)
- Type guards and validation functions
- Business logic without UI dependencies
- Math calculations and data transformations

**Integration Tests** (Required for):
- Custom hooks (`src/hooks/`)
- Store interactions between multiple slices
- Component logic with state management
- Multi-step operations

**E2E/Component Tests** (Required when):
- Task acceptance criteria explicitly requires E2E tests
- Complex user workflows (drawing, undo/redo, selections)
- Dialog and modal interactions
- Feature-level acceptance testing

### Test File Organization

- Co-locate tests with source files
- Naming: `<source>.test.ts` or `<source>.spec.ts`
- Examples:
  - `src/utils/audioProcessor.ts` → `src/utils/audioProcessor.test.ts`
  - `src/stores/workspaceStore.ts` → `src/stores/workspaceStore.test.ts`
  - `src/hooks/useCanvas.ts` → `src/hooks/useCanvas.test.ts`

### Testing Standards

1. **Minimum Coverage**: 80% for new code
2. **Test Naming**: Describe behavior clearly (e.g., `should calculate correct bounds for rectangle`)
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock External Dependencies**: Use mocks for browser APIs, localStorage, etc.
5. **Test Edge Cases**: Include error cases and boundary conditions

### Testing Functions with Browser Dependencies

When testing functions that depend on browser APIs (AudioContext, Canvas, fetch, etc.):

**Prefer extracting pure logic** - Separate browser-dependent code from pure data transformation logic:

```typescript
// Bad: Everything in one function - hard to test
export async function processAudio(audioSrc: string) {
  const audioContext = new AudioContext(); // Browser API
  const buffer = await fetch(audioSrc).then(r => r.arrayBuffer());
  const audioBuffer = await audioContext.decodeAudioData(buffer);
  const data = audioBuffer.getChannelData(0);
  // ... complex processing logic that's hard to test
}

// Good: Extract pure logic
export function processAudioData(data: Float32Array): number[] {
  // Pure function - easy to test with real data
  return data.map(v => Math.abs(v));
}

export async function processAudio(audioSrc: string) {
  const audioContext = new AudioContext();
  const buffer = await fetch(audioSrc).then(r => r.arrayBuffer());
  const audioBuffer = await audioContext.decodeAudioData(buffer);
  const data = audioBuffer.getChannelData(0);
  return processAudioData(data); // Use the pure function
}
```

**Guidelines:**
- Extract data transformation logic into pure functions
- Export pure functions so they can be tested directly
- Minimize mocking - test real data transformations
- Mock only browser APIs, not your own logic
- Example: See `src/utils/audioProcessor.ts` and its tests

### Test Template

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('should return expected result for valid input', () => {
    // Arrange
    const input = { x: 10, y: 20 };
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe(30);
  });
  
  it('should handle edge case', () => {
    // Test edge case
  });
  
  it('should throw error for invalid input', () => {
    // Test error handling
  });
});
```

### Pre-commit Checklist

Before committing, ensure:
- [ ] All new functions have corresponding tests
- [ ] Tests pass: `npx vitest run`
- [ ] Coverage meets 80% threshold
- [ ] No test warnings or errors

## Tech Stack

- **Framework**: React 19 + TypeScript 5.9
- **Build Tool**: Vite 8
- **State Management**: Zustand (with persistence)
- **Animations**: Framer Motion
- **Linting**: ESLint 9 + typescript-eslint

## Code Style Guidelines

### TypeScript

- Use **strict mode** - all strict compiler options are enabled
- Always define explicit return types for exported functions
- Use `type` imports: `import type { Foo } from './types'`
- Prefer `interface` for object shapes, `type` for unions/complex types
- Use discriminated unions for variant types (e.g., `Shape` type)
- Enable `noUnusedLocals` and `noUnusedParameters` - clean up unused code

### Naming Conventions

- **Components**: PascalCase (e.g., `Toolbar.tsx`, `Canvas.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useCanvas.ts`, `useKeyboard.ts`)
- **Types/Interfaces**: PascalCase (e.g., `Shape`, `EditorState`)
- **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `MAX_WORKSPACES`, `DEFAULT_STYLE`)
- **Files**: Match the primary export name

### Imports

- Group imports: React, external libs, internal modules, types, styles
- Use path aliases from project root: `@/` is NOT configured, use relative paths
- Always separate type imports: `import type { Foo } from './types'`

### Component Structure

```tsx
// 1. Imports (React first, then libs, then internal, then types, then styles)
import { useCallback, useState } from 'react';
import type { ToolType } from '../types';
import './Component.css';

// 2. Props interface
interface ComponentProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

// 3. Component function (named export preferred)
export function Component({ currentTool, onToolChange }: ComponentProps) {
  // Hooks first
  const [state, setState] = useState(false);
  
  // Callbacks with useCallback
  const handleClick = useCallback(() => {
    onToolChange('select');
  }, [onToolChange]);
  
  // Render
  return <div onClick={handleClick}>{currentTool}</div>;
}
```

### State Management

- Use **Zustand** for global state (see `src/stores/`)
- Use **React hooks** (`useState`, `useReducer`) for local component state
- Implement undo/redo with history pattern when needed
- Persist state to localStorage via Zustand middleware when appropriate

### Hooks Pattern

- Custom hooks go in `src/hooks/`
- Always prefix with `use`: `useCanvas.ts`, `useKeyboard.ts`
- Return interface at top of file for clarity
- Use `useCallback` for all callback functions exposed from hooks

### Error Handling

- Use console.warn for non-critical errors
- Return boolean success indicators from store actions
- Validate inputs at function boundaries
- Use TypeScript to prevent null/undefined errors at compile time

### CSS/Styling

- Use CSS variables in `index.css` for theming
- Component-specific styles in `.css` files next to components
- Support light/dark mode with `prefers-color-scheme`
- Use CSS custom properties for colors, spacing, typography

### File Organization

```
src/
├── components/     # React components
├── hooks/          # Custom React hooks
├── stores/         # Zustand stores
├── types/          # TypeScript types/interfaces
├── utils/          # Utility functions
├── canvas/         # Canvas engine/rendering
├── assets/         # Static assets
├── App.tsx         # Root component
├── main.tsx        # Entry point
└── index.css       # Global styles
```

## ESLint Rules

- Follow recommended TypeScript rules
- React Hooks rules enabled (exhaustive deps)
- React Refresh rules for HMR
- No explicit `any` types
- No unused variables/parameters

## Git Workflow

- No commits unless explicitly requested
- Follow existing commit message style if committing

## Notes

- Port 5175 is hardcoded in Vite config
- Uses localStorage for persistence via Zustand
- Canvas rendering uses custom `CanvasEngine` class

## Active Tasks Workflow

See [specs/SPECS.md](./specs/SPECS.md) for active tasks and [specs/TASK_WORKFLOW.md](./specs/TASK_WORKFLOW.md) for detailed workflow.

### Quick Task Commands

```bash
# List all active (not started) tasks
grep -A 2 "^### Task" specs/SPECS.md | grep -E "(Task|Status:)" | grep -B 1 "🔴 Not Started"

# Count remaining tasks
grep -c "Status: 🔴 Not Started" specs/SPECS.md
```

## Task Completion & Commit Workflow

When you finish a task:

1. **Mark task complete in SPECS.md** - Change status to ✅ Completed
2. **Update relevant README files** - Every code change requires corresponding documentation updates:
   - Modified components → Update `src/components/README.md`
   - Modified hooks → Update `src/hooks/README.md`
   - Modified stores → Update `src/stores/README.md`
   - Modified canvas → Update `src/canvas/README.md`
   - Modified types → Update `src/types/README.md`
   - Modified utils → Update `src/utils/README.md`
   - New features → Update relevant READMEs with behavior, success criteria, and known issues
   - Add any development issues discovered to the appropriate README's "Known Issues" section
3. **Run all checks**:
    ```bash
    npx vitest run
    npm run lint
    npm run build
    ```
  4. **Stage changes**: `git add .`
  5. **Create commit with descriptive message** following format:
     ```
     <type>: <task name> - <brief description>
     
     - Implemented: <what was done>
     - Tests: <test coverage>
     - Documentation: <which READMEs were updated>
     - Closes Task #<number>
     ```
  6. **Show commit to user for approval** - Do NOT push without user confirmation
  7. **After approval**: Push branch and create PR (if applicable)

## Documentation Requirements

### README Update Rules

**MANDATORY**: Update README files for EVERY code change:

1. **Component Changes** (`src/components/README.md`):
   - Update component description if behavior changes
   - Update props interface
   - Add new success criteria
   - Document any new constraints
   - Add discovered issues to "Known Issues"

2. **Hook Changes** (`src/hooks/README.md`):
   - Update return interface
   - Document new state or methods
   - Update constraints and known issues

3. **Store Changes** (`src/stores/README.md`):
   - Update state interface
   - Document new actions
   - Add any new hardcoded values
   - Update constraints

4. **Canvas Changes** (`src/canvas/README.md`):
   - Document new rendering methods
   - Update shape type support
   - Add performance considerations

5. **Type Changes** (`src/types/README.md`):
   - Add new interfaces
   - Update union types
   - Document constants

6. **Util Changes** (`src/utils/README.md`):
   - Document new functions
   - Add usage examples
   - Note pure vs impure functions

### What to Document

For every change, document:
- **Behavior**: What it does, how it works
- **Success Criteria**: How to verify it works
- **Constraints**: Limitations, hardcoded values
- **Known Issues**: Bugs, technical debt, gotchas discovered during development
- **Dependencies**: What it depends on, what depends on it

### Development Issues

When you encounter issues during development:
1. Try to resolve them
2. If not resolvable in current task, add to appropriate README's "Known Issues" section
3. Include context: what you tried, why it didn't work, potential solutions

## Workflow Rules

### 1. Finish Previous Tasks First

**CRITICAL**: Always complete or properly hand off previous tasks before starting new ones:

1. **Check current state** - Review what was left incomplete
2. **Complete pending work** - Finish the previous task if possible
3. **Document status** - If handing off, document:
   - What was completed
   - What's still pending
   - Blockers or issues encountered
   - Next steps
4. **Update SPECS.md** - Mark status appropriately (✅ Completed, 🟡 In Progress, or 🔴 Not Started with notes)
5. **Update relevant READMEs** - Ensure documentation reflects current state
6. **Run all checks** - Tests, lint, build must pass
7. **Get user approval** - Before switching tasks

### 2. No Task Switching Without Completion

Do NOT start a new task when:
- Previous task has failing tests
- Previous task has lint errors
- Previous task breaks the build
- Previous task is partially implemented
- Documentation is not updated

Exception: User explicitly requests task switch after being informed of incomplete state.

### 3. Documentation is Part of the Task

README updates are NOT optional:
- Every code change requires README updates
- Task is not complete until documentation is updated
- "Done" = Code + Tests + Documentation all complete

### 4. Issue Tracking

When you discover issues (not related to current task):
1. Document in appropriate README's "Known Issues" section
2. If critical, notify user immediately
3. If related to current task, fix as part of task
4. Update SPECS.md if it's a new task to be scheduled
