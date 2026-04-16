# Test Directory

This directory contains test configuration and setup files.

## Overview

Testing is done with Vitest + React Testing Library. Tests are co-located with source files, but this directory contains shared configuration.

Browser E2E coverage is handled separately with Playwright using `playwright.config.ts` and specs in the repo-level `e2e/` directory.
The Playwright setup prefers a locally installed `Google Chrome.app` on macOS to avoid Gatekeeper issues with older Homebrew Chromium installs. You can override the browser path with `PLAYWRIGHT_CHROME_PATH`.
Vitest is intentionally scoped to co-located tests under `src/` so it does not execute the Playwright `e2e/` specs.

## Files

| File | Purpose | Lines |
|------|---------|-------|
| `setup.ts` | Test environment setup | 1 |

## Configuration

### vitest.config.ts (in root)

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',      // Browser-like environment
    globals: true,             // Auto-import describe, it, expect
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

### setup.ts

```typescript
import '@testing-library/jest-dom';
```

Adds custom matchers like:
- `toBeInTheDocument()`
- `toHaveClass()`
- `toBeDisabled()`

## Test File Organization

Tests are co-located with source files:

```
src/
├── components/
│   ├── Toolbar.tsx
│   ├── Toolbar.test.tsx        ← Test for Toolbar
│   ├── Tooltip.tsx
│   ├── Tooltip.test.tsx        ← Test for Tooltip
│   └── ...
├── utils/
│   ├── audioProcessor.ts
│   └── audioProcessor.test.ts  ← Test for audioProcessor
└── ...
```

## Test Naming Convention

```typescript
describe('ComponentName', () => {
  describe('behavior group', () => {
    it('should do something specific', () => {
      // Test code
    });
    
    it('should handle edge case', () => {
      // Test code
    });
  });
});
```

## Testing Standards

### Unit Tests

For utility functions and pure logic:

```typescript
import { describe, it, expect } from 'vitest';
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
    // Test edge cases
  });
  
  it('should throw error for invalid input', () => {
    // Test error handling
  });
});
```

### Component Tests

For React components:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component prop="value" />);
    expect(screen.getByText('Expected Content')).toBeInTheDocument();
  });
  
  it('should handle user interaction', () => {
    const mockHandler = vi.fn();
    render(<Component onAction={mockHandler} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

### Async Tests

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';

describe('AsyncComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should show tooltip after delay', async () => {
    render(<Tooltip content="Hello" delay={300}><button>Hover</button></Tooltip>);
    
    fireEvent.mouseEnter(screen.getByRole('button'));
    
    // Advance timers
    vi.advanceTimersByTime(300);
    
    // Wait for state update
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });
});
```

## Mocking

### Mock Browser APIs

```typescript
// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock AudioContext
class MockAudioContext {
  decodeAudioData = vi.fn().mockResolvedValue({
    getChannelData: () => new Float32Array([0.1, 0.2, 0.3]),
    duration: 60,
  });
}
global.AudioContext = MockAudioContext;

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
});
```

### Mock Modules

```typescript
// Mock zustand store
vi.mock('../stores/workspaceStore', () => ({
  useWorkspaceStore: () => ({
    workspaces: [],
    addWorkspace: vi.fn(),
    // ...
  }),
}));
```

### Mock Components

```typescript
vi.mock('./Tooltip', () => ({
  Tooltip: ({ children }) => <>{children}</>,
}));
```

## Running Tests

```bash
# Run all tests once
npm test

# Run browser E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- Toolbar

# Run tests matching pattern
npm test -- --grep "should render"
```

## Coverage Requirements

Minimum 80% coverage for:
- Lines
- Functions
- Branches
- Statements

View coverage report:
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

## Testing Philosophy

1. **Test Behavior, Not Implementation**: Test what component does, not how
2. **Test Edge Cases**: Empty arrays, null values, boundaries
3. **Use E2E for persistence/runtime regressions**: When a bug depends on browser storage, hydration, or full-app wiring, prefer a focused Playwright regression
3. **Test User Interactions**: Click, type, hover as user would
4. **Mock External Dependencies**: Don't test browser APIs or libraries
5. **Keep Tests Fast**: Avoid real timers, network requests
6. **Maintainable Tests**: Tests should be easy to understand and update

## Common Patterns

### Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react';

const { result } = renderHook(() => useMyHook());

act(() => {
  result.current.doSomething();
});

expect(result.current.value).toBe('expected');
```

### Testing with Context

```typescript
render(
  <MyContext.Provider value={mockValue}>
    <Component />
  </MyContext.Provider>
);
```

### Testing Error Boundaries

```typescript
const ThrowError = () => {
  throw new Error('Test error');
};

render(
  <ErrorBoundary>
    <ThrowError />
  </ErrorBoundary>
);

expect(screen.getByText('Something went wrong')).toBeInTheDocument();
```

## Debugging Tests

```bash
# Debug specific test
npm test -- --reporter=verbose Toolbar

# Debug with logs
npm test -- --reporter=verbose --logHeapUsage

# Run in Node debugger
node --inspect-brk node_modules/.bin/vitest run
```

## Adding New Tests

1. Create `ComponentName.test.tsx` next to component
2. Import testing utilities
3. Write describe/it blocks
4. Use Arrange-Act-Assert pattern
5. Run tests to verify
6. Check coverage report

## Success Criteria

- [ ] All new code has tests
- [ ] 80%+ coverage maintained
- [ ] Tests pass in CI
- [ ] Tests are fast (< 100ms each)
- [ ] Tests are deterministic
- [ ] No console warnings in tests

## Constraints

- Tests run in jsdom (browser-like, not real browser)
- Canvas not available (mock or use node-canvas)
- localStorage is mock-only
- Timers are fake by default in tests

## Known Issues

None currently.

## Best Practices

1. **Co-locate Tests**: Keep test files next to source files
2. **Descriptive Names**: Test names should read like sentences
3. **One Assertion Per Test**: Ideally (though multiple is okay)
4. **Use Setup/Teardown**: beforeEach/afterEach for common setup
5. **Clean Mocks**: Clear mocks between tests
6. **Test IDs**: Use data-testid sparingly, prefer role/text queries
