import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { normalizeDocumentShape, normalizeShapeStyle } from '../document/textStyle';
import type {
  BlendMode,
  Bounds,
  EditorState,
  FillGradient,
  PersistedEditorState,
  Point,
  ShadowStyle,
  Shape,
  ShapeStyle,
  ShapeType,
  TextTypography,
  ToolType,
} from '../types';
import { DEFAULT_STYLE } from '../types';

export interface WorkspaceRuntimeState {
  isDragging: boolean;
  isDrawing: boolean;
  editingTextId: string | null;
}

type PersistedWorkspaceStateInput = Partial<PersistedEditorState> | Partial<EditorState> | undefined;

interface NormalizePersistedWorkspaceStateOptions {
  validShapeIds?: ReadonlySet<string>;
  warnings?: string[];
}

export interface Workspace {
  id: string;
  name: string;
  state: PersistedEditorState;
  shapes: Shape[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceSnapshot {
  shapes: Shape[];
  state: PersistedEditorState;
}

export interface WorkspaceNameValidationResult {
  name: string;
  error: string | null;
}

export interface WorkspacePersistenceResult {
  success: boolean;
  error: string | null;
  warnings: string[];
}

export interface WorkspaceValidationResult<T> extends WorkspacePersistenceResult {
  value: T;
}

export interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string;

  // Actions
  addWorkspace: () => string;
  deleteWorkspace: (id: string) => boolean;
  renameWorkspace: (id: string, name: string) => boolean;
  switchWorkspace: (id: string) => void;
  canDeleteWorkspace: () => boolean;
  getWorkspace: (id: string) => Workspace | undefined;
  getActiveWorkspace: () => Workspace;
  getNextWorkspaceNumber: () => number;

  // Update current workspace data
  saveWorkspaceSnapshot: (id: string, snapshot: WorkspaceSnapshot) => WorkspacePersistenceResult;
}

const MAX_WORKSPACES = 10;
export const MAX_WORKSPACE_NAME_LENGTH = 50;
const MIN_CAMERA_ZOOM = 0.1;
const MAX_CAMERA_ZOOM = 5;
const VALID_TOOLS = [
  'select',
  'pan',
  'rectangle',
  'circle',
  'line',
  'arrow',
  'pencil',
  'eraser',
  'image',
  'audio',
  'text',
  'embed',
] as const satisfies readonly ToolType[];
const VALID_SHAPE_TYPES = [
  'rectangle',
  'circle',
  'line',
  'arrow',
  'pencil',
  'image',
  'audio',
  'text',
  'embed',
  'group',
] as const satisfies readonly ShapeType[];
const VALID_STROKE_STYLES = ['solid', 'dashed', 'dotted'] as const satisfies readonly ShapeStyle['strokeStyle'][];
const VALID_FILL_STYLES = ['none', 'solid', 'pattern'] as const satisfies readonly ShapeStyle['fillStyle'][];
const VALID_BLEND_MODES = [
  'source-over',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
] as const satisfies readonly BlendMode[];
const VALID_FONT_WEIGHTS = ['normal', 'bold'] as const satisfies readonly TextTypography['fontWeight'][];
const VALID_FONT_STYLES = ['normal', 'italic'] as const satisfies readonly TextTypography['fontStyle'][];
const VALID_TEXT_ALIGNS = ['left', 'center', 'right'] as const satisfies readonly TextTypography['textAlign'][];
const VALID_GRADIENT_TYPES = ['linear', 'radial'] as const satisfies readonly FillGradient['type'][];
const VALID_EMBED_TYPES = ['youtube', 'website'] as const;

export const DEFAULT_RUNTIME_WORKSPACE_STATE: WorkspaceRuntimeState = {
  isDragging: false,
  isDrawing: false,
  editingTextId: null,
};

export const DEFAULT_PERSISTED_WORKSPACE_STATE: PersistedEditorState = {
  tool: 'select',
  selectedShapeIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  shapeStyle: { ...DEFAULT_STYLE },
};

function createPersistenceResult(warnings: string[] = [], error: string | null = null): WorkspacePersistenceResult {
  return {
    success: error === null,
    error,
    warnings,
  };
}

function createValidationResult<T>(
  value: T,
  warnings: string[] = [],
  error: string | null = null
): WorkspaceValidationResult<T> {
  return {
    ...createPersistenceResult(warnings, error),
    value,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringLiteral<T extends string>(value: unknown, allowedValues: readonly T[]): value is T {
  return typeof value === 'string' && allowedValues.includes(value as T);
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  return isFiniteNumber(value) && value > 0 ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeOpacity(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? clamp(value, 0, 1) : fallback;
}

function normalizeTimestamp(value: unknown): number {
  return isFiniteNumber(value) ? value : 0;
}

function normalizePoint(value: unknown): Point | null {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    return null;
  }

  return {
    x: value.x,
    y: value.y,
  };
}

function normalizeBounds(value: unknown): Bounds | null {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height)
  ) {
    return null;
  }

  return {
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
  };
}

function normalizeShadowStyle(value: unknown): ShadowStyle | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    x: isFiniteNumber(value.x) ? value.x : 0,
    y: isFiniteNumber(value.y) ? value.y : 0,
    blur: isFiniteNumber(value.blur) && value.blur >= 0 ? value.blur : 0,
    color: normalizeString(value.color, '#000000'),
    opacity: normalizeOpacity(value.opacity, 1),
  };
}

