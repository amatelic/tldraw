import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point } from '../../types';

interface UseCanvasPanningResult {
  isPanning: boolean;
  isSpacePressed: boolean;
  shouldStartSpacePanning: (button: number) => boolean;
  startPanning: (screenPoint: Point) => void;
  updatePanning: (screenPoint: Point, onPan: (deltaX: number, deltaY: number) => void) => boolean;
  stopPanning: () => boolean;
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

export function useCanvasPanning(): UseCanvasPanningResult {
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isPanningRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const lastPanPointRef = useRef<Point | null>(null);

  useEffect(() => {
    const setSpacePressedState = (nextSpacePressedState: boolean): void => {
      isSpacePressedRef.current = nextSpacePressedState;
      setIsSpacePressed(nextSpacePressedState);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isTextEntryTarget(event.target)) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        setSpacePressedState(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      if (event.code === 'Space') {
        setSpacePressedState(false);
      }
    };

    const handleBlur = (): void => {
      setSpacePressedState(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const shouldStartSpacePanning = useCallback((button: number): boolean => {
    return button === 0 && isSpacePressedRef.current;
  }, []);

  const startPanning = useCallback(
    (screenPoint: Point): void => {
      isPanningRef.current = true;
      setIsPanning(true);
      lastPanPointRef.current = screenPoint;
    },
    []
  );

  const updatePanning = useCallback(
    (screenPoint: Point, onPan: (deltaX: number, deltaY: number) => void): boolean => {
      if (!isPanningRef.current || !lastPanPointRef.current) {
        return false;
      }

      const deltaX = screenPoint.x - lastPanPointRef.current.x;
      const deltaY = screenPoint.y - lastPanPointRef.current.y;
      onPan(deltaX, deltaY);
      lastPanPointRef.current = screenPoint;
      return true;
    },
    []
  );

  const stopPanning = useCallback((): boolean => {
    if (!isPanningRef.current) {
      return false;
    }

    isPanningRef.current = false;
    setIsPanning(false);
    lastPanPointRef.current = null;
    return true;
  }, []);

  return {
    isPanning,
    isSpacePressed,
    shouldStartSpacePanning,
    startPanning,
    updatePanning,
    stopPanning,
  };
}
