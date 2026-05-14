import { DEFAULT_STYLE, createShapeId } from '../types';
import type { Bounds, EditorState, GroupShape, Shape, ShapeStyle } from '../types';
import type {
  AgentCreateConnectorAction,
  AgentCreateShapeAction,
  AgentGenerationProposal,
  AgentMutationProposal,
} from '../types/agents';
import { generateBounds } from '../types/geometry';
import {
  getGroupBounds,
  getGroupChildIds,
  getGroupDescendants,
  normalizeShapeIdsForSelection,
} from '../types/selection';
import { applyTextStyleUpdates, normalizeShapeStyle, normalizeTextShape } from './textStyle';

export interface DocumentCommandState {
  shapes: Shape[];
  editorState: EditorState;
}

export interface DocumentProposalResult {
  state: DocumentCommandState;
  appliedShapeIds: string[];
}

export interface ShapeUpdateOperation {
  id: string;
  updates: Partial<Shape>;
}

export type LayoutAlignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributionDirection = 'horizontal' | 'vertical';

function normalizeShapeIdsForLayering(shapeIds: string[], shapes: Shape[]): string[] {
  return normalizeShapeIdsForSelection(shapeIds, shapes);
}

function expandShapeIdsForLayering(shapeIds: string[], shapes: Shape[]): Set<string> {
  const expandedIds = new Set<string>();

  for (const shapeId of shapeIds) {
    expandedIds.add(shapeId);

    const shape = shapes.find((candidate) => candidate.id === shapeId);
    if (shape?.type === 'group') {
      const descendants = getGroupDescendants(shapeId, shapes);
      descendants.forEach((descendant) => expandedIds.add(descendant.id));
    }
  }

  return expandedIds;
}

function reorderShapesByLayer(shapeIds: string[], shapes: Shape[], destination: 'front' | 'back'): Shape[] {
  const normalizedIds = normalizeShapeIdsForLayering(shapeIds, shapes);
  if (normalizedIds.length === 0) return shapes;

  const idsToMove = expandShapeIdsForLayering(normalizedIds, shapes);
  const movedShapes = shapes.filter((shape) => idsToMove.has(shape.id));
  const stationaryShapes = shapes.filter((shape) => !idsToMove.has(shape.id));

  if (movedShapes.length === 0 || stationaryShapes.length === 0) {
    return shapes;
  }

  return destination === 'front'
    ? stationaryShapes.concat(movedShapes)
    : movedShapes.concat(stationaryShapes);
}

function mergeGeneratedStyle(baseStyle: ShapeStyle, overrides?: Partial<ShapeStyle>): ShapeStyle {
  return normalizeShapeStyle({
    ...DEFAULT_STYLE,
    ...baseStyle,
    ...overrides,
  });
}