function normalizeFillGradient(value: unknown): FillGradient | null {
  if (!isRecord(value) || !isStringLiteral(value.type, VALID_GRADIENT_TYPES)) {
    return null;
  }

  return {
    type: value.type,
    startColor: normalizeString(value.startColor, DEFAULT_STYLE.fillColor),
    endColor: normalizeString(value.endColor, DEFAULT_STYLE.fillColor),
    angle: isFiniteNumber(value.angle) ? value.angle : 0,
  };
}

function normalizeShapeStyleInput(style: unknown): ShapeStyle {
  const styleRecord = isRecord(style) ? style : {};
  const styleInput: Partial<ShapeStyle> = {};

  if (typeof styleRecord.color === 'string') {
    styleInput.color = styleRecord.color;
  }
  if (typeof styleRecord.fillColor === 'string') {
    styleInput.fillColor = styleRecord.fillColor;
  }
  if (isFiniteNumber(styleRecord.strokeWidth) && styleRecord.strokeWidth > 0) {
    styleInput.strokeWidth = styleRecord.strokeWidth;
  }
  if (isStringLiteral(styleRecord.strokeStyle, VALID_STROKE_STYLES)) {
    styleInput.strokeStyle = styleRecord.strokeStyle;
  }
  if (isStringLiteral(styleRecord.fillStyle, VALID_FILL_STYLES)) {
    styleInput.fillStyle = styleRecord.fillStyle;
  }
  if (isFiniteNumber(styleRecord.opacity)) {
    styleInput.opacity = clamp(styleRecord.opacity, 0, 1);
  }
  if (isStringLiteral(styleRecord.blendMode, VALID_BLEND_MODES)) {
    styleInput.blendMode = styleRecord.blendMode;
  }
  if (isFiniteNumber(styleRecord.fontSize) && styleRecord.fontSize > 0) {
    styleInput.fontSize = styleRecord.fontSize;
  }
  if (typeof styleRecord.fontFamily === 'string') {
    styleInput.fontFamily = styleRecord.fontFamily;
  }
  if (isStringLiteral(styleRecord.fontWeight, VALID_FONT_WEIGHTS)) {
    styleInput.fontWeight = styleRecord.fontWeight;
  }
  if (isStringLiteral(styleRecord.fontStyle, VALID_FONT_STYLES)) {
    styleInput.fontStyle = styleRecord.fontStyle;
  }
  if (isStringLiteral(styleRecord.textAlign, VALID_TEXT_ALIGNS)) {
    styleInput.textAlign = styleRecord.textAlign;
  }
  if (Array.isArray(styleRecord.shadows)) {
    styleInput.shadows = styleRecord.shadows
      .map(normalizeShadowStyle)
      .filter((shadow): shadow is ShadowStyle => shadow !== null);
  }
  styleInput.fillGradient = normalizeFillGradient(styleRecord.fillGradient);

  return normalizeShapeStyle(styleInput);
}

