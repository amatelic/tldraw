import type { Shape, ShapeStyle } from './document';

export type ToolType =
  | 'select'
  | 'pan'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'pencil'
  | 'eraser'
  | 'image'
  | 'audio'
  | 'text'
  | 'embed';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface PersistedEditorState {
  tool: ToolType;
  selectedShapeIds: string[];
  camera: CameraState;
  shapeStyle: ShapeStyle;
}

export interface EditorRuntimeState {
  isDragging: boolean;
  isDrawing: boolean;
  editingTextId: string | null;
}

export interface EditorState extends PersistedEditorState, EditorRuntimeState {}

export interface CanvasState {
  shapes: Shape[];
  editorState: EditorState;
}
