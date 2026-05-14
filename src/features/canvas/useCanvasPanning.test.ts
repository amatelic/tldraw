import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCanvasPanning } from './useCanvasPanning';

describe('useCanvasPanning', () => {
  it('tracks Space as a temporary panning modifier outside text entry targets', () => {
    const { result } = renderHook(() => useCanvasPanning());
    const keyDown = new KeyboardEvent('keydown', {
      code: 'Space',
      cancelable: true,
    });

    act(() => {
      window.dispatchEvent(keyDown);
    });

    expect(keyDown.defaultPrevented).toBe(true);
    expect(result.current.isSpacePressed).toBe(true);
    expect(result.current.shouldStartSpacePanning(0)).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    });

    expect(result.current.isSpacePressed).toBe(false);
    expect(result.current.shouldStartSpacePanning(0)).toBe(false);
  });

  it('ignores Space presses from text entry targets', () => {
    const { result } = renderHook(() => useCanvasPanning());
    const input = document.createElement('input');
    const keyDown = new KeyboardEvent('keydown', {
      code: 'Space',
      bubbles: true,
      cancelable: true,
    });
    document.body.append(input);

    act(() => {
      input.dispatchEvent(keyDown);
    });

    expect(keyDown.defaultPrevented).toBe(false);
    expect(result.current.isSpacePressed).toBe(false);
    expect(result.current.shouldStartSpacePanning(0)).toBe(false);

    input.remove();
  });

  it('emits pan deltas while panning and stops consuming pointer moves after stop', () => {
    const onPan = vi.fn();
    const { result } = renderHook(() => useCanvasPanning());
    let consumed = false;

    act(() => {
      result.current.startPanning({ x: 10, y: 20 });
    });

    expect(result.current.isPanning).toBe(true);

    act(() => {
      consumed = result.current.updatePanning({ x: 25, y: 15 }, onPan);
    });

    expect(consumed).toBe(true);
    expect(onPan).toHaveBeenCalledWith(15, -5);

    act(() => {
      consumed = result.current.stopPanning();
    });

    expect(consumed).toBe(true);
    expect(result.current.isPanning).toBe(false);

    act(() => {
      consumed = result.current.updatePanning({ x: 40, y: 40 }, onPan);
    });

    expect(consumed).toBe(false);
    expect(onPan).toHaveBeenCalledTimes(1);
  });

  it('returns false when stopping without an active pan session', () => {
    const { result } = renderHook(() => useCanvasPanning());
    let stopped = true;

    act(() => {
      stopped = result.current.stopPanning();
    });

    expect(stopped).toBe(false);
    expect(result.current.isPanning).toBe(false);
  });
});