function normalizeCamera(
  camera: unknown,
  warnings?: string[]
): PersistedEditorState['camera'] {
  if (!isRecord(camera)) {
    return { ...DEFAULT_PERSISTED_WORKSPACE_STATE.camera };
  }

  const x = isFiniteNumber(camera.x) ? camera.x : DEFAULT_PERSISTED_WORKSPACE_STATE.camera.x;
  const y = isFiniteNumber(camera.y) ? camera.y : DEFAULT_PERSISTED_WORKSPACE_STATE.camera.y;
  const zoom = isFiniteNumber(camera.zoom)
    ? clamp(camera.zoom, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM)
    : DEFAULT_PERSISTED_WORKSPACE_STATE.camera.zoom;

  if (!isFiniteNumber(camera.x) || !isFiniteNumber(camera.y) || !isFiniteNumber(camera.zoom) || camera.zoom !== zoom) {
    warnings?.push('Invalid camera values were reset or clamped.');
  }

  return { x, y, zoom };
}

function normalizeSelectedShapeIds(selectedShapeIds: unknown, validShapeIds?: ReadonlySet<string>): string[] {
  if (!Array.isArray(selectedShapeIds)) {
    return [...DEFAULT_PERSISTED_WORKSPACE_STATE.selectedShapeIds];
  }

  const seenIds = new Set<string>();
  return selectedShapeIds.filter((shapeId): shapeId is string => {
    if (typeof shapeId !== 'string' || seenIds.has(shapeId)) {
      return false;
    }

    seenIds.add(shapeId);
    return validShapeIds ? validShapeIds.has(shapeId) : true;
  });
}

interface NormalizedShapeBase {
  id: string;
  bounds: Bounds;
  style: ShapeStyle;
  createdAt: number;
  updatedAt: number;
  parentId?: string;
}

function createShapeBase(record: Record<string, unknown>, bounds: Bounds): NormalizedShapeBase {
  return {
    id: normalizeString(record.id, ''),
    bounds,
    style: normalizeShapeStyleInput(record.style),
    createdAt: normalizeTimestamp(record.createdAt),
    updatedAt: normalizeTimestamp(record.updatedAt),
    ...(typeof record.parentId === 'string' && record.parentId.length > 0 ? { parentId: record.parentId } : {}),
  };
}

export function validateWorkspaceName(name: string): WorkspaceNameValidationResult {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return {
      name: trimmedName,
      error: 'Workspace name is required.',
    };
  }

  if (trimmedName.length > MAX_WORKSPACE_NAME_LENGTH) {
    return {
      name: trimmedName,
      error: `Workspace names must be ${MAX_WORKSPACE_NAME_LENGTH} characters or fewer.`,
    };
  }

  return {
    name: trimmedName,
    error: null,
  };
}

export function normalizePersistedWorkspaceState(
  state?: PersistedWorkspaceStateInput,
  options: NormalizePersistedWorkspaceStateOptions = {}
): PersistedEditorState {
  const stateRecord = isRecord(state) ? state : {};

  return {
    tool: isStringLiteral(stateRecord.tool, VALID_TOOLS)
      ? stateRecord.tool
      : DEFAULT_PERSISTED_WORKSPACE_STATE.tool,
    selectedShapeIds: normalizeSelectedShapeIds(stateRecord.selectedShapeIds, options.validShapeIds),
    camera: normalizeCamera(stateRecord.camera, options.warnings),
    shapeStyle: normalizeShapeStyleInput(stateRecord.shapeStyle),
  };
}

