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

- No test framework is currently configured
- Port 5175 is hardcoded in Vite config
- Uses localStorage for persistence via Zustand
- Canvas rendering uses custom `CanvasEngine` class
