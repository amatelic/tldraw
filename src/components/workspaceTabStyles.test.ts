import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(__dirname, '..', '..');

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8');
}

describe('workspace tab hover styles', () => {
  it('does not animate the tab shell on hover', () => {
    const workspaceTabSource = readProjectFile('src/components/WorkspaceTab.tsx');

    expect(workspaceTabSource).not.toContain('whileHover=');
  });

  it('keeps the close affordance visible without hover-only CSS', () => {
    const appCss = readProjectFile('src/App.css');

    expect(appCss).not.toContain('.workspace-tab:hover {');
    expect(appCss).not.toContain('.workspace-tab:hover .workspace-tab-close');
    expect(appCss).toContain('opacity: 1;');
    expect(appCss).toContain('pointer-events: auto;');
  });
});