function normalizeTextTypographyFromRecord(
  record: Record<string, unknown>,
  style: ShapeStyle
): TextTypography {
  return {
    fontSize: normalizePositiveNumber(record.fontSize, style.fontSize),
    fontFamily: normalizeString(record.fontFamily, style.fontFamily),
    fontWeight: isStringLiteral(record.fontWeight, VALID_FONT_WEIGHTS) ? record.fontWeight : style.fontWeight,
    fontStyle: isStringLiteral(record.fontStyle, VALID_FONT_STYLES) ? record.fontStyle : style.fontStyle,
    textAlign: isStringLiteral(record.textAlign, VALID_TEXT_ALIGNS) ? record.textAlign : style.textAlign,
  };
}

function normalizeShapeFromUnknown(value: unknown, index: number, warnings: string[]): Shape | null {
  if (!isRecord(value)) {
    warnings.push(`Shape at index ${index} was dropped because it is not an object.`);
    return null;
  }

  if (typeof value.id !== 'string' || value.id.length === 0) {
    warnings.push(`Shape at index ${index} was dropped because it has no valid id.`);
    return null;
  }

  if (!isStringLiteral(value.type, VALID_SHAPE_TYPES)) {
    warnings.push(`Shape ${value.id} was dropped because it has an unsupported type.`);
    return null;
  }

  const bounds = normalizeBounds(value.bounds);
  if (!bounds) {
    warnings.push(`Shape ${value.id} was dropped because it has invalid bounds.`);
    return null;
  }

  const base = createShapeBase(value, bounds);

  switch (value.type) {
    case 'rectangle':
      return {
        ...base,
        type: 'rectangle',
      };
    case 'circle': {
      const center = normalizePoint(value.center) ?? {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };
      const radius = isFiniteNumber(value.radius) && value.radius >= 0
        ? value.radius
        : Math.max(Math.abs(bounds.width), Math.abs(bounds.height)) / 2;

      return {
        ...base,
        type: 'circle',
        center,
        radius,
      };
    }
    case 'line': {
      const start = normalizePoint(value.start) ?? { x: bounds.x, y: bounds.y };
      const end = normalizePoint(value.end) ?? {
        x: bounds.x + bounds.width,
        y: bounds.y + bounds.height,
      };

      return {
        ...base,
        type: 'line',
        start,
        end,
      };
    }
    case 'arrow': {
      const start = normalizePoint(value.start) ?? { x: bounds.x, y: bounds.y };
      const end = normalizePoint(value.end) ?? {
        x: bounds.x + bounds.width,
        y: bounds.y + bounds.height,
      };

      return {
        ...base,
        type: 'arrow',
        start,
        end,
      };
    }
    case 'pencil': {
      if (!Array.isArray(value.points)) {
        warnings.push(`Shape ${value.id} was dropped because its pencil points are invalid.`);
        return null;
      }

      const points = value.points
        .map(normalizePoint)
        .filter((point): point is Point => point !== null);

      if (points.length === 0) {
        warnings.push(`Shape ${value.id} was dropped because it has no valid pencil points.`);
        return null;
      }

      return {
        ...base,
        type: 'pencil',
        points,
      };
    }
    case 'image':
      if (typeof value.src !== 'string') {
        warnings.push(`Shape ${value.id} was dropped because its image source is invalid.`);
        return null;
      }

      return {
        ...base,
        type: 'image',
        src: value.src,
        originalWidth: normalizePositiveNumber(value.originalWidth, Math.abs(bounds.width)),
        originalHeight: normalizePositiveNumber(value.originalHeight, Math.abs(bounds.height)),
        isBase64: typeof value.isBase64 === 'boolean' ? value.isBase64 : false,
      };
    case 'audio':
      if (typeof value.src !== 'string') {
        warnings.push(`Shape ${value.id} was dropped because its audio source is invalid.`);
        return null;
      }

      return {
        ...base,
        type: 'audio',
        src: value.src,
        duration: isFiniteNumber(value.duration) && value.duration >= 0 ? value.duration : 0,
        isPlaying: false,
        waveformData: Array.isArray(value.waveformData)
          ? value.waveformData.filter(isFiniteNumber)
          : [],
        isBase64: typeof value.isBase64 === 'boolean' ? value.isBase64 : false,
        ...(typeof value.loop === 'boolean' ? { loop: value.loop } : {}),
      };
    case 'text': {
      const typography = normalizeTextTypographyFromRecord(value, base.style);
      const textShape = normalizeDocumentShape({
        ...base,
        type: 'text',
        text: normalizeString(value.text, ''),
        ...typography,
      });

      return textShape;
    }
    case 'embed':
      if (typeof value.url !== 'string') {
        warnings.push(`Shape ${value.id} was dropped because its embed URL is invalid.`);
        return null;
      }

      return {
        ...base,
        type: 'embed',
        url: value.url,
        embedType: isStringLiteral(value.embedType, VALID_EMBED_TYPES) ? value.embedType : 'website',
        embedSrc: normalizeString(value.embedSrc, value.url),
      };
    case 'group':
      return {
        ...base,
        type: 'group',
      };
  }
}

