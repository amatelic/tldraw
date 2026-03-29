import type { ToolType } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const tools: { id: ToolType; label: string; icon: string; shortcut: string }[] = [
  { id: 'select', label: 'Select (V)', icon: 'M5 3l14 9-5 1-4 8-5-1 3-15z', shortcut: 'V' },
  {
    id: 'pan',
    label: 'Pan (H)',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c4.41 0 8-3.59 8-8s-3.59-8-8-8-8 3.59-8 8 3.59 8 8 8z',
    shortcut: 'H',
  },
  { id: 'rectangle', label: 'Rectangle (R)', icon: 'M3 3h18v18H3V3z', shortcut: 'R' },
  {
    id: 'circle',
    label: 'Circle (C)',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
    shortcut: 'C',
  },
  { id: 'line', label: 'Line (L)', icon: 'M4 20L20 4', shortcut: 'L' },
  {
    id: 'freehand',
    label: 'Freehand (F)',
    icon: 'M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 18c4.41 0 8-3.59 8-8s-3.59-8-8-8-8 3.59-8 8 3.59 8 8 8z',
    shortcut: 'F',
  },
  {
    id: 'eraser',
    label: 'Eraser (E)',
    icon: 'M15.36 3.36a2.5 2.5 0 00-3.54 0L4.21 10.96a2.5 2.5 0 000 3.54l2.83 2.83a2.5 2.5 0 003.54 0L19.21 8.66a2.5 2.5 0 000-3.54l-3.85-3.76zM10 15.5l-2.83-2.83 5.3-5.3 2.83 2.83-5.3 5.3z',
    shortcut: 'E',
  },
  {
    id: 'image',
    label: 'Image (I)',
    icon: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
    shortcut: 'I',
  },
  {
    id: 'audio',
    label: 'Audio (A)',
    icon: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
    shortcut: 'A',
  },
  {
    id: 'text',
    label: 'Text (T)',
    icon: 'M4 7V5h16v2H4zm0 4h16v2H4v-2zm0 4h10v2H4v-2z',
    shortcut: 'T',
  },
];

export function Toolbar({ currentTool, onToolChange }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-content">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`toolbar-button ${currentTool === tool.id ? 'active' : ''}`}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={tool.icon} />
            </svg>
            <span className="toolbar-label">{tool.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
