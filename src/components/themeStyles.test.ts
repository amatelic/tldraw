import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(__dirname, '..', '..');

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8');
}

describe('theme styles', () => {
  it('forces the app root to light color scheme', () => {
    const indexCss = readProjectFile('src/index.css');

    expect(indexCss).toContain('color-scheme: light;');
  });

  it('keeps the root element height-driven instead of viewport-locked for embeds', () => {
    const indexCss = readProjectFile('src/index.css');

    expect(indexCss).toContain('#root {');
    expect(indexCss).toContain('height: 100%;');
    expect(indexCss).not.toContain('min-height: 100vh;');
  });

  it('does not ship dark-mode media queries for floating inspector surfaces', () => {
    const colorPickerCss = readProjectFile('src/components/ColorPicker.css');
    const propertiesPanelCss = readProjectFile('src/components/PropertiesPanel.css');

    expect(colorPickerCss).not.toContain('@media (prefers-color-scheme: dark)');
    expect(propertiesPanelCss).not.toContain('@media (prefers-color-scheme: dark)');
  });

  it('uses container-based responsive rules so embedded shells can resize independently', () => {
    const appCss = readProjectFile('src/App.css');
    const propertiesPanelCss = readProjectFile('src/components/PropertiesPanel.css');

    expect(appCss).toContain('container-type: inline-size;');
    expect(appCss).toContain('@container app-shell (max-width: 768px)');
    expect(propertiesPanelCss).toContain('@container (max-width: 720px)');
  });
});