function normalizeShapesFromUnknown(value: unknown, warnings: string[]): Shape[] {
  if (!Array.isArray(value)) {
    warnings.push('Workspace shapes were reset because the persisted value is not an array.');
    return [];
  }

  const seenIds = new Set<string>();
  const shapes: Shape[] = [];

  value.forEach((shapeValue, index) => {
    const shape = normalizeShapeFromUnknown(shapeValue, index, warnings);
    if (!shape) {
      return;
    }

    if (seenIds.has(shape.id)) {
      warnings.push(`Shape ${shape.id} was dropped because its id is duplicated.`);
      return;
    }

    seenIds.add(shape.id);
    shapes.push(shape);
  });

  const validShapeIds = new Set(shapes.map((shape) => shape.id));

  return shapes.map((shape) => {
    if (!shape.parentId || (shape.parentId !== shape.id && validShapeIds.has(shape.parentId))) {
      return shape;
    }

    warnings.push(`Shape ${shape.id} had an invalid parent id and was moved to the canvas root.`);
    const nextShape = { ...shape };
    delete nextShape.parentId;
    return nextShape;
  });
}

export function stripRuntimeStateFromShapes(shapes: Shape[]): Shape[] {
  return normalizeShapesFromUnknown(shapes, []);
}

export function normalizeWorkspaceForPersistence(workspace: Workspace): Workspace {
  return normalizeWorkspaceFromUnknown(workspace, 0, []) ?? {
    ...workspace,
    state: normalizePersistedWorkspaceState(workspace.state),
    shapes: [],
  };
}

export function validateWorkspaceSnapshot(snapshot: unknown): WorkspaceValidationResult<WorkspaceSnapshot> {
  const warnings: string[] = [];

  if (!isRecord(snapshot)) {
    return createValidationResult(
      {
        shapes: [],
        state: normalizePersistedWorkspaceState(),
      },
      warnings,
      'Workspace snapshot must be an object.'
    );
  }

  const shapes = normalizeShapesFromUnknown(snapshot.shapes, warnings);
  const validShapeIds = new Set(shapes.map((shape) => shape.id));
  const state = normalizePersistedWorkspaceState(
    isRecord(snapshot.state) ? snapshot.state : undefined,
    {
      validShapeIds,
      warnings,
    }
  );

  return createValidationResult({ shapes, state }, warnings);
}

export function normalizeWorkspaceSnapshot(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  return validateWorkspaceSnapshot(snapshot).value;
}

function normalizeWorkspaceName(value: unknown, index: number, warnings: string[]): string {
  if (typeof value !== 'string') {
    warnings.push(`Workspace at index ${index} was renamed because its name is invalid.`);
    return `Workspace ${index + 1}`;
  }

  const validation = validateWorkspaceName(value);
  if (!validation.error) {
    return validation.name;
  }

  const trimmedName = value.trim();
  if (trimmedName.length > MAX_WORKSPACE_NAME_LENGTH) {
    warnings.push(`Workspace at index ${index} had an overlong name that was truncated.`);
    return trimmedName.slice(0, MAX_WORKSPACE_NAME_LENGTH);
  }

  warnings.push(`Workspace at index ${index} was renamed because its name is blank.`);
  return `Workspace ${index + 1}`;
}

