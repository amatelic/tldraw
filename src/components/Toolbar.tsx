import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ToolType } from '../types';
import { Tooltip } from './Tooltip';

interface ToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

interface ToolDefinition {
  id: ToolType;
  label: string;
  icon: string;
  shortcut: string;
  inMoreMenu?: boolean;
}

// Primary tools shown in main toolbar
const primaryTools: ToolDefinition[] = [
  {
    id: 'select',
    label: 'Select',
    shortcut: 'V',
    icon: 'M5 3l14 9-5 1-4 8-5-1 3-15z',
  },
  {
    id: 'pan',
    label: 'Hand',
    shortcut: 'H',
    icon: 'M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11',
  },
  {
    id: 'pencil',
    label: 'Pencil',
    shortcut: 'D',
    icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
  },
  {
    id: 'eraser',
    label: 'Eraser',
    shortcut: 'E',
    icon: 'M15.36 3.36a2.5 2.5 0 00-3.54 0L4.21 10.96a2.5 2.5 0 000 3.54l2.83 2.83a2.5 2.5 0 003.54 0L19.21 8.66a2.5 2.5 0 000-3.54l-3.85-3.76zM10 15.5l-2.83-2.83 5.3-5.3 2.83 2.83-5.3 5.3z',
  },
  {
    id: 'arrow',
    label: 'Arrow',
    shortcut: 'A',
    icon: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z',
  },
  {
    id: 'text',
    label: 'Text',
    shortcut: 'T',
    icon: 'M4 7V5h16v2H4zm0 4h16v2H4v-2zm0 4h10v2H4v-2z',
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    shortcut: 'R',
    icon: 'M3 3h18v18H3V3z',
  },
  {
    id: 'circle',
    label: 'Circle',
    shortcut: 'C',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
  },
  {
    id: 'line',
    label: 'Line',
    shortcut: 'L',
    icon: 'M4 20L20 4',
  },
  {
    id: 'image',
    label: 'Image',
    shortcut: 'I',
    icon: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  },
];

// Additional tools shown in "More" menu
const moreTools: ToolDefinition[] = [
  {
    id: 'audio',
    label: 'Audio',
    shortcut: '',
    icon: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
    inMoreMenu: true,
  },
  {
    id: 'embed',
    label: 'Embed',
    shortcut: 'B',
    icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2h2v-4h4v-2h-4V7h-2v4H7v2h4z',
    inMoreMenu: true,
  },
];

// Animation variants for the more menu - ease-out for responsive feel
const menuVariants = {
  hidden: { 
    width: 0, 
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    }
  },
  visible: { 
    width: 'auto', 
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    }
  },
};

// Button container animation for staggered appearance
const buttonContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    }
  },
};

const buttonVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: -5,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    }
  },
};

export function Toolbar({ currentTool, onToolChange }: ToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToolClick = useCallback(
    (toolId: ToolType) => {
      onToolChange(toolId);
    },
    [onToolChange]
  );

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const renderToolButton = (tool: ToolDefinition) => (
    <Tooltip
      key={tool.id}
      content={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
      position="top"
    >
      <button
        className={`toolbar-button ${currentTool === tool.id ? 'active' : ''}`}
        onClick={() => handleToolClick(tool.id)}
        aria-label={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d={tool.icon} />
        </svg>
      </button>
    </Tooltip>
  );

  const renderAnimatedToolButton = (tool: ToolDefinition) => (
    <Tooltip
      key={tool.id}
      content={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
      position="top"
    >
      <motion.button
        variants={buttonVariants}
        className={`toolbar-button ${currentTool === tool.id ? 'active' : ''}`}
        onClick={() => handleToolClick(tool.id)}
        aria-label={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d={tool.icon} />
        </svg>
      </motion.button>
    </Tooltip>
  );

  return (
    <div className="toolbar">
      <div className="toolbar-content">
        {primaryTools.map(renderToolButton)}
        
        <Tooltip content={isExpanded ? 'Less' : 'More'} position="top">
          <button
            className={`toolbar-button toolbar-more-button ${isExpanded ? 'expanded' : ''}`}
            onClick={toggleExpanded}
            aria-label={isExpanded ? 'Show fewer tools' : 'Show more tools'}
            aria-expanded={isExpanded}
          >
            <motion.svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              animate={{ 
                rotate: isExpanded ? 180 : 0 
              }}
              transition={{ 
                duration: 0.2, 
                ease: [0.25, 0.46, 0.45, 0.94] as const
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </motion.svg>
          </button>
        </Tooltip>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              className="toolbar-more-menu"
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              style={{ overflow: 'hidden' }}
            >
              <motion.div
                variants={buttonContainerVariants}
                initial="hidden"
                animate="visible"
                style={{ display: 'flex', gap: '4px' }}
              >
                {moreTools.map(renderAnimatedToolButton)}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
