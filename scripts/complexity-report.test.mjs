import { describe, expect, it } from 'vitest';
import {
  analyzeSourceText,
  createComplexityReport,
  formatComplexityReport,
} from './complexity-report.mjs';

describe('complexity report', () => {
  it('reports hook simplicity warnings for oversized custom hooks', () => {
    const source = `
      import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

      export function useBusyHook() {
        const a = useState(1);
        const b = useState(2);
        const c = useRef(null);
        const d = useMemo(() => a, [a]);
        const e = useCallback(() => d, [d]);
        useEffect(() => {
          console.log(b, c, e);
        }, [b, c, e]);
        return { a, b, c, d, e };
      }
    `;

    const report = analyzeSourceText('src/hooks/useBusyHook.ts', source, {
      sourceFileLines: 100,
      componentLines: 100,
      hookFileLines: 100,
      hookFunctionLines: 100,
      hookCallCount: 3,
    });

    expect(report.largeHooks).toEqual([
      expect.objectContaining({
        filePath: 'src/hooks/useBusyHook.ts',
        name: 'useBusyHook',
        hookCalls: 6,
        hookCallLimit: 3,
      }),
    ]);
  });

  it('reports large components and disabled lint directives', () => {
    const componentLines = Array.from({ length: 12 }, (_, index) => `        <span>${index}</span>`).join('\n');
    const source = `
      // eslint-disable-next-line react-hooks/exhaustive-deps
      export function LargePanel() {
        return (
          <section>
${componentLines}
          </section>
        );
      }
    `;

    const report = analyzeSourceText('src/components/LargePanel.tsx', source, {
      sourceFileLines: 100,
      componentLines: 8,
      hookFileLines: 100,
      hookFunctionLines: 100,
      hookCallCount: 10,
    });

    expect(report.largeComponents).toEqual([
      expect.objectContaining({
        filePath: 'src/components/LargePanel.tsx',
        name: 'LargePanel',
        limit: 8,
      }),
    ]);
    expect(report.lintDisableDirectives).toEqual([
      expect.objectContaining({
        line: 2,
        rules: 'react-hooks/exhaustive-deps',
      }),
    ]);
  });

  it('does not report eslint-disable text inside strings as disabled lint directives', () => {
    const report = analyzeSourceText(
      'src/utils/example.ts',
      'const fixture = `// eslint-disable-next-line no-console`;',
      {
        sourceFileLines: 100,
        componentLines: 100,
        hookFileLines: 100,
        hookFunctionLines: 100,
        hookCallCount: 10,
      }
    );

    expect(report.lintDisableDirectives).toEqual([]);
  });

  it('formats reports as advisory unless strict mode is requested', () => {
    const report = createComplexityReport([
      {
        filePath: 'src/hooks/useTinyHook.ts',
        source: 'export function useTinyHook() { return null; }',
      },
    ]);

    expect(formatComplexityReport(report)).toContain('Mode: advisory');
    expect(formatComplexityReport(report, { strict: true })).toContain('Mode: strict');
  });
});