function normalizeWorkspaceFromUnknown(value: unknown, index: number, warnings: string[]): Workspace | null {
  if (!isRecord(value)) {
    warnings.push(`Workspace at index ${index} was dropped because it is not an object.`);
    return null;
  }

  const id = typeof value.id === 'string' && value.id.length > 0 ? value.id : `workspace-${index + 1}`;
  if (id !== value.id) {
    warnings.push(`Workspace at index ${index} received a replacement id.`);
  }

  const snapshotValidation = validateWorkspaceSnapshot({
    shapes: value.shapes,
    state: value.state,
  });
  warnings.push(...snapshotValidation.warnings);

  return {
    id,
    name: normalizeWorkspaceName(value.name, index, warnings),
    state: snapshotValidation.value.state,
    shapes: snapshotValidation.value.shapes,
    createdAt: normalizeTimestamp(value.createdAt),
    updatedAt: normalizeTimestamp(value.updatedAt),
  };
}

function normalizeWorkspaceArray(value: unknown, warnings: string[]): Workspace[] {
  if (!Array.isArray(value)) {
    warnings.push('Persisted workspaces were ignored because the value is not an array.');
    return [];
  }

  const seenIds = new Set<string>();
  const workspaces: Workspace[] = [];

  value.slice(0, MAX_WORKSPACES).forEach((workspaceValue, index) => {
    const workspace = normalizeWorkspaceFromUnknown(workspaceValue, index, warnings);
    if (!workspace) {
      return;
    }

    if (seenIds.has(workspace.id)) {
      warnings.push(`Workspace ${workspace.id} was dropped because its id is duplicated.`);
      return;
    }

    seenIds.add(workspace.id);
    workspaces.push(workspace);
  });

  if (value.length > MAX_WORKSPACES) {
    warnings.push(`Persisted workspaces were truncated to the ${MAX_WORKSPACES} workspace limit.`);
  }

  return workspaces;
}

export type PersistedWorkspaceStoreSnapshot = Pick<WorkspaceStore, 'workspaces' | 'activeWorkspaceId'>;

export function partializeWorkspaceStoreState(
  state: Pick<WorkspaceStore, 'workspaces' | 'activeWorkspaceId'>
): PersistedWorkspaceStoreSnapshot {
  return validatePersistedWorkspaceStoreState(
    {
      workspaces: state.workspaces,
      activeWorkspaceId: state.activeWorkspaceId,
    },
    state
  ).value;
}

export function validatePersistedWorkspaceStoreState(
  persistedState: unknown,
  currentState: Pick<WorkspaceStore, 'workspaces' | 'activeWorkspaceId'>
): WorkspaceValidationResult<PersistedWorkspaceStoreSnapshot> {
  const warnings: string[] = [];
  const persisted = isRecord(persistedState) ? persistedState : {};
  let workspaces = normalizeWorkspaceArray(persisted.workspaces, warnings);

  if (workspaces.length === 0 && currentState.workspaces.length > 0) {
    workspaces = normalizeWorkspaceArray(currentState.workspaces, warnings);
  }

  const activeWorkspaceId =
    typeof persisted.activeWorkspaceId === 'string' &&
    workspaces.some((workspace) => workspace.id === persisted.activeWorkspaceId)
      ? persisted.activeWorkspaceId
      : workspaces[0]?.id ?? currentState.activeWorkspaceId;

  if (
    typeof persisted.activeWorkspaceId === 'string' &&
    persisted.activeWorkspaceId.length > 0 &&
    activeWorkspaceId !== persisted.activeWorkspaceId
  ) {
    warnings.push('Active workspace id was reset because it does not match a persisted workspace.');
  }

  return createValidationResult(
    {
      workspaces,
      activeWorkspaceId,
    },
    warnings
  );
}

export function mergePersistedWorkspaceStoreState<T extends Pick<WorkspaceStore, 'workspaces' | 'activeWorkspaceId'>>(
  persistedState: unknown,
  currentState: T
): T {
  const validation = validatePersistedWorkspaceStoreState(persistedState, currentState);

  return {
    ...currentState,
    workspaces: validation.value.workspaces,
    activeWorkspaceId: validation.value.activeWorkspaceId,
  };
}

