import { useCallback, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Point, Shape } from '../types';

export type EmbedResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface EmbedBoundsSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasEmbedOverlaysProps {
  shapes: Shape[];
  selectedIds: string[];
  tool: string;
  camera: { zoom: number };
  worldToScreen: (point: Point) => Point;
  onShapeUpdate: (id: string, updates: Partial<Shape>) => void;
  onSelectionChange: (ids: string[]) => void;
  onDraggingChange: (dragging: boolean) => void;
}

const MIN_EMBED_WIDTH = 160;
const MIN_EMBED_HEIGHT = 120;

const EMBED_RESIZE_HANDLE_POSITIONS: Array<{
  handle: EmbedResizeHandle;
  style: CSSProperties;
}> = [
  { handle: 'nw', style: { left: 0, top: 0, transform: 'translate(-50%, -50%)' } },
  { handle: 'n', style: { left: '50%', top: 0, transform: 'translate(-50%, -50%)' } },
  { handle: 'ne', style: { right: 0, top: 0, transform: 'translate(50%, -50%)' } },
  { handle: 'e', style: { right: 0, top: '50%', transform: 'translate(50%, -50%)' } },
  { handle: 'se', style: { right: 0, bottom: 0, transform: 'translate(50%, 50%)' } },
  { handle: 's', style: { left: '50%', bottom: 0, transform: 'translate(-50%, 50%)' } },
  { handle: 'sw', style: { left: 0, bottom: 0, transform: 'translate(-50%, 50%)' } },
  { handle: 'w', style: { left: 0, top: '50%', transform: 'translate(-50%, -50%)' } },
];

const EMBED_RESIZE_CURSORS: Record<EmbedResizeHandle, CSSProperties['cursor']> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

function resizeEmbedBounds(
  bounds: EmbedBoundsSnapshot,
  handle: EmbedResizeHandle,
  deltaX: number,
  deltaY: number
): EmbedBoundsSnapshot {
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;

  let nextX = bounds.x;
  let nextY = bounds.y;
  let nextWidth = bounds.width;
  let nextHeight = bounds.height;

  if (handle.includes('w')) {
    nextX = Math.min(bounds.x + deltaX, right - MIN_EMBED_WIDTH);
    nextWidth = right - nextX;
  }

  if (handle.includes('e')) {
    nextWidth = Math.max(MIN_EMBED_WIDTH, bounds.width + deltaX);
  }

  if (handle.includes('n')) {
    nextY = Math.min(bounds.y + deltaY, bottom - MIN_EMBED_HEIGHT);
    nextHeight = bottom - nextY;
  }

  if (handle.includes('s')) {
    nextHeight = Math.max(MIN_EMBED_HEIGHT, bounds.height + deltaY);
  }

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
}

export function CanvasEmbedOverlays({
  shapes,
  selectedIds,
  tool,
  camera,
  worldToScreen,
  onShapeUpdate,
  onSelectionChange,
  onDraggingChange,
}: CanvasEmbedOverlaysProps) {
  const embedDragRef = useRef<{
    shapeId: string;
    startX: number;
    startY: number;
    origBounds: EmbedBoundsSnapshot;
  } | null>(null);
  const embedResizeRef = useRef<{
    shapeId: string;
    handle: EmbedResizeHandle;
    startX: number;
    startY: number;
    origBounds: EmbedBoundsSnapshot;
  } | null>(null);

  const embedOverlays = useMemo(() => {
    const embedShapes = shapes.filter(
      (shape): shape is Extract<Shape, { type: 'embed' }> => shape.type === 'embed'
    );

    return embedShapes.map((shape) => {
      const screenTopLeft = worldToScreen({ x: shape.bounds.x, y: shape.bounds.y });
      const screenBottomRight = worldToScreen({
        x: shape.bounds.x + shape.bounds.width,
        y: shape.bounds.y + shape.bounds.height,
      });

      return {
        shape,
        left: screenTopLeft.x,
        top: screenTopLeft.y,
        width: screenBottomRight.x - screenTopLeft.x,
        height: screenBottomRight.y - screenTopLeft.y,
      };
    });
  }, [shapes, worldToScreen]);

  const handleEmbedDragStart = useCallback(
    (event: React.PointerEvent, shape: Extract<Shape, { type: 'embed' }>) => {
      if (tool !== 'select') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      embedDragRef.current = {
        shapeId: shape.id,
        startX: event.clientX,
        startY: event.clientY,
        origBounds: { ...shape.bounds },
      };

      onSelectionChange([shape.id]);
      onDraggingChange(true);

      const handleMove = (moveEvent: PointerEvent) => {
        if (!embedDragRef.current) {
          return;
        }

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
        onDraggingChange(false);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [camera.zoom, onDraggingChange, onSelectionChange, onShapeUpdate, tool]
  );

  const handleEmbedResizeStart = useCallback(
    (
      event: React.PointerEvent<HTMLButtonElement>,
      shape: Extract<Shape, { type: 'embed' }>,
      handle: EmbedResizeHandle
    ) => {
      if (tool !== 'select') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      embedResizeRef.current = {
        shapeId: shape.id,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        origBounds: { ...shape.bounds },
      };

      onSelectionChange([shape.id]);
      onDraggingChange(true);

      const handleMove = (moveEvent: PointerEvent) => {
        if (!embedResizeRef.current) {
          return;
        }

        const dx = (moveEvent.clientX - embedResizeRef.current.startX) / camera.zoom;
        const dy = (moveEvent.clientY - embedResizeRef.current.startY) / camera.zoom;
        const nextBounds = resizeEmbedBounds(
          embedResizeRef.current.origBounds,
          embedResizeRef.current.handle,
          dx,
          dy
        );

        onShapeUpdate(embedResizeRef.current.shapeId, { bounds: nextBounds });
      };

      const handleUp = () => {
        embedResizeRef.current = null;
        onDraggingChange(false);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [camera.zoom, onDraggingChange, onSelectionChange, onShapeUpdate, tool]
  );

  if (embedOverlays.length === 0) {
    return null;
  }

  return (
    <>
      {embedOverlays.map(({ shape, left, top, width, height }) => {
        const isSelected = selectedIds.includes(shape.id);

        return (
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
              overflow: 'visible',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '4px',
                overflow: 'hidden',
                border: isSelected ? '2px solid #2563eb' : '1px solid #999',
                background: '#fff',
              }}
            >
              <div
                className="embed-drag-handle"
                onPointerDown={(event) => handleEmbedDragStart(event, shape)}
                style={{
                  width: '100%',
                  height: '24px',
                  minHeight: '24px',
                  background: isSelected ? '#2563eb' : '#666',
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
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.6)',
                  }}
                />
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.6)',
                  }}
                />
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.6)',
                  }}
                />
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.8)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
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
            {tool === 'select' && isSelected
              ? EMBED_RESIZE_HANDLE_POSITIONS.map(({ handle, style: handlePositionStyle }) => (
                  <button
                    key={`${shape.id}-${handle}`}
                    type="button"
                    aria-label={`Resize embed ${handle}`}
                    onPointerDown={(event) => handleEmbedResizeStart(event, shape, handle)}
                    style={{
                      position: 'absolute',
                      width: '12px',
                      height: '12px',
                      padding: 0,
                      borderRadius: '999px',
                      border: '2px solid #2563eb',
                      background: '#fff',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.75)',
                      cursor: EMBED_RESIZE_CURSORS[handle],
                      ...handlePositionStyle,
                    }}
                  />
                ))
              : null}
          </div>
        );
      })}
    </>
  );
}
