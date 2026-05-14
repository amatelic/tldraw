import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import type { CanvasEngine } from '../../canvas/CanvasEngine';
import { screenToWorldPoint } from '../../canvas/CanvasEngine';
import { createPencilShapeAtPoint } from '../../canvas/shapeFactory';
import { createTextShapeAtPoint } from '../../document/shapeFactories';
import type { Bounds, CameraState, Point, Shape } from '../../types';
import { boundsIntersect, generateBounds } from '../../types/geometry';
import { isPointInShape } from '../../types/hitTesting';
import {
  getSelectableShapeBounds,
  getTopLevelSelectableShape,
  normalizeShapeIdsForSelection,
} from '../../types/selection';
import type { CanvasContextMenuState } from '../../components/CanvasContextMenu';
import {
  buildDraggedShapeUpdates,
  buildDragSessionShapes,
  type DragSessionShape,
} from './dragSession';
import {
  findResizeHandleAtPoint,
  resizeBoundsByHandle,
  type ShapeResizeHandle,
  type ShapeResizeSession,
} from './resizeSession';
import { useCanvasPanning } from './useCanvasPanning';
import {
  useCanvasTextEditing,
  type UseCanvasTextEditingResult,
} from './useCanvasTextEditing';

interface WritableRef<T> {
  current: T;
}

interface PointerLikeEvent {
  clientX: number;
  clientY: number;
}

interface UseCanvasInteractionsArgs {
  canvasRef: WritableRef<HTMLCanvasElement | null>;
  engineRef: WritableRef<CanvasEngine | null>;
  currentShapeRef: WritableRef<Shape | null>;
  shapes: Shape[];
  selectedIds: string[];
  tool: string;
  style: Shape['style'];
  camera: CameraState;
  isDragging: boolean;
  isDrawing: boolean;
  editingTextId: string | null;
  render: () => void;
  onShapeAdd: (shape: Shape) => void;
  onShapeUpdate: (id: string, updates: Partial<Shape>) => void;
  onShapeDelete: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
  onDraggingChange: (dragging: boolean) => void;
  onDrawingChange: (drawing: boolean) => void;
  onPan: (dx: number, dy: number) => void;
  onZoomAt: (screenPoint: Point, factor: number) => void;
  onTextEditStart: (id: string) => void;
  onTextEditCommit: () => void;
  onTextEditCancel: () => void;
  onCreationComplete?: () => void;
}

interface UseCanvasInteractionsResult {
  activeResizeHandle: ShapeResizeHandle | null;
  contextMenu: CanvasContextMenuState | null;
  editingShape: UseCanvasTextEditingResult['editingShape'];
  editingTypography: UseCanvasTextEditingResult['editingTypography'];
  hoveredResizeHandle: ShapeResizeHandle | null;
  isPanning: boolean;
  isSpacePressed: boolean;
  marqueeBounds: Bounds | null;
  textareaRef: UseCanvasTextEditingResult['textareaRef'];
  closeContextMenu: () => void;
  handleContextMenu: (event: ReactMouseEvent<HTMLCanvasElement>) => void;
  handleDoubleClick: (event: ReactMouseEvent<HTMLCanvasElement>) => void;
  handlePointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  handleTextChange: UseCanvasTextEditingResult['handleTextChange'];
  handleTextKeyDown: UseCanvasTextEditingResult['handleTextKeyDown'];
}

const DRAWING_TOOLS = new Set(['rectangle', 'circle', 'line', 'arrow', 'pencil']);

function capturePointer(event: ReactPointerEvent): void {
  const target = event.currentTarget as Element & {
    setPointerCapture?: (pointerId: number) => void;
  };
  target.setPointerCapture?.(event.pointerId);
}

function releasePointer(event: ReactPointerEvent): void {
  const target = event.currentTarget as Element & {
    hasPointerCapture?: (pointerId: number) => boolean;
    releasePointerCapture?: (pointerId: number) => void;
  };

  if (target.hasPointerCapture?.(event.pointerId) ?? false) {
    target.releasePointerCapture?.(event.pointerId);
  }
}