const createNewWorkspace = (id: string, name: string): Workspace => ({
  id,
  name,
  state: normalizePersistedWorkspaceState(),
  shapes: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist<WorkspaceStore, [], [], PersistedWorkspaceStoreSnapshot>(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: '',

      addWorkspace: () => {
        const state = get();

        if (state.workspaces.length >= MAX_WORKSPACES) {
          console.warn('Maximum number of workspaces reached');
          return state.activeWorkspaceId;
        }

        const nextNumber = get().getNextWorkspaceNumber();
        const id = `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const name = `Workspace ${nextNumber}`;

        const newWorkspace = createNewWorkspace(id, name);

        set({
          workspaces: [...state.workspaces, newWorkspace],
          activeWorkspaceId: id,
        });

        return id;
      },

      deleteWorkspace: (id: string) => {
        const state = get();

        if (state.workspaces.length <= 1) {
          console.warn('Cannot delete the last workspace');
          return false;
        }

        const newWorkspaces = state.workspaces.filter((w) => w.id !== id);
        let newActiveId = state.activeWorkspaceId;

        // If deleting active workspace, switch to another one
        if (state.activeWorkspaceId === id) {
          const index = state.workspaces.findIndex((w) => w.id === id);
          const nextIndex = index < newWorkspaces.length ? index : newWorkspaces.length - 1;
          newActiveId = newWorkspaces[nextIndex]?.id || '';
        }

        set({
          workspaces: newWorkspaces,
          activeWorkspaceId: newActiveId,
        });

        return true;
      },

      renameWorkspace: (id: string, name: string) => {
        const validation = validateWorkspaceName(name);
        if (validation.error) {
          console.warn(validation.error);
          return false;
        }

        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, name: validation.name, updatedAt: Date.now() } : w
          ),
        }));
        return true;
      },

      switchWorkspace: (workspaceId: string) => {
        const state = get();
        const workspace = state.workspaces.find((w) => w.id === workspaceId);
        if (workspace) {
          set({ activeWorkspaceId: workspaceId });
        }
      },

      canDeleteWorkspace: () => {
        const state = get();
        return state.workspaces.length > 1;
      },

      getWorkspace: (id: string) => {
        const workspace = get().workspaces.find((w) => w.id === id);
        return workspace ? normalizeWorkspaceForPersistence(workspace) : undefined;
      },

      getActiveWorkspace: () => {
        const state = get();
        const workspace = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
        if (!workspace) {
          // Return a default workspace if none found
          return createNewWorkspace('default', 'Workspace 1');
        }
        return normalizeWorkspaceForPersistence(workspace);
      },

      getNextWorkspaceNumber: () => {
        const state = get();
        const usedNumbers = state.workspaces
          .map((w) => {
            const match = w.name.match(/^Workspace\s+(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n) => n > 0);

        let nextNumber = 1;
        while (usedNumbers.includes(nextNumber)) {
          nextNumber++;
        }
        return nextNumber;
      },

      saveWorkspaceSnapshot: (id: string, snapshot: WorkspaceSnapshot) => {
        const state = get();
        if (!state.workspaces.some((workspace) => workspace.id === id)) {
          return createPersistenceResult([], `Workspace ${id} was not found.`);
        }

        const validation = validateWorkspaceSnapshot(snapshot);
        if (!validation.success) {
          return createPersistenceResult(validation.warnings, validation.error);
        }

        const normalizedSnapshot = validation.value;
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id
              ? {
                  ...w,
                  shapes: normalizedSnapshot.shapes,
                  state: normalizedSnapshot.state,
                  updatedAt: Date.now(),
                }
              : w
          ),
        }));
        return createPersistenceResult(validation.warnings);
      },
    }),
    {
      name: 'tldraw-workspaces',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => partializeWorkspaceStoreState(state),
      merge: (persistedState, currentState) =>
        mergePersistedWorkspaceStoreState(
          persistedState,
          currentState as WorkspaceStore
        ),
    }
  )
);
