import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ActiveFloatingPicker } from './types';

const FLOATING_PICKER_WIDTH = 430;
const FLOATING_PICKER_GAP = 18;
const FLOATING_PICKER_MARGIN = 16;

interface UseFloatingColorPickerOptions {
  activeFloatingPicker: ActiveFloatingPicker | null;
  getAnchorElement: () => HTMLButtonElement | null;
  onClose: () => void;
}

interface UseFloatingColorPickerResult {
  floatingPickerPortalHost: HTMLElement | null;
  floatingPickerPosition: CSSProperties;
}

function getFloatingPickerPortalHost(anchorElement: HTMLElement | null): HTMLElement | null {
  return anchorElement?.closest<HTMLElement>('.app') ?? null;
}

export function useFloatingColorPicker({
  activeFloatingPicker,
  getAnchorElement,
  onClose,
}: UseFloatingColorPickerOptions): UseFloatingColorPickerResult {
  const [floatingPickerStyle, setFloatingPickerStyle] = useState<{ top: number; left: number } | null>(null);
  const [floatingPickerPortalHost, setFloatingPickerPortalHost] = useState<HTMLElement | null>(null);

  const updateFloatingPickerPosition = useCallback(() => {
    const anchorElement = getAnchorElement();
    if (!anchorElement) {
      setFloatingPickerStyle(null);
      setFloatingPickerPortalHost(null);
      return;
    }

    const rect = anchorElement.getBoundingClientRect();
    const portalHost = getFloatingPickerPortalHost(anchorElement);
    const hostRect = portalHost?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const anchorLeft = rect.left - hostRect.left;
    const anchorRight = rect.right - hostRect.left;
    const anchorTop = rect.top - hostRect.top;
    const availableWidth = hostRect.width;
    const availableHeight = hostRect.height;
    const preferredLeft = anchorLeft - FLOATING_PICKER_WIDTH - FLOATING_PICKER_GAP;
    const fallbackLeft = anchorRight + FLOATING_PICKER_GAP;
    const left =
      preferredLeft >= FLOATING_PICKER_MARGIN
        ? preferredLeft
        : fallbackLeft + FLOATING_PICKER_WIDTH <= availableWidth - FLOATING_PICKER_MARGIN
          ? fallbackLeft
          : Math.max(
              FLOATING_PICKER_MARGIN,
              Math.min(
                anchorLeft + rect.width / 2 - FLOATING_PICKER_WIDTH / 2,
                availableWidth - FLOATING_PICKER_WIDTH - FLOATING_PICKER_MARGIN
              )
            );
    const estimatedHeight = 520;
    const top = Math.max(
      FLOATING_PICKER_MARGIN,
      Math.min(
        anchorTop + rect.height / 2 - estimatedHeight / 2,
        availableHeight - estimatedHeight - FLOATING_PICKER_MARGIN
      )
    );

    setFloatingPickerPortalHost(portalHost);
    setFloatingPickerStyle({ top, left });
  }, [getAnchorElement]);

  useEffect(() => {
    if (!activeFloatingPicker) return;

    const anchorElement = getAnchorElement();
    const portalHost = getFloatingPickerPortalHost(anchorElement);
    const handleViewportChange = () => {
      updateFloatingPickerPosition();
    };

    const animationFrameId = requestAnimationFrame(updateFloatingPickerPosition);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            updateFloatingPickerPosition();
          });

    if (resizeObserver) {
      if (anchorElement) {
        resizeObserver.observe(anchorElement);
      }
      if (portalHost) {
        resizeObserver.observe(portalHost);
      }
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      resizeObserver?.disconnect();
    };
  }, [activeFloatingPicker, getAnchorElement, updateFloatingPickerPosition]);

  useEffect(() => {
    if (!activeFloatingPicker) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const anchorElement = getAnchorElement();
      if (anchorElement?.contains(target)) return;

      const pickerLayer = document.querySelector('.floating-color-picker-layer');
      if (pickerLayer?.contains(target)) return;

      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [activeFloatingPicker, getAnchorElement, onClose]);

  return {
    floatingPickerPortalHost,
    floatingPickerPosition: {
      position: floatingPickerPortalHost ? 'absolute' : 'fixed',
      top: `${floatingPickerStyle?.top ?? FLOATING_PICKER_MARGIN}px`,
      left: `${floatingPickerStyle?.left ?? FLOATING_PICKER_MARGIN}px`,
      width: `${FLOATING_PICKER_WIDTH}px`,
    },
  };
}