function createGeneratedCanvasShape(
  action: AgentCreateShapeAction,
  baseStyle: ShapeStyle,
  timestamp: number
): Shape {
  const style = mergeGeneratedStyle(baseStyle, action.shape.style);

  if (action.shape.type === 'text') {
    return normalizeTextShape({
      id: action.shape.id,
      type: 'text',
      bounds: { ...action.shape.bounds },
      text: action.shape.text ?? '',
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      textAlign: style.textAlign,
      style,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  if (action.shape.type === 'circle') {
    const { x, y, width, height } = action.shape.bounds;

    return {
      id: action.shape.id,
      type: 'circle',
      bounds: { ...action.shape.bounds },
      center: {
        x: x + width / 2,
        y: y + height / 2,
      },
      radius: Math.min(width, height) / 2,
      style,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  return {
    id: action.shape.id,
    type: 'rectangle',
    bounds: { ...action.shape.bounds },
    style,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createGeneratedCanvasConnector(
  action: AgentCreateConnectorAction,
  baseStyle: ShapeStyle,
  timestamp: number
): Shape {
  const style = mergeGeneratedStyle(baseStyle, action.connector.style);

  return {
    id: action.connector.id,
    type: action.connector.type,
    bounds: generateBounds(action.connector.start, action.connector.end),
    start: { ...action.connector.start },
    end: { ...action.connector.end },
    style,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createGeneratedNodeLabel(
  nodeShapeId: string,
  label: string,
  bounds: Shape['bounds'],
  baseStyle: ShapeStyle,
  timestamp: number,
  existingIds: Set<string>
): Shape {
  const labelBaseId = `${nodeShapeId}-label`;
  let labelId = labelBaseId;
  let suffix = 1;

  while (existingIds.has(labelId)) {
    labelId = `${labelBaseId}-${suffix}`;
    suffix += 1;
  }

  existingIds.add(labelId);

  const style = mergeGeneratedStyle(baseStyle, {
    color: baseStyle.color,
    fillStyle: 'none',
    textAlign: 'center',
  });

  const insetX = Math.min(12, Math.max(bounds.width * 0.12, 6));
  const insetY = Math.min(12, Math.max(bounds.height * 0.12, 6));

  return normalizeTextShape({
    id: labelId,
    type: 'text',
    bounds: {
      x: bounds.x + insetX,
      y: bounds.y + insetY,
      width: Math.max(bounds.width - insetX * 2, 40),
      height: Math.max(bounds.height - insetY * 2, style.fontSize * 1.4),
    },
    text: label,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textAlign: style.textAlign,
    style,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

function applyShapeBounds(shape: Shape, nextBounds: Partial<Shape['bounds']>): Shape {
  const bounds = {
    ...shape.bounds,
    ...nextBounds,
  };

  if (shape.type === 'circle') {
    return {
      ...shape,
      bounds,
      center: {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      },
      radius: Math.min(bounds.width, bounds.height) / 2,
    };
  }

  return {
    ...shape,
    bounds,
  };
}

function applyShapeUpdate(shape: Shape, updates: Partial<Shape>, timestamp: number): Shape {
  const { bounds, style: styleUpdates, ...otherUpdates } = updates;
  const nextShape = bounds ? applyShapeBounds(shape, bounds) : shape;

  if (nextShape.type === 'text') {
    let nextTextShape = {
      ...nextShape,
      ...otherUpdates,
      updatedAt: timestamp,
    } as Extract<Shape, { type: 'text' }>;

    if (styleUpdates) {
      nextTextShape = applyTextStyleUpdates(nextTextShape, styleUpdates, timestamp);
    }

    return normalizeTextShape(nextTextShape);
  }

  return {
    ...nextShape,
    ...(styleUpdates
      ? {
          style: { ...nextShape.style, ...styleUpdates },
        }
      : {}),
    ...otherUpdates,
    updatedAt: timestamp,
  } as Shape;
}

function getLayoutBounds(shape: Shape, shapes: Shape[]): Bounds {
  if (shape.type === 'group') {
    return getGroupBounds(shape.id, shapes) ?? shape.bounds;
  }

  return shape.bounds;
}

function createMoveShapeOperation(
  shape: Shape,
  deltaX: number,
  deltaY: number,
  bounds: Bounds = {
    ...shape.bounds,
    x: shape.bounds.x + deltaX,
    y: shape.bounds.y + deltaY,
  }
): ShapeUpdateOperation {
  const updates: Partial<Shape> = { bounds };

  switch (shape.type) {
    case 'circle':
      return {
        id: shape.id,
        updates: {
          ...updates,
          center: {
            x: shape.center.x + deltaX,
            y: shape.center.y + deltaY,
          },
        },
      };
    case 'line':
    case 'arrow':
      return {
        id: shape.id,
        updates: {
          ...updates,
          start: {
            x: shape.start.x + deltaX,
            y: shape.start.y + deltaY,
          },
          end: {
            x: shape.end.x + deltaX,
            y: shape.end.y + deltaY,
          },
        },
      };
    case 'pencil':
      return {
        id: shape.id,
        updates: {
          ...updates,
          points: shape.points.map((point) => ({
            x: point.x + deltaX,
            y: point.y + deltaY,
          })),
        },
      };
    case 'rectangle':
    case 'image':
    case 'audio':
    case 'text':
    case 'embed':
    case 'group':
      return {
        id: shape.id,
        updates,
      };
  }
}

function addLayoutMoveOperations(
  operationsById: Map<string, ShapeUpdateOperation>,
  shape: Shape,
  shapes: Shape[],
  nextBounds: Bounds
): void {
  const currentBounds = getLayoutBounds(shape, shapes);
  const deltaX = nextBounds.x - currentBounds.x;
  const deltaY = nextBounds.y - currentBounds.y;

  if (deltaX === 0 && deltaY === 0) {
    return;
  }

  operationsById.set(shape.id, createMoveShapeOperation(shape, deltaX, deltaY, nextBounds));

  if (shape.type !== 'group') {
    return;
  }

  for (const descendant of getGroupDescendants(shape.id, shapes)) {
    operationsById.set(descendant.id, createMoveShapeOperation(descendant, deltaX, deltaY));
  }
}

function updateLayoutTargetsInDocument(
  state: DocumentCommandState,
  layoutTargets: Array<{ shape: Shape; bounds: Bounds }>,
  getNextBounds: (target: { shape: Shape; bounds: Bounds }, index: number) => Bounds,
  timestamp: number
): DocumentCommandState {
  const operationsById = new Map<string, ShapeUpdateOperation>();

  layoutTargets.forEach((target, index) => {
    addLayoutMoveOperations(operationsById, target.shape, state.shapes, getNextBounds(target, index));
  });

  return updateShapesInDocument(state, Array.from(operationsById.values()), timestamp);
}

export function addShapeToDocument(state: DocumentCommandState, shape: Shape): DocumentCommandState {
  return {
    ...state,
    shapes: [...state.shapes, shape],
  };
}

export function updateShapesInDocument(
  state: DocumentCommandState,
  operations: ShapeUpdateOperation[],
  timestamp: number = Date.now()
): DocumentCommandState {
  if (operations.length === 0) {
    return state;
  }

  const operationsById = new Map(operations.map((operation) => [operation.id, operation.updates]));
  let changed = false;

  const nextShapes = state.shapes.map((shape) => {
    const updates = operationsById.get(shape.id);
    if (!updates) return shape;
    changed = true;
    return applyShapeUpdate(shape, updates, timestamp);
  });

  if (!changed) {
    return state;
  }

  return {
    ...state,
    shapes: nextShapes,
  };
}

export function updateShapeInDocument(
  state: DocumentCommandState,
  id: string,
  updates: Partial<Shape>,
  timestamp: number = Date.now()
): DocumentCommandState {
  return updateShapesInDocument(state, [{ id, updates }], timestamp);
}

export function updateShapeBoundsInDocument(
  state: DocumentCommandState,
  id: string,
  updates: Partial<Bounds>,
  timestamp: number = Date.now()
): DocumentCommandState {
  const shape = state.shapes.find((candidate) => candidate.id === id);
  if (!shape) {
    return state;
  }

  const nextBounds: Bounds = {
    ...shape.bounds,
    ...updates,
  };

  nextBounds.width = Math.max(1, nextBounds.width);
  nextBounds.height = Math.max(1, nextBounds.height);

  return updateShapeInDocument(state, id, { bounds: nextBounds }, timestamp);
}

export function deleteShapeFromDocument(state: DocumentCommandState, id: string): DocumentCommandState {
  const shapeToDelete = state.shapes.find((shape) => shape.id === id);
  if (!shapeToDelete) {
    return state;
  }

  const idsToDelete = new Set<string>([id]);

  if (shapeToDelete.type === 'group') {
    const descendants = getGroupDescendants(id, state.shapes);
    descendants.forEach((descendant) => idsToDelete.add(descendant.id));
  }

  return {
    shapes: state.shapes.filter((shape) => !idsToDelete.has(shape.id)),
    editorState: {
      ...state.editorState,
      selectedShapeIds: state.editorState.selectedShapeIds.filter((shapeId) => !idsToDelete.has(shapeId)),
    },
  };
}

export function deleteSelectedShapesFromDocument(state: DocumentCommandState): DocumentCommandState {
  if (state.editorState.selectedShapeIds.length === 0) {
    return state;
  }

  const idsToDelete = new Set<string>();

  for (const selectedId of state.editorState.selectedShapeIds) {
    idsToDelete.add(selectedId);
    const shape = state.shapes.find((candidate) => candidate.id === selectedId);
    if (shape?.type === 'group') {
      const descendants = getGroupDescendants(selectedId, state.shapes);
      descendants.forEach((descendant) => idsToDelete.add(descendant.id));
    }
  }

  return {
    shapes: state.shapes.filter((shape) => !idsToDelete.has(shape.id)),
    editorState: {
      ...state.editorState,
      selectedShapeIds: [],
    },
  };
}

export function updateSelectedShapeStyleInDocument(
  state: DocumentCommandState,
  updates: Partial<ShapeStyle>,
  timestamp: number = Date.now()
): DocumentCommandState {
  const nextShapeStyle = { ...state.editorState.shapeStyle, ...updates };
  const selectedShapeIds = state.editorState.selectedShapeIds;

  if (selectedShapeIds.length === 0) {
    return {
      ...state,
      editorState: {
        ...state.editorState,
        shapeStyle: nextShapeStyle,
      },
    };
  }

  return {
    shapes: state.shapes.map((shape) =>
      selectedShapeIds.includes(shape.id)
        ? shape.type === 'text'
          ? applyTextStyleUpdates(shape, updates, timestamp)
          : {
              ...shape,
              style: { ...shape.style, ...updates },
              updatedAt: timestamp,
            }
        : shape
    ),
    editorState: {
      ...state.editorState,
      shapeStyle: nextShapeStyle,
    },
  };
}

export function applyGeneratedDiagramToDocument(
  state: DocumentCommandState,
  proposal: AgentGenerationProposal,
  timestamp: number = Date.now()
): DocumentProposalResult {
  const reservedIds = new Set(state.shapes.map((shape) => shape.id));
  const nextShapes = proposal.actions.flatMap((action) => {
    if (action.type === 'create-connector') {
      const connector = createGeneratedCanvasConnector(action, state.editorState.shapeStyle, timestamp);
      reservedIds.add(connector.id);
      return [connector];
    }

    const nodeShape = createGeneratedCanvasShape(action, state.editorState.shapeStyle, timestamp);
    reservedIds.add(nodeShape.id);

    if (action.shape.type === 'text' || !action.shape.text?.trim()) {
      return [nodeShape];
    }

    const labelShape = createGeneratedNodeLabel(
      action.shape.id,
      action.shape.text,
      action.shape.bounds,
      mergeGeneratedStyle(state.editorState.shapeStyle, action.shape.style),
      timestamp,
      reservedIds
    );

    return [nodeShape, labelShape];
  });
  const appliedShapeIds = nextShapes.map((shape) => shape.id);

  return {
    state: {
      shapes: [...state.shapes, ...nextShapes],
      editorState: {
        ...state.editorState,
        selectedShapeIds: appliedShapeIds,
      },
    },
    appliedShapeIds,
  };
}

export function applyMutationProposalToDocument(
  state: DocumentCommandState,
  proposal: AgentMutationProposal,
  timestamp: number = Date.now()
): DocumentProposalResult {
  const actionLookup = new Map(proposal.actions.map((action) => [action.targetId, action]));
  const deletedShapeIds = new Set(
    proposal.actions
      .filter((action): action is Extract<AgentMutationProposal['actions'][number], { type: 'delete-shape' }> =>
        action.type === 'delete-shape'
      )
      .map((action) => action.targetId)
  );

  const nextShapes = state.shapes
    .filter((shape) => !deletedShapeIds.has(shape.id))
    .map((shape) => {
      const action = actionLookup.get(shape.id);
      if (!action || action.type !== 'update-shape') {
        return shape;
      }

      let nextShape: Shape = shape;

      if (action.changes.bounds) {
        nextShape = applyShapeBounds(nextShape, action.changes.bounds);
      }

      if (action.changes.style) {
        nextShape =
          nextShape.type === 'text'
            ? applyTextStyleUpdates(nextShape, action.changes.style, timestamp)
            : {
                ...nextShape,
                style: {
                  ...nextShape.style,
                  ...action.changes.style,
                },
              };
      }

      if (typeof action.changes.text === 'string' && nextShape.type === 'text') {
        nextShape = {
          ...nextShape,
          text: action.changes.text,
        };
      }

      return {
        ...nextShape,
        updatedAt: timestamp,
      };
    });

  const appliedShapeIds = proposal.actions
    .map((action) => action.targetId)
    .filter((shapeId) => !deletedShapeIds.has(shapeId));

  return {
    state: {
      shapes: nextShapes,
      editorState: {
        ...state.editorState,
        selectedShapeIds: appliedShapeIds,
      },
    },
    appliedShapeIds,
  };
}

export function groupShapesInDocument(
  state: DocumentCommandState,
  shapeIds: string[],
  timestamp: number = Date.now()
): DocumentCommandState {
  const normalizedShapeIds = normalizeShapeIdsForSelection(shapeIds, state.shapes);
  if (normalizedShapeIds.length < 2) return state;

  const shapesToGroup = state.shapes.filter((shape) => normalizedShapeIds.includes(shape.id));
  if (shapesToGroup.length < 2) return state;

  const parentIds = new Set(shapesToGroup.map((shape) => shape.parentId));
  const commonParentId = parentIds.size === 1 ? Array.from(parentIds)[0] : undefined;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapesToGroup) {
    minX = Math.min(minX, shape.bounds.x);
    minY = Math.min(minY, shape.bounds.y);
    maxX = Math.max(maxX, shape.bounds.x + shape.bounds.width);
    maxY = Math.max(maxY, shape.bounds.y + shape.bounds.height);
  }

  const groupId = createShapeId();
  const group: GroupShape = {
    id: groupId,
    type: 'group',
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    style: { ...state.editorState.shapeStyle },
    createdAt: timestamp,
    updatedAt: timestamp,
    parentId: commonParentId,
  };

  return {
    shapes: state.shapes
      .map((shape) => (normalizedShapeIds.includes(shape.id) ? { ...shape, parentId: groupId } : shape))
      .concat(group),
    editorState: {
      ...state.editorState,
      selectedShapeIds: [groupId],
    },
  };
}

export function ungroupShapesInDocument(state: DocumentCommandState, groupId: string): DocumentCommandState {
  const group = state.shapes.find((shape) => shape.id === groupId);
  if (!group || group.type !== 'group') return state;

  const childIds = getGroupChildIds(group.id, state.shapes);
  const { parentId: grandParentId } = group;

  return {
    shapes: state.shapes
      .filter((shape) => shape.id !== groupId)
      .map((shape) => (childIds.includes(shape.id) ? { ...shape, parentId: grandParentId } : shape)),
    editorState: {
      ...state.editorState,
      selectedShapeIds: childIds,
    },
  };
}

export function bringShapesToFrontInDocument(
  state: DocumentCommandState,
  shapeIds: string[]
): DocumentCommandState {
  if (shapeIds.length === 0) return state;

  const nextShapes = reorderShapesByLayer(shapeIds, state.shapes, 'front');
  if (nextShapes === state.shapes) {
    return state;
  }

  return {
    ...state,
    shapes: nextShapes,
  };
}

export function sendShapesToBackInDocument(
  state: DocumentCommandState,
  shapeIds: string[]
): DocumentCommandState {
  if (shapeIds.length === 0) return state;

  const nextShapes = reorderShapesByLayer(shapeIds, state.shapes, 'back');
  if (nextShapes === state.shapes) {
    return state;
  }

  return {
    ...state,
    shapes: nextShapes,
  };
}

export function alignShapesInDocument(
  state: DocumentCommandState,
  shapeIds: string[],
  alignment: LayoutAlignment,
  timestamp: number = Date.now()
): DocumentCommandState {
  const selectedShapes = state.shapes.filter((shape) => shapeIds.includes(shape.id));
  if (selectedShapes.length < 2) {
    return state;
  }

  const layoutTargets = selectedShapes.map((shape) => ({
    shape,
    bounds: getLayoutBounds(shape, state.shapes),
  }));
  const bounds = layoutTargets.map((target) => target.bounds);
  let targetValue: number;
  let getNextBounds: (target: { shape: Shape; bounds: Bounds }) => Bounds;

  switch (alignment) {
    case 'left':
      targetValue = Math.min(...bounds.map((bound) => bound.x));
      getNextBounds = (target) => ({
        ...target.bounds,
        x: targetValue,
      });
      break;
    case 'center': {
      const centers = bounds.map((bound) => bound.x + bound.width / 2);
      targetValue = centers.reduce((sum, value) => sum + value, 0) / centers.length;
      getNextBounds = (target) => ({
        ...target.bounds,
        x: targetValue - target.bounds.width / 2,
      });
      break;
    }
    case 'right':
      targetValue = Math.max(...bounds.map((bound) => bound.x + bound.width));
      getNextBounds = (target) => ({
        ...target.bounds,
        x: targetValue - target.bounds.width,
      });
      break;
    case 'top':
      targetValue = Math.min(...bounds.map((bound) => bound.y));
      getNextBounds = (target) => ({
        ...target.bounds,
        y: targetValue,
      });
      break;
    case 'middle': {
      const centers = bounds.map((bound) => bound.y + bound.height / 2);
      targetValue = centers.reduce((sum, value) => sum + value, 0) / centers.length;
      getNextBounds = (target) => ({
        ...target.bounds,
        y: targetValue - target.bounds.height / 2,
      });
      break;
    }
    case 'bottom':
      targetValue = Math.max(...bounds.map((bound) => bound.y + bound.height));
      getNextBounds = (target) => ({
        ...target.bounds,
        y: targetValue - target.bounds.height,
      });
      break;
  }

  return updateLayoutTargetsInDocument(state, layoutTargets, getNextBounds, timestamp);
}

export function distributeShapesInDocument(
  state: DocumentCommandState,
  shapeIds: string[],
  direction: DistributionDirection,
  timestamp: number = Date.now()
): DocumentCommandState {
  const selectedShapes = state.shapes.filter((shape) => shapeIds.includes(shape.id));
  if (selectedShapes.length < 3) {
    return state;
  }

  const layoutTargets = selectedShapes.map((shape) => ({
    shape,
    bounds: getLayoutBounds(shape, state.shapes),
  }));

  if (direction === 'horizontal') {
    const sorted = [...layoutTargets].sort((a, b) => a.bounds.x - b.bounds.x);
    const leftmost = sorted[0].bounds.x;
    const rightmost = sorted[sorted.length - 1].bounds.x + sorted[sorted.length - 1].bounds.width;
    const totalWidth = rightmost - leftmost;
    const totalShapesWidth = sorted.reduce((sum, target) => sum + target.bounds.width, 0);
    const gap = (totalWidth - totalShapesWidth) / (sorted.length - 1);

    let currentX = leftmost;
    return updateLayoutTargetsInDocument(
      state,
      sorted,
      (target) => {
        const nextBounds = {
          ...target.bounds,
          x: currentX,
        };
        currentX += target.bounds.width + gap;
        return nextBounds;
      },
      timestamp
    );
  }

  const sorted = [...layoutTargets].sort((a, b) => a.bounds.y - b.bounds.y);
  const topmost = sorted[0].bounds.y;
  const bottommost = sorted[sorted.length - 1].bounds.y + sorted[sorted.length - 1].bounds.height;
  const totalHeight = bottommost - topmost;
  const totalShapesHeight = sorted.reduce((sum, target) => sum + target.bounds.height, 0);
  const gap = (totalHeight - totalShapesHeight) / (sorted.length - 1);

  let currentY = topmost;
  return updateLayoutTargetsInDocument(
    state,
    sorted,
    (target) => {
      const nextBounds = {
        ...target.bounds,
        y: currentY,
      };
      currentY += target.bounds.height + gap;
      return nextBounds;
    },
    timestamp
  );
}

export function tidyShapesInDocument(
  state: DocumentCommandState,
  shapeIds: string[],
  timestamp: number = Date.now()
): DocumentCommandState {
  const selectedShapes = state.shapes.filter((shape) => shapeIds.includes(shape.id));
  if (selectedShapes.length < 2) {
    return state;
  }

  const layoutTargets = selectedShapes.map((shape) => ({
    shape,
    bounds: getLayoutBounds(shape, state.shapes),
  }));
  const cols = Math.ceil(Math.sqrt(layoutTargets.length));
  const spacing = 20;
  const avgX = layoutTargets.reduce((sum, target) => sum + target.bounds.x, 0) / layoutTargets.length;
  const avgY = layoutTargets.reduce((sum, target) => sum + target.bounds.y, 0) / layoutTargets.length;
  const maxWidth = Math.max(...layoutTargets.map((target) => target.bounds.width));
  const maxHeight = Math.max(...layoutTargets.map((target) => target.bounds.height));
  const gridWidth = cols * maxWidth + (cols - 1) * spacing;
  const rows = Math.ceil(layoutTargets.length / cols);
  const gridHeight = rows * maxHeight + (rows - 1) * spacing;
  const startX = avgX - gridWidth / 2;
  const startY = avgY - gridHeight / 2;
  const sortedTargets = [...layoutTargets].sort((a, b) => {
    if (Math.abs(a.bounds.y - b.bounds.y) < 50) {
      return a.bounds.x - b.bounds.x;
    }
    return a.bounds.y - b.bounds.y;
  });

  return updateLayoutTargetsInDocument(
    state,
    sortedTargets,
    (target, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (maxWidth + spacing) + (maxWidth - target.bounds.width) / 2;
      const y = startY + row * (maxHeight + spacing) + (maxHeight - target.bounds.height) / 2;

      return {
        ...target.bounds,
        x,
        y,
      };
    },
    timestamp
  );
}
