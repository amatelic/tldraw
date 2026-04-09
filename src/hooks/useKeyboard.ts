import { useEffect, useCallback } from 'react';
import type { ToolType } from '../types';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description: string;
  preventDefault?: boolean;
}

export interface KeyboardActions {
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  clearSelection: () => void;
  setTool: (tool: ToolType) => void;
}

export function useKeyboard(actions: KeyboardActions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'z',
          ctrl: true,
          handler: actions.undo,
          description: 'Undo',
          preventDefault: true,
        },
        {
          key: 'y',
          ctrl: true,
          handler: actions.redo,
          description: 'Redo',
          preventDefault: true,
        },
        {
          key: 'z',
          ctrl: true,
          shift: true,
          handler: actions.redo,
          description: 'Redo (Ctrl+Shift+Z)',
          preventDefault: true,
        },
        {
          key: 'Delete',
          handler: actions.deleteSelected,
          description: 'Delete selected',
          preventDefault: true,
        },
        {
          key: 'Backspace',
          handler: actions.deleteSelected,
          description: 'Delete selected',
          preventDefault: true,
        },
        {
          key: 'Escape',
          handler: actions.clearSelection,
          description: 'Clear selection',
          preventDefault: true,
        },
        {
          key: 'v',
          handler: () => actions.setTool('select'),
          description: 'Select tool',
        },
        {
          key: 'h',
          handler: () => actions.setTool('pan'),
          description: 'Pan tool',
        },
        {
          key: 'r',
          handler: () => actions.setTool('rectangle'),
          description: 'Rectangle tool',
        },
        {
          key: 'c',
          handler: () => actions.setTool('circle'),
          description: 'Circle tool',
        },
        {
          key: 'l',
          handler: () => actions.setTool('line'),
          description: 'Line tool',
        },
        {
          key: 'd',
          handler: () => actions.setTool('pencil'),
          description: 'Pencil tool',
        },
        {
          key: 'e',
          handler: () => actions.setTool('eraser'),
          description: 'Eraser tool',
        },
        {
          key: 'a',
          handler: () => actions.setTool('arrow'),
          description: 'Arrow tool',
        },
        {
          key: 'i',
          handler: () => actions.setTool('image'),
          description: 'Image tool',
        },
        {
          key: 't',
          handler: () => actions.setTool('text'),
          description: 'Text tool',
        },
      ];

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const shiftMatch = !!shortcut.shift === e.shiftKey;
        const altMatch = !!shortcut.alt === e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (shortcut.preventDefault) {
            e.preventDefault();
          }
          shortcut.handler();
          return;
        }
      }
    },
    [actions]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const keyboardShortcuts = [
  { keys: ['V'], description: 'Select tool' },
  { keys: ['H'], description: 'Pan tool' },
  { keys: ['R'], description: 'Rectangle tool' },
  { keys: ['C'], description: 'Circle tool' },
  { keys: ['L'], description: 'Line tool' },
  { keys: ['A'], description: 'Arrow tool' },
  { keys: ['D'], description: 'Pencil tool' },
  { keys: ['E'], description: 'Eraser tool' },
  { keys: ['I'], description: 'Image tool' },
  { keys: ['T'], description: 'Text tool' },
  { keys: ['Ctrl', 'Z'], description: 'Undo' },
  { keys: ['Ctrl', 'Y'], description: 'Redo' },
  { keys: ['Delete'], description: 'Delete selected' },
  { keys: ['Escape'], description: 'Clear selection' },
  { keys: ['Space'], description: 'Pan (hold + drag)' },
  { keys: ['Middle Click'], description: 'Pan' },
];
