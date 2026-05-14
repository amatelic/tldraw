import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(__dirname, '..', '..');

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8');
}

describe('AppShell layout styles', () => {
  it('keeps the sidebar layout with header offset', () => {
    const appCss = readProjectFile('src/App.css');

    expect(appCss).toMatch(/\.app-main\s*{[^}]*left: 260px;/s);
    expect(appCss).toMatch(/\.app-header\s*{[^}]*left: 260px;/s);
  });

  it('positions the right panel from the top', () => {
    const appCss = readProjectFile('src/App.css');

    expect(appCss).toMatch(
      /\.properties-panel-wrapper\s*{[^}]*top: 84px;/s
    );
  });
});
