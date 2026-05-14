import type { Bounds, Point, Shape, ShapeStyle } from './document';
import type { CameraState } from './editor';

export const WORKSPACE_EXPORT_FORMAT = 'tldraw-workspace-export' as const;
export const WORKSPACE_EXPORT_VERSION = 1 as const;

export interface WorkspaceExportMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceExportEditorState {
  camera: CameraState;
}

export interface ExportedShapeBase {
  id: string;
  type: Shape['type'];
  bounds: Bounds;
  style: ShapeStyle;
  createdAt: number;
  updatedAt: number;
  parentId: string | null;
  zIndex: number;
}

export interface ExportedRectangleShape extends ExportedShapeBase {
  type: 'rectangle';
}

export interface ExportedCircleShape extends ExportedShapeBase {
  type: 'circle';
  center: Point;
  radius: number;
}

export interface ExportedLineShape extends ExportedShapeBase {
  type: 'line';
  start: Point;
  end: Point;
}

export interface ExportedArrowShape extends ExportedShapeBase {
  type: 'arrow';
  start: Point;
  end: Point;
}

export interface ExportedPencilShape extends ExportedShapeBase {
  type: 'pencil';
  points: Point[];
}

export interface ExportedImageShape extends ExportedShapeBase {
  type: 'image';
  src: string;
  originalWidth: number;
  originalHeight: number;
  isBase64: boolean;
}

export interface ExportedAudioShape extends ExportedShapeBase {
  type: 'audio';
  src: string;
  duration: number;
  waveformData: number[];
  isBase64: boolean;
  loop?: boolean;
}

export interface ExportedTextShape extends ExportedShapeBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}

export interface ExportedEmbedShape extends ExportedShapeBase {
  type: 'embed';
  url: string;
  embedType: 'youtube' | 'website';
  embedSrc: string;
}

export interface ExportedGroupShape extends ExportedShapeBase {
  type: 'group';
  childrenIds: string[];
}

export type ExportedShape =
  | ExportedRectangleShape
  | ExportedCircleShape
  | ExportedLineShape
  | ExportedArrowShape
  | ExportedPencilShape
  | ExportedImageShape
  | ExportedAudioShape
  | ExportedTextShape
  | ExportedEmbedShape
  | ExportedGroupShape;

export interface WorkspaceExportDocumentV1 {
  format: typeof WORKSPACE_EXPORT_FORMAT;
  version: typeof WORKSPACE_EXPORT_VERSION;
  exportedAt: string;
  workspace: WorkspaceExportMetadata;
  editor: WorkspaceExportEditorState;
  content: {
    rootNodeIds: string[];
    nodes: ExportedShape[];
  };
}