export function useCanvasInteractions({
  canvasRef,
  engineRef,
  currentShapeRef,
  shapes,
  selectedIds,
  tool,
  style,
  camera,
  isDragging,
  isDrawing,
  editingTextId,
  render,
  onShapeAdd,
  onShapeUpdate,
  onShapeDelete,
  onSelectionChange,
  onDraggingChange,
  onDrawingChange,
  onPan,
  onZoomAt,
  onTextEditStart,
  onTextEditCommit,
  onTextEditCancel,
  onCreationComplete,
}: UseCanvasInteractionsArgs): UseCanvasInteractionsResult {
  const {
    isPanning,
    isSpacePressed,
    shouldStartSpacePanning,
    startPanning,
    stopPanning,
    updatePanning,
  } = useCanvasPanning();
  const startPointRef = useRef<Point | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const dragSessionShapesRef = useRef<DragSessionShape[]>([]);
  const isDraggingRef = useRef(isDragging);
  const isDrawingRef = useRef(isDrawing);
  const toolRef = useRef(tool);
  const selectedIdsRef = useRef(selectedIds);
  const shapesRef = useRef(shapes);
  const styleRef = useRef(style);
  const cameraRef = useRef(camera);
  const editingTextIdRef = useRef(editingTextId);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);
  const [marqueeBounds, setMarqueeBounds] = useState<Bounds | null>(null);
  const marqueeStartRef = useRef<Point | null>(null);
  const marqueeModeRef = useRef<'replace' | 'add' | null>(null);
  const resizeSessionRef = useRef<ShapeResizeSession | null>(null);
  const [activeResizeHandle, setActiveResizeHandle] = useState<ShapeResizeHandle | null>(null);
  const [hoveredResizeHandle, setHoveredResizeHandle] = useState<ShapeResizeHandle | null>(null);
  const pendingAudioToggleRef = useRef<Extract<Shape, { type: 'audio' }> | null>(null);

  const closeContextMenu = useCallback((): void => {
    setContextMenu(null);
  }, []);

  const {
    editingShape,
    editingTypography,
    textareaRef,
    handleTextChange,
    handleTextKeyDown,
  } = useCanvasTextEditing({
    editingTextId,
    shapes,
    measurementRef: engineRef,
    onShapeDelete,
    onShapeUpdate,
    onTextEditCancel,
    onTextEditCommit,
  });

  useEffect(() => {
    isDraggingRef.current = isDragging;
    isDrawingRef.current = isDrawing;
    toolRef.current = tool;
    selectedIdsRef.current = selectedIds;
    shapesRef.current = shapes;
    styleRef.current = style;
    cameraRef.current = camera;
    editingTextIdRef.current = editingTextId;
  }, [camera, editingTextId, isDragging, isDrawing, selectedIds, shapes, style, tool]);

  const screenToWorld = useCallback(
    (point: Point): Point => {
      if (engineRef.current) {
        return engineRef.current.screenToWorld(point, cameraRef.current);
      }

      return screenToWorldPoint(point, cameraRef.current);
    },
    [engineRef]
  );

  const getPointerPoint = useCallback(
    (event: PointerLikeEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    },
    [canvasRef]
  );

  const findShapeAtPoint = useCallback((point: Point): Shape | null => {
    return [...shapesRef.current].reverse().find((shape) => isPointInShape(point, shape)) ?? null;
  }, []);

  const findSelectableShapeAtPoint = useCallback(
    (point: Point): Shape | null => {
      const hitShape = findShapeAtPoint(point);
      if (!hitShape) return null;

      return getTopLevelSelectableShape(hitShape.id, shapesRef.current);
    },
    [findShapeAtPoint]
  );

  const prepareDragSelection = useCallback((selectionIds: string[]): void => {
    dragSessionShapesRef.current = buildDragSessionShapes(selectionIds, shapesRef.current);
  }, []);

  const getMarqueeSelectionIds = useCallback((bounds: Bounds): string[] => {
    const intersectingIds = shapesRef.current
      .filter((shape) => {
        const selectableBounds = getSelectableShapeBounds(shape.id, shapesRef.current);
        return selectableBounds ? boundsIntersect(bounds, selectableBounds) : false;
      })
      .map((shape) => shape.id);

    return normalizeShapeIdsForSelection(intersectingIds, shapesRef.current);
  }, []);

  const findSelectedResizeHandle = useCallback((screenPoint: Point) => {
    if (toolRef.current !== 'select' || selectedIdsRef.current.length !== 1) {
      return null;
    }

    const selectedShape = shapesRef.current.find((shape) => shape.id === selectedIdsRef.current[0]);
    if (!selectedShape) {
      return null;
    }

    return findResizeHandleAtPoint(screenPoint, selectedShape, cameraRef.current);
  }, []);

  const updateHoveredResizeHandle = useCallback(
    (screenPoint: Point): void => {
      const nextHandle = findSelectedResizeHandle(screenPoint)?.handle ?? null;
      setHoveredResizeHandle((currentHandle) =>
        currentHandle === nextHandle ? currentHandle : nextHandle
      );
    },
    [findSelectedResizeHandle]
  );

  const toggleAudio = useCallback(
    (shape: Extract<Shape, { type: 'audio' }>): void => {
      let audio = audioElementsRef.current.get(shape.id);

      if (!audio) {
        audio = new Audio(shape.src);
        audio.loop = shape.loop || false;
        audioElementsRef.current.set(shape.id, audio);

        audio.onended = () => {
          if (!shape.loop) {
            onShapeUpdate(shape.id, { isPlaying: false });
          }
        };
      }

      if (shape.isPlaying) {
        audio.pause();
        onShapeUpdate(shape.id, { isPlaying: false });
      } else {
        audio.play().catch(() => {
          // Playback can be denied by the browser when user activation is unavailable.
        });
        onShapeUpdate(shape.id, { isPlaying: true });
      }
    },
    [onShapeUpdate]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      event.preventDefault();
      const screenPoint = getPointerPoint(event);
      const worldPoint = screenToWorld(screenPoint);
      pendingAudioToggleRef.current = null;

      if (editingTextIdRef.current) {
        onTextEditCommit();
        return;
      }

      if (event.button === 1 || shouldStartSpacePanning(event.button)) {
        capturePointer(event);
        startPanning(screenPoint);
        return;
      }

      if (event.button !== 0) {
        return;
      }

      if (toolRef.current === 'pan') {
        capturePointer(event);
        startPanning(screenPoint);
        return;
      }

      if (toolRef.current === 'select') {
        closeContextMenu();
        const resizeTarget = findSelectedResizeHandle(screenPoint);

        if (resizeTarget) {
          capturePointer(event);
          resizeSessionRef.current = {
            shapeId: resizeTarget.shape.id,
            handle: resizeTarget.handle,
            startWorldPoint: worldPoint,
            originalBounds: { ...resizeTarget.shape.bounds },
          };
          setActiveResizeHandle(resizeTarget.handle);
          setHoveredResizeHandle(resizeTarget.handle);
          onDraggingChange(true);
          return;
        }

        const clickedShape = findSelectableShapeAtPoint(worldPoint);

        if (clickedShape) {
          if (event.shiftKey) {
            const nextSelectionIds = selectedIdsRef.current.includes(clickedShape.id)
              ? selectedIdsRef.current.filter((id) => id !== clickedShape.id)
              : normalizeShapeIdsForSelection(
                  [...selectedIdsRef.current, clickedShape.id],
                  shapesRef.current
                );

            onSelectionChange(nextSelectionIds);
            return;
          }

          const nextSelectionIds = selectedIdsRef.current.includes(clickedShape.id)
            ? normalizeShapeIdsForSelection(selectedIdsRef.current, shapesRef.current)
            : [clickedShape.id];

          if (!selectedIdsRef.current.includes(clickedShape.id)) {
            onSelectionChange(nextSelectionIds);
          }

          if (
            clickedShape.type === 'audio' &&
            nextSelectionIds.length === 1 &&
            nextSelectionIds[0] === clickedShape.id
          ) {
            pendingAudioToggleRef.current = clickedShape;
          }

          capturePointer(event);
          onDraggingChange(true);
          dragStartRef.current = worldPoint;
          prepareDragSelection(nextSelectionIds);
          return;
        }

        capturePointer(event);
        marqueeStartRef.current = worldPoint;
        marqueeModeRef.current = event.shiftKey ? 'add' : 'replace';
        setMarqueeBounds(generateBounds(worldPoint, worldPoint));
        return;
      }

      if (DRAWING_TOOLS.has(toolRef.current)) {
        capturePointer(event);
        onDrawingChange(true);
        startPointRef.current = worldPoint;

        if (toolRef.current === 'pencil') {
          currentShapeRef.current = createPencilShapeAtPoint({
            point: worldPoint,
            style: styleRef.current,
          });
        }
        return;
      }

      if (toolRef.current === 'eraser') {
        const clickedShape = [...shapesRef.current]
          .reverse()
          .find((shape) => isPointInShape(worldPoint, shape));
        if (clickedShape) {
          onShapeDelete(clickedShape.id);
        }
        return;
      }

      if (toolRef.current === 'text') {
        const newShape = createTextShapeAtPoint({
          position: worldPoint,
          style: styleRef.current,
        });
        onShapeAdd(newShape);
        onSelectionChange([newShape.id]);
        onTextEditStart(newShape.id);
      }
    },
    [
      closeContextMenu,
      currentShapeRef,
      findSelectableShapeAtPoint,
      findSelectedResizeHandle,
      getPointerPoint,
      onDrawingChange,
      onDraggingChange,
      onSelectionChange,
      onShapeAdd,
      onShapeDelete,
      onTextEditCommit,
      onTextEditStart,
      prepareDragSelection,
      screenToWorld,
      shouldStartSpacePanning,
      startPanning,
    ]
  );

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>): void => {
      event.preventDefault();
      const screenPoint = getPointerPoint(event);
      const worldPoint = screenToWorld(screenPoint);
      const clickedShape = findShapeAtPoint(worldPoint);

      if (clickedShape && clickedShape.type === 'text') {
        if (editingTextIdRef.current && editingTextIdRef.current !== clickedShape.id) {
          onTextEditCommit();
        }
        onTextEditStart(clickedShape.id);
      }
    },
    [findShapeAtPoint, getPointerPoint, onTextEditCommit, onTextEditStart, screenToWorld]
  );

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>): void => {
      event.preventDefault();

      if (toolRef.current !== 'select' || editingTextIdRef.current) {
        closeContextMenu();
        return;
      }

      const screenPoint = getPointerPoint(event);
      const worldPoint = screenToWorld(screenPoint);
      const clickedShape = findSelectableShapeAtPoint(worldPoint);

      if (!clickedShape) {
        closeContextMenu();
        return;
      }

      if (!selectedIdsRef.current.includes(clickedShape.id)) {
        onSelectionChange([clickedShape.id]);
      }

      setContextMenu({
        x: screenPoint.x,
        y: screenPoint.y,
      });
    },
    [closeContextMenu, findSelectableShapeAtPoint, getPointerPoint, onSelectionChange, screenToWorld]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      event.preventDefault();
      const screenPoint = getPointerPoint(event);

      if (updatePanning(screenPoint, onPan)) {
        return;
      }

      const worldPoint = screenToWorld(screenPoint);

      if (resizeSessionRef.current) {
        const { shapeId, handle, startWorldPoint, originalBounds } = resizeSessionRef.current;
        const dx = worldPoint.x - startWorldPoint.x;
        const dy = worldPoint.y - startWorldPoint.y;
        const nextBounds = resizeBoundsByHandle(originalBounds, handle, dx, dy);

        onShapeUpdate(shapeId, { bounds: nextBounds });
        return;
      }

      if (toolRef.current === 'select' && marqueeStartRef.current) {
        setMarqueeBounds(generateBounds(marqueeStartRef.current, worldPoint));
        return;
      }

      if (toolRef.current === 'select' && !isDraggingRef.current && !isDrawingRef.current) {
        updateHoveredResizeHandle(screenPoint);
      }

      if (toolRef.current === 'select' && isDraggingRef.current) {
        if (dragStartRef.current) {
          const dx = worldPoint.x - dragStartRef.current.x;
          const dy = worldPoint.y - dragStartRef.current.y;

          if (pendingAudioToggleRef.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
            pendingAudioToggleRef.current = null;
          }

          dragSessionShapesRef.current.forEach(({ shape, startPosition }) => {
            onShapeUpdate(shape.id, buildDraggedShapeUpdates(shape, startPosition, dx, dy));
          });
        }
        return;
      }

      if (!isDrawingRef.current) {
        return;
      }

      if (toolRef.current === 'pencil' && currentShapeRef.current) {
        const pencilShape = currentShapeRef.current as Extract<Shape, { type: 'pencil' }>;
        pencilShape.points.push(worldPoint);
        const xs = pencilShape.points.map((point) => point.x);
        const ys = pencilShape.points.map((point) => point.y);
        pencilShape.bounds = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        };
        render();
        return;
      }

      if (startPointRef.current) {
        const engine = engineRef.current;
        if (engine) {
          currentShapeRef.current = engine.createShapeFromPoints(
            startPointRef.current,
            worldPoint,
            toolRef.current as Shape['type'],
            styleRef.current
          );
          render();
        }
      }
    },
    [
      currentShapeRef,
      engineRef,
      getPointerPoint,
      onPan,
      onShapeUpdate,
      render,
      screenToWorld,
      updateHoveredResizeHandle,
      updatePanning,
    ]
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      event.preventDefault();
      releasePointer(event);
      const screenPoint = getPointerPoint(event);
      const worldPoint = screenToWorld(screenPoint);

      if (stopPanning()) {
        return;
      }

      if (toolRef.current === 'select') {
        if (resizeSessionRef.current) {
          resizeSessionRef.current = null;
          setActiveResizeHandle(null);
          updateHoveredResizeHandle(screenPoint);
          onDraggingChange(false);
          return;
        }

        if (marqueeStartRef.current) {
          const nextMarqueeBounds = generateBounds(marqueeStartRef.current, worldPoint);
          const hasMeaningfulArea = nextMarqueeBounds.width > 2 || nextMarqueeBounds.height > 2;

          if (hasMeaningfulArea) {
            const marqueeSelectionIds = getMarqueeSelectionIds(nextMarqueeBounds);
            const nextSelectionIds =
              marqueeModeRef.current === 'add'
                ? normalizeShapeIdsForSelection(
                    [...selectedIdsRef.current, ...marqueeSelectionIds],
                    shapesRef.current
                  )
                : marqueeSelectionIds;

            onSelectionChange(nextSelectionIds);
          } else if (marqueeModeRef.current !== 'add') {
            onSelectionChange([]);
          }

          marqueeStartRef.current = null;
          marqueeModeRef.current = null;
          setMarqueeBounds(null);
          return;
        }

        if (pendingAudioToggleRef.current && dragStartRef.current) {
          const dx = worldPoint.x - dragStartRef.current.x;
          const dy = worldPoint.y - dragStartRef.current.y;
          if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) {
            toggleAudio(pendingAudioToggleRef.current);
          }
        }

        pendingAudioToggleRef.current = null;
        onDraggingChange(false);
        dragStartRef.current = null;
        dragSessionShapesRef.current = [];
        return;
      }

      if (isDrawingRef.current) {
        onDrawingChange(false);
        if (currentShapeRef.current) {
          const shape = currentShapeRef.current;
          if (
            shape.type === 'pencil'
              ? shape.points.length > 1
              : shape.bounds.width > 5 || shape.bounds.height > 5
          ) {
            onShapeAdd(shape);
            onCreationComplete?.();
          }
          currentShapeRef.current = null;
          startPointRef.current = null;
          render();
        }
      }
    },
    [
      currentShapeRef,
      getMarqueeSelectionIds,
      getPointerPoint,
      onDrawingChange,
      onDraggingChange,
      onSelectionChange,
      onShapeAdd,
      onCreationComplete,
      render,
      screenToWorld,
      stopPanning,
      toggleAudio,
      updateHoveredResizeHandle,
    ]
  );

  const handleWheel = useCallback(
    (event: WheelEvent): void => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const screenPoint = getPointerPoint(event);
        const factor = event.deltaY > 0 ? 0.9 : 1.1;
        onZoomAt(screenPoint, factor);
      } else {
        onPan(-event.deltaX, -event.deltaY);
      }
    },
    [getPointerPoint, onPan, onZoomAt]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [canvasRef, handleWheel]);

  return {
    activeResizeHandle,
    contextMenu,
    editingShape,
    editingTypography,
    hoveredResizeHandle,
    isPanning,
    isSpacePressed,
    marqueeBounds,
    textareaRef,
    closeContextMenu,
    handleContextMenu,
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTextChange,
    handleTextKeyDown,
  };
}
