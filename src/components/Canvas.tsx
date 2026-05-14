import { useRef, useEffect, useCallback, useMemo, useEffectEvent } from 'react';
import type { ReactElement, RefObject } from 'react';
import type { Bounds, Point, Shape } from '../types';
import { CanvasEngine, worldToScreenPoint } from '../canvas/CanvasEngine';
import { useElementSize } from '../hooks/useElementSize';
import { getSelectionBounds } from '../types/selection';
import { SHAPE_RESIZE_CURSORS } from '../features/canvas/resizeSession';
import { useCanvasInteractions } from '../features/canvas/useCanvasInteractions';
import { CanvasContextMenu } from './CanvasContextMenu';
import { CanvasEmbedOverlays } from './CanvasEmbedOverlays';
import { CanvasSelectionOverlays } from './CanvasSelectionOverlays';
import { CanvasTextEditor } from './CanvasTextEditor';

interface CanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
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
  onTextEditStart: (id: string) => void;
  onTextEditCommit: () => void;
  onTextEditCancel: () => void;
  onCreationComplete?: () => void;
  onDeleteSelected: () => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
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
  editingTextId,
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
  onDeleteSelected,
  onGroupSelected,
  onUngroupSelected,
  onBringToFront,
  onSendToBack,
  canGroupSelection,
  canUngroupSelection,
}: CanvasProps): ReactElement {
  const engineRef = useRef<CanvasEngine | null>(null);
  const currentShapeRef = useRef<Shape | null>(null);
  const canvasSize = useElementSize(canvasRef);

  const render = useCallback((): void => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const showSelectionHandles = selectedIds.length === 1;
    engine.clear();
    engine.drawGrid(camera);
    engine.applyCamera(camera);

    shapes.forEach((shape) => {
      const isSelected = selectedIds.includes(shape.id);
      const isEditing = editingTextId === shape.id;
      if (shape.type === 'embed') return;
      if (!isEditing) {
        engine.drawShape(shape, isSelected, showSelectionHandles, shapes);
      }
    });

    if (currentShapeRef.current) {
      engine.drawShape(currentShapeRef.current, false);
    }

    engine.restoreCamera();
  }, [camera, editingTextId, selectedIds, shapes]);

  const renderForResizeEffect = useEffectEvent(() => {
    render();
  });

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new CanvasEngine(canvasRef.current, {
        onImageLoad: renderForResizeEffect,
      });
    }
  }, [canvasRef]);

  useEffect(() => {
    if (!engineRef.current) return;
    if (canvasSize.width === 0 || canvasSize.height === 0) return;

    engineRef.current.resize();
    renderForResizeEffect();
  }, [canvasSize.height, canvasSize.width]);

  const worldToScreenForRender = useCallback(
    (point: Point): Point => worldToScreenPoint(point, camera),
    [camera]
  );

  useEffect(() => {
    render();
  }, [render]);

  const interactions = useCanvasInteractions({
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
  });

  const hasValidContextMenuState = tool === 'select' && selectedIds.length > 0 && !editingTextId;

  const toScreenFrame = useCallback(
    (bounds: Bounds | null) => {
      if (!bounds) return null;

      const topLeft = worldToScreenForRender({ x: bounds.x, y: bounds.y });
      const bottomRight = worldToScreenForRender({
        x: bounds.x + bounds.width,
        y: bounds.y + bounds.height,
      });

      return {
        left: topLeft.x,
        top: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
      };
    },
    [worldToScreenForRender]
  );

  const multiSelectionFrame = useMemo(() => {
    if (selectedIds.length < 2) {
      return null;
    }

    return toScreenFrame(getSelectionBounds(selectedIds, shapes));
  }, [selectedIds, shapes, toScreenFrame]);

  const marqueeScreenFrame = useMemo(
    () => toScreenFrame(interactions.marqueeBounds),
    [interactions.marqueeBounds, toScreenFrame]
  );

  const resizeHandle = interactions.activeResizeHandle ?? interactions.hoveredResizeHandle;
  const resizeCursor = resizeHandle ? SHAPE_RESIZE_CURSORS[resizeHandle] : null;
  const canvasCursor =
    resizeCursor ??
    (tool === 'select'
      ? interactions.isPanning
        ? 'grabbing'
        : interactions.isSpacePressed
          ? 'grab'
          : interactions.marqueeBounds
            ? 'crosshair'
            : 'default'
      : tool === 'pan'
        ? interactions.isPanning
          ? 'grabbing'
          : 'grab'
        : tool === 'eraser'
          ? 'not-allowed'
          : 'crosshair');

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        className="canvas"
        onPointerDown={interactions.handlePointerDown}
        onContextMenu={interactions.handleContextMenu}
        onDoubleClick={interactions.handleDoubleClick}
        onPointerMove={interactions.handlePointerMove}
        onPointerUp={interactions.handlePointerUp}
        onPointerLeave={interactions.handlePointerUp}
        style={{
          cursor: canvasCursor,
        }}
      />
      <CanvasSelectionOverlays
        multiSelectionFrame={multiSelectionFrame}
        marqueeScreenFrame={marqueeScreenFrame}
        showMultiSelectionFrame={tool === 'select' && !interactions.editingShape}
      />
      <CanvasTextEditor
        editingShape={interactions.editingShape}
        editingTypography={interactions.editingTypography}
        cameraZoom={camera.zoom}
        textareaRef={interactions.textareaRef}
        worldToScreen={worldToScreenForRender}
        onChange={interactions.handleTextChange}
        onKeyDown={interactions.handleTextKeyDown}
      />
      <CanvasContextMenu
        contextMenu={interactions.contextMenu}
        canvasSize={canvasSize}
        hasValidState={hasValidContextMenuState}
        canGroupSelection={canGroupSelection}
        canUngroupSelection={canUngroupSelection}
        onDeleteSelected={onDeleteSelected}
        onGroupSelected={onGroupSelected}
        onUngroupSelected={onUngroupSelected}
        onBringToFront={onBringToFront}
        onSendToBack={onSendToBack}
        onClose={interactions.closeContextMenu}
      />
      <CanvasEmbedOverlays
        shapes={shapes}
        selectedIds={selectedIds}
        tool={tool}
        camera={camera}
        worldToScreen={worldToScreenForRender}
        onShapeUpdate={onShapeUpdate}
        onSelectionChange={onSelectionChange}
        onDraggingChange={onDraggingChange}
      />
    </div>
  );
}
