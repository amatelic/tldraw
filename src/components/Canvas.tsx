import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { Point, Shape } from '../types';
import { CanvasEngine } from '../canvas/CanvasEngine';
import { createShapeId, getGroupDescendants, getRootGroup } from '../types';

interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  shapes: Shape[];
  selectedIds: string[];
  tool: string;
  style: Shape['style'];
  camera: { x: number; y: number; zoom: number };
  isDragging: boolean;
  isDrawing: boolean;
  editingTextId: string | null;
  onShapeAdd: (shape: Shape) => void;
  onShapeUpdate: (id: string, updates: Partial<Shape>) => void;
  onShapeDelete: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
  onDraggingChange: (dragging: boolean) => void;
  onDrawingChange: (drawing: boolean) => void;
  onPan: (dx: number, dy: number) => void;
  onZoomAt: (screenPoint: Point, factor: number) => void;
  screenToWorld: (point: Point) => Point;
  worldToScreen: (point: Point) => Point;
  onTextEditStart: (id: string) => void;
  onTextEditCommit: () => void;
  onTextEditCancel: () => void;
}

// Type for drag update function (optimized approach)
type DragUpdateFn = (dx: number, dy: number) => void;

export function Canvas({
  canvasRef,
  shapes,
  selectedIds,
  tool,
  style,
  camera,
  isDragging,
  isDrawing,
  editingTextId,
  onShapeAdd,
  onShapeUpdate,
  onShapeDelete,
  onSelectionChange,
  onDraggingChange,
  onDrawingChange,
  onPan,
  onZoomAt,
  screenToWorld,
  worldToScreen,
  onTextEditStart,
  onTextEditCommit,
  onTextEditCancel,
}: CanvasProps) {
  const engineRef = useRef<CanvasEngine | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const currentShapeRef = useRef<Shape | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<Point | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const selectedShapesStartRef = useRef<Map<string, Point>>(new Map());
  // OPTIMIZED: Pre-computed drag update functions
  const dragUpdateFnsRef = useRef<Map<string, DragUpdateFn>>(new Map());
  const isDraggingRef = useRef(isDragging);
  const isDrawingRef = useRef(isDrawing);
  const toolRef = useRef(tool);
  const selectedIdsRef = useRef(selectedIds);
  const shapesRef = useRef(shapes);
  const styleRef = useRef(style);
  const cameraRef = useRef(camera);
  const editingTextIdRef = useRef(editingTextId);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [originalText, setOriginalText] = useState<string>('');

  // Update refs when props change
  useEffect(() => {
    isDraggingRef.current = isDragging;
    isDrawingRef.current = isDrawing;
    toolRef.current = tool;
    selectedIdsRef.current = selectedIds;
    shapesRef.current = shapes;
    styleRef.current = style;
    cameraRef.current = camera;
    editingTextIdRef.current = editingTextId;
  }, [isDragging, isDrawing, tool, selectedIds, shapes, style, camera, editingTextId]);

  // Keep ref in sync with state
  useEffect(() => {
    isPanningRef.current = isPanning;
  }, [isPanning]);

  // Compute editing shape directly from props
  const editingShape = useMemo(() => {
    if (!editingTextId) return null;
    const shape = shapes.find((s) => s.id === editingTextId);
    if (shape && shape.type === 'text') {
      return shape as Extract<Shape, { type: 'text' }>;
    }
    return null;
  }, [editingTextId, shapes]);

  // Update original text when entering edit mode
  useEffect(() => {
    if (editingTextId && editingShape) {
      setOriginalText(editingShape.text);
    }
  }, [editingTextId, editingShape]);

  // Render function - defined before use
  const render = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    engine.clear();
    engine.drawGrid(cameraRef.current);
    engine.applyCamera(cameraRef.current);

    // Use the shapes prop directly instead of ref to avoid stale data
    shapes.forEach((shape) => {
      const isSelected = selectedIds.includes(shape.id);
      const isEditing = editingTextId === shape.id;
      if (shape.type === 'embed') return;
      if (!isEditing) {
        engine.drawShape(shape, isSelected);
      }
    });

    // Draw preview shape while drawing
    if (currentShapeRef.current) {
      engine.drawShape(currentShapeRef.current, false);
    }

    engine.restoreCamera();
  }, [shapes, selectedIds, editingTextId]);

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
  }, [canvasRef, render]);

  // Re-render when shapes change
  useEffect(() => {
    render();
  }, [shapes, render]);

  // Re-render when entering/exiting edit mode to hide/show text shapes
  useEffect(() => {
    render();
  }, [editingTextId, render]);

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
      case 'arrow': {
        const { start, end } = shape;
        const arrowLength = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        if (arrowLength === 0) return false;
        const t =
          ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) /
          arrowLength ** 2;
        const closestX = start.x + t * (end.x - start.x);
        const closestY = start.y + t * (end.y - start.y);
        const distance = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
        return distance <= 5;
      }
      case 'pencil':
        return shape.points.some((p) => {
          const d = Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2);
          return d <= 10;
        });
      case 'image':
      case 'audio':
      case 'text':
      case 'embed':
        return (
          point.x >= shape.bounds.x &&
          point.x <= shape.bounds.x + shape.bounds.width &&
          point.y >= shape.bounds.y &&
          point.y <= shape.bounds.y + shape.bounds.height
        );
      case 'group':
        // Groups are selected by their bounds
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

  // OPTIMIZED: Create drag update function for a shape
  const createDragUpdateFn = useCallback(
    (shape: Shape, startPos: Point): DragUpdateFn => {
      // Capture original values at creation time to avoid re-renders affecting closure
      const id = shape.id;
      const originalBounds = shape.bounds;

      switch (shape.type) {
        case 'circle': {
          const originalCenter = shape.center;
          return (dx: number, dy: number) => {
            onShapeUpdate(id, {
              center: {
                x: originalCenter.x + dx,
                y: originalCenter.y + dy,
              },
              bounds: {
                ...originalBounds,
                x: startPos.x + dx,
                y: startPos.y + dy,
              },
            });
          };
        }

        case 'line': {
          const originalStart = shape.start;
          const originalEnd = shape.end;
          return (dx: number, dy: number) => {
            onShapeUpdate(id, {
              start: {
                x: originalStart.x + dx,
                y: originalStart.y + dy,
              },
              end: {
                x: originalEnd.x + dx,
                y: originalEnd.y + dy,
              },
              bounds: {
                ...originalBounds,
                x: startPos.x + dx,
                y: startPos.y + dy,
              },
            });
          };
        }

        case 'arrow': {
          const originalStart = shape.start;
          const originalEnd = shape.end;
          return (dx: number, dy: number) => {
            onShapeUpdate(id, {
              start: {
                x: originalStart.x + dx,
                y: originalStart.y + dy,
              },
              end: {
                x: originalEnd.x + dx,
                y: originalEnd.y + dy,
              },
              bounds: {
                ...originalBounds,
                x: startPos.x + dx,
                y: startPos.y + dy,
              },
            });
          };
        }

        case 'pencil': {
          const originalPoints = shape.points;
          return (dx: number, dy: number) => {
            onShapeUpdate(id, {
              points: originalPoints.map((p) => ({
                x: p.x + dx,
                y: p.y + dy,
              })),
              bounds: {
                ...originalBounds,
                x: startPos.x + dx,
                y: startPos.y + dy,
              },
            });
          };
        }

        case 'rectangle':
        case 'image':
        case 'audio':
        case 'text':
        case 'group':
        default:
          return (dx: number, dy: number) => {
            onShapeUpdate(id, {
              bounds: {
                ...originalBounds,
                x: startPos.x + dx,
                y: startPos.y + dy,
              },
            });
          };
      }
    },
    [onShapeUpdate]
  );

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
        audio.play().catch(() => {
          // Silent fail
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

      // If currently editing text, commit the changes
      if (editingTextIdRef.current) {
        onTextEditCommit();
        return;
      }

      // Middle mouse or Space + drag for panning
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setIsPanning(true);
        lastPanPointRef.current = screenPoint;
        return;
      }

      // Left click for tools
      if (e.button === 0) {
        if (toolRef.current === 'pan') {
          setIsPanning(true);
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

            // Check if the clicked shape is inside a group - if so, select the group
            const rootGroup = getRootGroup(clickedShape.id, shapesRef.current);
            const shapeToSelect = rootGroup || clickedShape;

            if (!selectedIdsRef.current.includes(shapeToSelect.id)) {
              onSelectionChange([shapeToSelect.id]);
            }
            onDraggingChange(true);
            dragStartRef.current = worldPoint;

            // OPTIMIZED: Pre-compute drag update functions
            dragUpdateFnsRef.current.clear();
            selectedIdsRef.current.forEach((id) => {
              const shape = shapesRef.current.find((s) => s.id === id);
              if (shape) {
                const startPos = { x: shape.bounds.x, y: shape.bounds.y };
                selectedShapesStartRef.current.set(id, startPos);
                dragUpdateFnsRef.current.set(id, createDragUpdateFn(shape, startPos));
                
                // If this is a group, also add drag functions for all children
                if (shape.type === 'group') {
                  const descendants = getGroupDescendants(id, shapesRef.current);
                  descendants.forEach((descendant) => {
                    if (!dragUpdateFnsRef.current.has(descendant.id)) {
                      const descStartPos = { x: descendant.bounds.x, y: descendant.bounds.y };
                      selectedShapesStartRef.current.set(descendant.id, descStartPos);
                      dragUpdateFnsRef.current.set(descendant.id, createDragUpdateFn(descendant, descStartPos));
                    }
                  });
                }
              }
            });
          } else {
            onSelectionChange([]);
          }
        } else if (['rectangle', 'circle', 'line', 'arrow', 'pencil'].includes(toolRef.current)) {
          onDrawingChange(true);
          startPointRef.current = worldPoint;

          if (toolRef.current === 'pencil') {
            const newShape: Shape = {
              id: createShapeId(),
              type: 'pencil',
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
        } else if (toolRef.current === 'text') {
          // Create text shape at click position with empty text
          const newShape: Shape = {
            id: createShapeId(),
            type: 'text',
            bounds: {
              x: worldPoint.x,
              y: worldPoint.y,
              width: 200,
              height: 100,
            },
            text: '',
            fontSize: styleRef.current.fontSize,
            fontFamily: styleRef.current.fontFamily,
            fontWeight: styleRef.current.fontWeight,
            fontStyle: styleRef.current.fontStyle,
            textAlign: styleRef.current.textAlign,
            style: { ...styleRef.current },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          onShapeAdd(newShape);
          onSelectionChange([newShape.id]);
          // Immediately enter edit mode for new text shape
          onTextEditStart(newShape.id);
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
      onShapeAdd,
      onTextEditStart,
      onTextEditCommit,
      toggleAudio,
      getPointerPoint,
      createDragUpdateFn,
    ]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const screenPoint = getPointerPoint(e as unknown as React.PointerEvent);
      const worldPoint = screenToWorld(screenPoint);

      // Check if double-clicking on a text shape
      const clickedShape = [...shapesRef.current]
        .reverse()
        .find((s) => isPointInShape(worldPoint, s));

      if (clickedShape && clickedShape.type === 'text') {
        // If already editing another text, commit it first
        if (editingTextIdRef.current && editingTextIdRef.current !== clickedShape.id) {
          onTextEditCommit();
        }
        onTextEditStart(clickedShape.id);
      }
    },
    [screenToWorld, onTextEditStart, onTextEditCommit, getPointerPoint]
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

          // OPTIMIZED: Use pre-computed drag update functions
          dragUpdateFnsRef.current.forEach((updateFn) => {
            updateFn(dx, dy);
          });
        }
      } else if (isDrawingRef.current) {
        if (toolRef.current === 'pencil' && currentShapeRef.current) {
          const pencilShape = currentShapeRef.current as Extract<Shape, { type: 'pencil' }>;
          pencilShape.points.push(worldPoint);
          // Update bounds
          const xs = pencilShape.points.map((p) => p.x);
          const ys = pencilShape.points.map((p) => p.y);
          pencilShape.bounds = {
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
    [screenToWorld, onPan, render, getPointerPoint]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();

      if (isPanningRef.current) {
        setIsPanning(false);
        lastPanPointRef.current = null;
        return;
      }

      if (toolRef.current === 'select') {
        onDraggingChange(false);
        dragStartRef.current = null;
        selectedShapesStartRef.current.clear();
        dragUpdateFnsRef.current.clear();
      } else if (isDrawingRef.current) {
        onDrawingChange(false);
        if (currentShapeRef.current) {
          const shape = currentShapeRef.current;
          // Only add shapes with meaningful size
          if (
            shape.type === 'pencil'
              ? (shape as Extract<Shape, { type: 'pencil' }>).points.length > 1
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
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom with Ctrl/Cmd + wheel at mouse position
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenPoint = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        onZoomAt(screenPoint, factor);
      } else {
        // Pan with wheel
        onPan(-e.deltaX, -e.deltaY);
      }
    },
    [onPan, onZoomAt, canvasRef]
  );

  // Attach native wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel, canvasRef]);

  // Handle textarea keyboard events
  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Stop propagation to prevent global keyboard shortcuts
    e.stopPropagation();
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitTextEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelTextEdit();
    }
  };

  // Handle textarea changes with auto-grow
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!editingShape) return;

    const newText = e.target.value;

    // Calculate new bounds based on text content
    const engine = engineRef.current;
    if (engine) {
      const ctx = (engine as unknown as { ctx: CanvasRenderingContext2D }).ctx;
      ctx.font = `${editingShape.fontStyle} ${editingShape.fontWeight} ${editingShape.fontSize}px ${editingShape.fontFamily}`;

      const lines = newText.split('\n');
      let maxWidth = 200; // Minimum width
      let totalHeight = editingShape.fontSize * 1.2; // At least one line height

      lines.forEach((line) => {
        const metrics = ctx.measureText(line);
        maxWidth = Math.max(maxWidth, metrics.width + 20); // Add padding
        totalHeight += editingShape.fontSize * 1.2;
      });

      // Update shape with new text and bounds
      onShapeUpdate(editingShape.id, {
        text: newText,
        bounds: {
          ...editingShape.bounds,
          width: maxWidth,
          height: Math.max(100, totalHeight),
        },
      });
    }
  };

  // Commit text edit
  const commitTextEdit = () => {
    if (!editingShape) return;

    const trimmedText = editingShape.text.trim();

    if (trimmedText === '') {
      // Delete empty text shape
      onShapeDelete(editingShape.id);
    }

    onTextEditCommit();
  };

  // Cancel text edit
  const cancelTextEdit = () => {
    if (!editingShape) return;

    // Restore original text
    onShapeUpdate(editingShape.id, {
      text: originalText,
    });

    onTextEditCancel();
  };

  // Calculate textarea position and size
  const getTextareaStyle = (): React.CSSProperties => {
    if (!editingShape) return { display: 'none' };

    const screenPos = worldToScreen({ x: editingShape.bounds.x, y: editingShape.bounds.y });

    return {
      position: 'absolute',
      left: `${screenPos.x}px`,
      top: `${screenPos.y}px`,
      width: `${editingShape.bounds.width * camera.zoom}px`,
      height: `${editingShape.bounds.height * camera.zoom}px`,
      fontSize: `${editingShape.fontSize * camera.zoom}px`,
      fontFamily: editingShape.fontFamily,
      fontWeight: editingShape.fontWeight,
      fontStyle: editingShape.fontStyle,
      textAlign: editingShape.textAlign,
      color: editingShape.style.color,
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      resize: 'none',
      overflow: 'hidden',
      padding: '0',
      margin: '0',
      lineHeight: '1.2',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      zIndex: 1000,
    };
  };

  const getEmbedOverlays = useCallback(() => {
    const embedShapes = shapes.filter(
      (s): s is Extract<Shape, { type: 'embed' }> => s.type === 'embed'
    );

    return embedShapes.map((shape) => {
      const screenTopLeft = worldToScreen({ x: shape.bounds.x, y: shape.bounds.y });
      const screenBottomRight = worldToScreen({
        x: shape.bounds.x + shape.bounds.width,
        y: shape.bounds.y + shape.bounds.height,
      });
      const screenWidth = screenBottomRight.x - screenTopLeft.x;
      const screenHeight = screenBottomRight.y - screenTopLeft.y;

      return {
        shape,
        left: screenTopLeft.x,
        top: screenTopLeft.y,
        width: screenWidth,
        height: screenHeight,
      };
    });
  }, [shapes, worldToScreen]);

  const embedOverlays = getEmbedOverlays();

  const embedDragRef = useRef<{
    shapeId: string;
    startX: number;
    startY: number;
    origBounds: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const handleEmbedDragStart = useCallback(
    (e: React.PointerEvent, shape: Extract<Shape, { type: 'embed' }>) => {
      if (tool !== 'select') return;
      e.preventDefault();
      e.stopPropagation();

      embedDragRef.current = {
        shapeId: shape.id,
        startX: e.clientX,
        startY: e.clientY,
        origBounds: { ...shape.bounds },
      };

      onSelectionChange([shape.id]);

      const handleMove = (moveEvent: PointerEvent) => {
        if (!embedDragRef.current) return;
        const dx = (moveEvent.clientX - embedDragRef.current.startX) / camera.zoom;
        const dy = (moveEvent.clientY - embedDragRef.current.startY) / camera.zoom;
        onShapeUpdate(embedDragRef.current.shapeId, {
          bounds: {
            ...embedDragRef.current.origBounds,
            x: embedDragRef.current.origBounds.x + dx,
            y: embedDragRef.current.origBounds.y + dy,
          },
        });
      };

      const handleUp = () => {
        embedDragRef.current = null;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [tool, camera.zoom, onSelectionChange, onShapeUpdate]
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        className="canvas"
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          cursor:
            tool === 'select'
              ? 'default'
              : tool === 'pan'
                ? isPanning
                  ? 'grabbing'
                  : 'grab'
                : tool === 'eraser'
                  ? 'not-allowed'
                  : 'crosshair',
        }}
      />
      {editingShape && (
        <textarea
          ref={textareaRef}
          value={editingShape.text}
          onChange={handleTextChange}
          onKeyDown={handleTextKeyDown}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
          style={getTextareaStyle()}
          role="textbox"
          aria-label="Edit text"
          autoFocus
        />
      )}
      {embedOverlays.map(({ shape, left, top, width, height }) => (
        <div
          key={shape.id}
          className="embed-overlay"
          style={{
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            pointerEvents: tool === 'select' ? 'auto' : 'none',
            zIndex: 10,
            borderRadius: '4px',
            overflow: 'hidden',
            border: selectedIds.includes(shape.id) ? '2px solid #2563eb' : '1px solid #999',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="embed-drag-handle"
            onPointerDown={(e) => handleEmbedDragStart(e, shape)}
            style={{
              width: '100%',
              height: '24px',
              minHeight: '24px',
              background: selectedIds.includes(shape.id) ? '#2563eb' : '#666',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '0 8px',
              flexShrink: 0,
              userSelect: 'none',
            }}
            title="Drag to move"
          >
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {shape.embedType === 'youtube' ? 'YouTube' : 'Website'}
            </span>
          </div>
          <iframe
            src={shape.embedSrc}
            title={shape.url}
            style={{
              width: '100%',
              flex: 1,
              border: 'none',
              pointerEvents: tool === 'select' ? 'auto' : 'none',
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
      ))}
    </div>
  );
}
