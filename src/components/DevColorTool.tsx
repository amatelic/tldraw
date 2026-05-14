import { useCallback } from 'react';
import { useDevToolStore } from '../stores/devToolStore';
import './DevColorTool.css';

const COLOR_GROUPS = [
  {
    title: 'Surfaces',
    properties: [
      { key: '--surface-app', label: 'App Background' },
      { key: '--surface-panel', label: 'Panel Background' },
      { key: '--surface-panel-alt', label: 'Panel Alt' },
      { key: '--surface-header', label: 'Header Background' },
      { key: '--surface-canvas', label: 'Canvas Background' },
      { key: '--surface-hover', label: 'Hover State' },
      { key: '--surface-active', label: 'Active State' },
    ],
  },
  {
    title: 'Text',
    properties: [
      { key: '--text-primary', label: 'Primary Text' },
      { key: '--text-secondary', label: 'Secondary Text' },
      { key: '--text-muted', label: 'Muted Text' },
    ],
  },
  {
    title: 'Accent',
    properties: [
      { key: '--accent-blue', label: 'Accent Blue' },
      { key: '--accent-blue-strong', label: 'Accent Strong' },
    ],
  },
  {
    title: 'Borders',
    properties: [
      { key: '--border-subtle', label: 'Subtle Border' },
      { key: '--border-default', label: 'Default Border' },
      { key: '--border-strong', label: 'Strong Border' },
    ],
  },
];

function getComputedValue(key: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(key).trim();
}

export function DevColorTool(): React.JSX.Element | null {
  const { isOpen, overrides, setOverride, setOpen, resetOverrides, exportCSS } = useDevToolStore();

  const handleColorChange = useCallback(
    (key: string, value: string) => {
      setOverride(key, value);
    },
    [setOverride]
  );

  const handleReset = useCallback(() => {
    resetOverrides();
    // Clear all inline styles
    COLOR_GROUPS.forEach((group) => {
      group.properties.forEach((prop) => {
        document.documentElement.style.removeProperty(prop.key);
      });
    });
  }, [resetOverrides]);

  const handleExport = useCallback(() => {
    const css = `:root {\n${exportCSS()}\n}`;
    navigator.clipboard.writeText(css).catch(() => {
      console.warn('Failed to copy CSS to clipboard');
    });
  }, [exportCSS]);

  if (!isOpen) return null;

  return (
    <div className="dev-color-tool">
      <div className="dev-color-tool-header">
        <h3>Design Tokens</h3>
        <div className="dev-color-tool-actions">
          <button onClick={handleExport} className="dev-color-tool-action" title="Export CSS">
            Export
          </button>
          <button onClick={handleReset} className="dev-color-tool-action" title="Reset all">
            Reset
          </button>
          <button 
            onClick={() => setOpen(false)} 
            className="dev-color-tool-action dev-color-tool-close" 
            title="Close panel"
            aria-label="Close design tokens panel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="dev-color-tool-body">
        {COLOR_GROUPS.map((group) => (
          <div key={group.title} className="dev-color-group">
            <h4 className="dev-color-group-title">{group.title}</h4>
            {group.properties.map((prop) => {
              const currentValue = overrides[prop.key] || getComputedValue(prop.key);
              return (
                <div key={prop.key} className="dev-color-row">
                  <label className="dev-color-label">{prop.label}</label>
                  <div className="dev-color-input-wrap">
                    <input
                      type="color"
                      value={currentValue.startsWith('#') ? currentValue : '#000000'}
                      onChange={(e) => handleColorChange(prop.key, e.target.value)}
                      className="dev-color-picker"
                    />
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => handleColorChange(prop.key, e.target.value)}
                      className="dev-color-text"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
