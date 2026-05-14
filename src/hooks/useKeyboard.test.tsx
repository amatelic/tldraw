import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KeyboardActions } from './useKeyboard';
import { useKeyboard } from './useKeyboard';

function createActions(): KeyboardActions {
  return {
    undo: vi.fn(),
    redo: vi.fn(),
    deleteSelected: vi.fn(),
    clearSelection: vi.fn(),
    setTool: vi.fn(),
    groupSelected: vi.fn(),
    ungroupSelected: vi.fn(),
  };
}

function dispatchKeyDown(
  target: EventTarget,
  options: KeyboardEventInit & { key: string }
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...options,
  });

  target.dispatchEvent(event);
  return event;
}

describe('useKeyboard', () => {
  let actions: KeyboardActions;

  beforeEach(() => {
    actions = createActions();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('runs undo and redo shortcuts with platform modifiers', () => {
    const { unmount } = renderHook(() => useKeyboard(actions));

    const undoEvent = dispatchKeyDown(window, { key: 'z', ctrlKey: true });
    const redoEvent = dispatchKeyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    dispatchKeyDown(window, { key: 'y', metaKey: true });

    expect(actions.undo).toHaveBeenCalledTimes(1);
    expect(actions.redo).toHaveBeenCalledTimes(2);
    expect(undoEvent.defaultPrevented).toBe(true);
    expect(redoEvent.defaultPrevented).toBe(true);

    unmount();
  });

  it('runs destructive and selection shortcuts without requiring modifiers', () => {
    const { unmount } = renderHook(() => useKeyboard(actions));

    const deleteEvent = dispatchKeyDown(window, { key: 'Delete' });
    dispatchKeyDown(window, { key: 'Backspace' });
    const escapeEvent = dispatchKeyDown(window, { key: 'Escape' });

    expect(actions.deleteSelected).toHaveBeenCalledTimes(2);
    expect(actions.clearSelection).toHaveBeenCalledTimes(1);
    expect(deleteEvent.defaultPrevented).toBe(true);
    expect(escapeEvent.defaultPrevented).toBe(true);

    unmount();
  });

  it('switches tools from single-key shortcuts case-insensitively', () => {
    const { unmount } = renderHook(() => useKeyboard(actions));

    dispatchKeyDown(window, { key: 'V' });
    dispatchKeyDown(window, { key: 'h' });
    dispatchKeyDown(window, { key: 'R' });
    dispatchKeyDown(window, { key: 'c' });
    dispatchKeyDown(window, { key: 'L' });
    dispatchKeyDown(window, { key: 'd' });
    dispatchKeyDown(window, { key: 'E' });
    dispatchKeyDown(window, { key: 'a' });
    dispatchKeyDown(window, { key: 'I' });
    dispatchKeyDown(window, { key: 't' });

    expect(actions.setTool).toHaveBeenNthCalledWith(1, 'select');
    expect(actions.setTool).toHaveBeenNthCalledWith(2, 'pan');
    expect(actions.setTool).toHaveBeenNthCalledWith(3, 'rectangle');
    expect(actions.setTool).toHaveBeenNthCalledWith(4, 'circle');
    expect(actions.setTool).toHaveBeenNthCalledWith(5, 'line');
    expect(actions.setTool).toHaveBeenNthCalledWith(6, 'pencil');
    expect(actions.setTool).toHaveBeenNthCalledWith(7, 'eraser');
    expect(actions.setTool).toHaveBeenNthCalledWith(8, 'arrow');
    expect(actions.setTool).toHaveBeenNthCalledWith(9, 'image');
    expect(actions.setTool).toHaveBeenNthCalledWith(10, 'text');

    unmount();
  });

  it('routes group and ungroup shortcuts to separate actions', () => {
    const { unmount } = renderHook(() => useKeyboard(actions));

    dispatchKeyDown(window, { key: 'g', ctrlKey: true });
    dispatchKeyDown(window, { key: 'g', ctrlKey: true, shiftKey: true });

    expect(actions.groupSelected).toHaveBeenCalledTimes(1);
    expect(actions.ungroupSelected).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('does not run matching shortcuts from text-entry targets', () => {
    const { unmount } = renderHook(() => useKeyboard(actions));
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    document.body.append(input, textarea, editable);

    dispatchKeyDown(window, { key: 'r' });
    expect(actions.setTool).toHaveBeenCalledWith('rectangle');
    vi.clearAllMocks();

    dispatchKeyDown(input, { key: 'z', ctrlKey: true });
    expect(actions.undo).not.toHaveBeenCalled();

    dispatchKeyDown(textarea, { key: 'Delete' });
    expect(actions.deleteSelected).not.toHaveBeenCalled();

    dispatchKeyDown(editable, { key: 'r' });
    expect(actions.setTool).not.toHaveBeenCalled();

    unmount();
  });

  it('removes the global listener when unmounted', () => {
    const { unmount } = renderHook(() => useKeyboard(actions));

    unmount();
    dispatchKeyDown(window, { key: 'v' });

    expect(actions.setTool).not.toHaveBeenCalled();
  });
});
