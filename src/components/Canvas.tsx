import { useRef, useEffect, useCallback } from 'react';
import type { Point, Shape } from '../types';
import { CanvasEngine } from '../canvas/CanvasEngine';
import { createShapeId } from '../types';

interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  shapes: Shape[];
  selectedIds: string[];
  tool: string;
  style: Shape['style'];
  camera: { x: number; y: number; zoom: number };
  isDragging: boolean;
  isDrawing: boolean;
  onShapeAdd: (shape: Shape) => void;
  onShapeUpdate: (id: string, updates: Partial<Shape>) => void;
  onShapeDelete: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
  onDraggingChange: (dragging: boolean) => void;
  onDrawingChange: (drawing: boolean) => void;
  onPan: (dx: number, dy: number) => void;
  screenToWorld: (point: Point) => Point;
}

export function Canvas({
  canvasRef,
  shapes,
  selectedIds,
  tool,
  style,
  camera,
  isDragging,
  isDrawing,
  onShapeAdd,
  onShapeUpdate,
  onShapeDelete,
  onSelectionChange,
  onDraggingChange,
  onDrawingChange,
  onPan,
  screenToWorld,
}: CanvasProps) {
  const engineRef = useRef<CanvasEngine | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const currentShapeRef = useRef<Shape | null>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<Point | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const selectedShapesStartRef = useRef<Map<string, Point>>(new Map());
  const isDraggingRef = useRef(isDragging);
  const isDrawingRef = useRef(isDrawing);
  const toolRef = useRef(tool);
  const selectedIdsRef = useRef(selectedIds);
  const shapesRef = useRef(shapes);
  const styleRef = useRef(style);
  const cameraRef = useRef(camera);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Update refs when props change
  useEffect(() => {
    isDraggingRef.current = isDragging;
    isDrawingRef.current = isDrawing;
    toolRef.current = tool;
    selectedIdsRef.current = selectedIds;
    shapesRef.current = shapes;
    styleRef.current = style;
    cameraRef.current = camera;
  }, [isDragging, isDrawing, tool, selectedIds, shapes, style, camera]);

  // Render function - defined before use
  const render = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    engine.clear();
    engine.drawGrid(cameraRef.current);
    engine.applyCamera(cameraRef.current);

    shapesRef.current.forEach((shape) => {
      const isSelected = selectedIdsRef.current.includes(shape.id);
      engine.drawShape(shape, isSelected);
    });

    // Draw preview shape while drawing
    if (currentShapeRef.current) {
      engine.drawShape(currentShapeRef.current, false);
    }

    engine.restoreCamera();
  }, []);

  // Initialize engine
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new CanvasEngine(canvasRef.current);
      render();
    }

    const handleResize = () => {
      engineRef.current?.resize();
      render();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // Re-render when shapes change
  useEffect(() => {
    render();
  }, [shapes, render]);

  const getPointerPoint = useCallback(
    (e: React.PointerEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [canvasRef]
  );

  // Check if a point is inside a shape
  const isPointInShape = (point: Point, shape: Shape): boolean => {
    switch (shape.type) {
      case 'rectangle':
        return (
          point.x >= shape.bounds.x &&
          point.x <= shape.bounds.x + shape.bounds.width &&
          point.y >= shape.bounds.y &&
          point.y <= shape.bounds.y + shape.bounds.height
        );
      case 'circle': {
        const dx = point.x - shape.center.x;
        const dy = point.y - shape.center.y;
        return dx * dx + dy * dy <= shape.radius * shape.radius;
      }
      case 'line': {
        const { start, end } = shape;
        const lineLength = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        if (lineLength === 0) return false;
        const t =
          ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) /
          lineLength ** 2;
        const closestX = start.x + t * (end.x - start.x);
        const closestY = start.y + t * (end.y - start.y);
        const distance = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
        return distance <= 5;
      }
      case 'freehand':
        return shape.points.some((p) => {
          const d = Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2);
          return d <= 10;
        });
      case 'image':
      case 'audio':
        return (
          point.x >= shape.bounds.x &&
          point.x <= shape.bounds.x + shape.bounds.width &&
          point.y >= shape.bounds.y &&
          point.y <= shape.bounds.y + shape.bounds.height
        );
      default:
        return false;
    }
  };

  // Toggle audio playback
  const toggleAudio = useCallback(
    (shape: Extract<Shape, { type: 'audio' }>) => {
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
        audio.play().catch((err) => {
          console.error('Failed to play audio:', err);
        });
        onShapeUpdate(shape.id, { isPlaying: true });
      }
    },
    [onShapeUpdate]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const screenPoint = getPointerPoint(e);
      const worldPoint = screenToWorld(screenPoint);

      // Middle mouse or Space + drag for panning
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        isPanningRef.current = true;
        lastPanPointRef.current = screenPoint;
        return;
      }

      // Left click for tools
      if (e.button === 0) {
        if (toolRef.current === 'pan') {
          isPanningRef.current = true;
          lastPanPointRef.current = screenPoint;
          return;
        } else if (toolRef.current === 'select') {
          // Check if clicking on a shape
          const clickedShape = [...shapesRef.current]
            .reverse()
            .find((s) => isPointInShape(worldPoint, s));

          if (clickedShape) {
            // Handle audio playback toggle
            if (clickedShape.type === 'audio') {
              toggleAudio(clickedShape as Extract<Shape, { type: 'audio' }>);
              return;
            }

            if (!selectedIdsRef.current.includes(clickedShape.id)) {
              onSelectionChange([clickedShape.id]);
            }
            onDraggingChange(true);
            dragStartRef.current = worldPoint;
            // Store initial positions of selected shapes
            selectedShapesStartRef.current = new Map(
              selectedIdsRef.current.map((id) => {
                const shape = shapesRef.current.find((s) => s.id === id);
                if (shape) {
                  return [id, { x: shape.bounds.x, y: shape.bounds.y }];
                }
                return [id, { x: 0, y: 0 }];
              })
            );
          } else {
            onSelectionChange([]);
          }
        } else if (['rectangle', 'circle', 'line', 'freehand'].includes(toolRef.current)) {
          onDrawingChange(true);
          startPointRef.current = worldPoint;

          if (toolRef.current === 'freehand') {
            const newShape: Shape = {
              id: createShapeId(),
              type: 'freehand',
              bounds: { x: worldPoint.x, y: worldPoint.y, width: 0, height: 0 },
              points: [worldPoint],
              style: { ...styleRef.current },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            currentShapeRef.current = newShape;
          }
        } else if (toolRef.current === 'eraser') {
          const clickedShape = [...shapesRef.current]
            .reverse()
            .find((s) => isPointInShape(worldPoint, s));
          if (clickedShape) {
            onShapeDelete(clickedShape.id);
          }
        }
      }
    },
    [
      screenToWorld,
      onSelectionChange,
      onDraggingChange,
      onDrawingChange,
      onShapeDelete,
      onShapeUpdate,
      toggleAudio,
      getPointerPoint,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const screenPoint = getPointerPoint(e);

      if (isPanningRef.current && lastPanPointRef.current) {
        const dx = screenPoint.x - lastPanPointRef.current.x;
        const dy = screenPoint.y - lastPanPointRef.current.y;
        onPan(dx, dy);
        lastPanPointRef.current = screenPoint;
        return;
      }

      const worldPoint = screenToWorld(screenPoint);

      if (toolRef.current === 'select' && isDraggingRef.current) {
        if (dragStartRef.current) {
          const dx = worldPoint.x - dragStartRef.current.x;
          const dy = worldPoint.y - dragStartRef.current.y;

          selectedIdsRef.current.forEach((id) => {
            const startPos = selectedShapesStartRef.current.get(id);
            if (startPos) {
              const shape = shapesRef.current.find((s) => s.id === id);
              if (shape) {
                onShapeUpdate(id, {
                  bounds: {
                    ...shape.bounds,
                    x: startPos.x + dx,
                    y: startPos.y + dy,
                  },
                });
              }
            }
          });
        }
      } else if (isDrawingRef.current) {
        if (toolRef.current === 'freehand' && currentShapeRef.current) {
          const freehandShape = currentShapeRef.current as Extract<Shape, { type: 'freehand' }>;
          freehandShape.points.push(worldPoint);
          // Update bounds
          const xs = freehandShape.points.map((p) => p.x);
          const ys = freehandShape.points.map((p) => p.y);
          freehandShape.bounds = {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
          };
          render();
        } else if (startPointRef.current) {
          // Preview shape
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
      }
    },
    [screenToWorld, onPan, onShapeUpdate, render, getPointerPoint]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();

      if (isPanningRef.current) {
        isPanningRef.current = false;
        lastPanPointRef.current = null;
        return;
      }

      if (toolRef.current === 'select') {
        onDraggingChange(false);
        dragStartRef.current = null;
        selectedShapesStartRef.current.clear();
      } else if (isDrawingRef.current) {
        onDrawingChange(false);
        if (currentShapeRef.current) {
          const shape = currentShapeRef.current;
          // Only add shapes with meaningful size
          if (
            shape.type === 'freehand'
              ? (shape as Extract<Shape, { type: 'freehand' }>).points.length > 1
              : shape.bounds.width > 5 || shape.bounds.height > 5
          ) {
            onShapeAdd(shape);
          }
          currentShapeRef.current = null;
          startPointRef.current = null;
          render();
        }
      }
    },
    [onShapeAdd, onDrawingChange, onDraggingChange, render]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom with Ctrl/Cmd + wheel
        // const delta = e.deltaY > 0 ? 0.9 : 1.1;
        // TODO: Zoom at mouse position
      } else {
        // Pan with wheel
        onPan(-e.deltaX, -e.deltaY);
      }
    },
    [onPan]
  );

  return (
    <canvas
      ref={canvasRef}
      className="canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      style={{
        cursor:
          tool === 'select'
            ? 'default'
            : tool === 'pan'
              ? isPanningRef.current
                ? 'grabbing'
                : 'grab'
              : tool === 'eraser'
                ? 'not-allowed'
                : 'crosshair',
      }}
    />
  );
}
