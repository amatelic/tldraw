import { act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFloatingColorPicker } from './useFloatingColorPicker';

describe('useFloatingColorPicker', () => {
  let appHost: HTMLDivElement;
  let anchor: HTMLButtonElement;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    appHost = document.createElement('div');
    appHost.className = 'app';
    anchor = document.createElement('button');
    anchor.title = 'Edit stroke color';
    appHost.append(anchor);
    document.body.append(appHost);
  });

  afterEach(() => {
    appHost.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('positions the picker relative to the nearest app host', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const element = this as HTMLElement;

      if (element.classList.contains('app')) {
        return {
          x: 40,
          y: 20,
          top: 20,
          left: 40,
          bottom: 620,
          right: 840,
          width: 800,
          height: 600,
          toJSON: () => ({}),
        } as DOMRect;
      }

      if (element.title === 'Edit stroke color') {
        return {
          x: 680,
          y: 180,
          top: 180,
          left: 680,
          bottom: 220,
          right: 720,
          width: 40,
          height: 40,
          toJSON: () => ({}),
        } as DOMRect;
      }

      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });

    const activeFloatingPicker = { type: 'color' as const, key: 'stroke' as const };
    const getAnchorElement = () => anchor;
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useFloatingColorPicker({
        activeFloatingPicker,
        getAnchorElement,
        onClose,
      })
    );

    await waitFor(() => {
      expect(result.current.floatingPickerPortalHost).toBe(appHost);
    });
    expect(result.current.floatingPickerPosition).toMatchObject({
      position: 'absolute',
      left: '192px',
      top: '16px',
      width: '430px',
    });
  });

  it('closes on outside pointer and Escape interactions', () => {
    const onClose = vi.fn();
    const activeFloatingPicker = { type: 'color' as const, key: 'stroke' as const };
    const getAnchorElement = () => anchor;
    renderHook(() =>
      useFloatingColorPicker({
        activeFloatingPicker,
        getAnchorElement,
        onClose,
      })
    );

    act(() => {
      fireEvent.mouseDown(document.body);
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
