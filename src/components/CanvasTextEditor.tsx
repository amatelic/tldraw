import type {
  CSSProperties,
  ChangeEventHandler,
  KeyboardEventHandler,
  RefObject,
} from 'react';
import type { Point, Shape } from '../types';

interface CanvasTextEditorTypography {
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}

interface CanvasTextEditorProps {
  editingShape: Extract<Shape, { type: 'text' }> | null;
  editingTypography: CanvasTextEditorTypography | null;
  cameraZoom: number;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  worldToScreen: (point: Point) => Point;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
}

function getTextareaStyle(
  editingShape: Extract<Shape, { type: 'text' }>,
  editingTypography: CanvasTextEditorTypography,
  cameraZoom: number,
  worldToScreen: (point: Point) => Point
): CSSProperties {
  const screenPos = worldToScreen({ x: editingShape.bounds.x, y: editingShape.bounds.y });

  return {
    position: 'absolute',
    left: `${screenPos.x}px`,
    top: `${screenPos.y}px`,
    width: `${editingShape.bounds.width * cameraZoom}px`,
    height: `${editingShape.bounds.height * cameraZoom}px`,
    fontSize: `${editingTypography.fontSize * cameraZoom}px`,
    fontFamily: editingTypography.fontFamily,
    fontWeight: editingTypography.fontWeight,
    fontStyle: editingTypography.fontStyle,
    textAlign: editingTypography.textAlign,
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
}

export function CanvasTextEditor({
  editingShape,
  editingTypography,
  cameraZoom,
  textareaRef,
  worldToScreen,
  onChange,
  onKeyDown,
}: CanvasTextEditorProps) {
  if (!editingShape || !editingTypography) {
    return null;
  }

  return (
    <textarea
      ref={textareaRef}
      value={editingShape.text}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onKeyUp={(event) => event.stopPropagation()}
      onKeyPress={(event) => event.stopPropagation()}
      style={getTextareaStyle(editingShape, editingTypography, cameraZoom, worldToScreen)}
      role="textbox"
      aria-label="Edit text"
      autoFocus
    />
  );
}
