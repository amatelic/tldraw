import type { Bounds, ShapeStyle } from '../../types';
import type {
  AgentDeleteShapeAction,
  AgentMutationProposal,
  AgentProvider,
  AgentRequest,
  AgentShapeSummary,
  AgentUpdateShapeAction,
} from '../../types/agents';

const NON_LAYOUT_TYPES = new Set<AgentShapeSummary['type']>(['line', 'arrow', 'pencil', 'group']);
const ROW_CLUSTER_THRESHOLD = 36;
const ALIGNMENT_THRESHOLD = 8;
const MAX_ALIGNMENT_RANGE = 48;
const SPACING_VARIANCE_THRESHOLD = 16;
const SPACING_POSITION_THRESHOLD = 8;
const STYLE_OUTLIER_THRESHOLD = 1;

interface PendingCleanupUpdate {
  target: AgentShapeSummary;
  bounds: Partial<Bounds>;
  style: Partial<ShapeStyle>;
  reasons: string[];
}

function isOrganizableShape(shape: AgentShapeSummary): boolean {
  return !NON_LAYOUT_TYPES.has(shape.type);
}

function isStylableShape(shape: AgentShapeSummary): boolean {
  return isOrganizableShape(shape) && shape.type !== 'text';
}

function getShapeLabel(shape: AgentShapeSummary): string {
  const text = shape.text?.trim();
  if (text) {
    return text;
  }

  if (shape.type === 'text') {
    return 'Untitled text block';
  }

  return `${shape.type} ${shape.id}`;
}

function getScopeLabel(scope: AgentRequest['context']['scope']): string {
  switch (scope) {
    case 'selection':
      return 'selection';
    case 'visible-board':
      return 'visible board';
    case 'full-board':
    default:
      return 'full board';
  }
}

function addReason(reasons: string[], reason: string): string[] {
  return reasons.includes(reason) ? reasons : [...reasons, reason];
}

function getPendingUpdate(map: Map<string, PendingCleanupUpdate>, shape: AgentShapeSummary): PendingCleanupUpdate {
  const existing = map.get(shape.id);
  if (existing) {
    return existing;
  }

  const created: PendingCleanupUpdate = {
    target: shape,
    bounds: {},
    style: {},
    reasons: [],
  };
  map.set(shape.id, created);
  return created;
}

function queueBoundsChange(
  map: Map<string, PendingCleanupUpdate>,
  shape: AgentShapeSummary,
  changes: Partial<Bounds>,
  reason: string
): void {
  const pending = getPendingUpdate(map, shape);
  pending.bounds = {
    ...pending.bounds,
    ...changes,
  };
  pending.reasons = addReason(pending.reasons, reason);
}

function queueStyleChange(
  map: Map<string, PendingCleanupUpdate>,
  shape: AgentShapeSummary,
  changes: Partial<ShapeStyle>,
  reason: string
): void {
  const pending = getPendingUpdate(map, shape);
  pending.style = {
    ...pending.style,
    ...changes,
  };
  pending.reasons = addReason(pending.reasons, reason);
}

function getCenterY(shape: AgentShapeSummary): number {
  return shape.bounds.y + shape.bounds.height / 2;
}

function buildRows(shapes: AgentShapeSummary[]): AgentShapeSummary[][] {
  const sortedShapes = [...shapes].sort((left, right) => getCenterY(left) - getCenterY(right));
  const rows: AgentShapeSummary[][] = [];

  for (const shape of sortedShapes) {
    const shapeCenterY = getCenterY(shape);
    const matchingRow = rows.find((row) => {
      const averageCenterY = row.reduce((total, item) => total + getCenterY(item), 0) / row.length;
      return Math.abs(averageCenterY - shapeCenterY) <= ROW_CLUSTER_THRESHOLD;
    });

    if (matchingRow) {
      matchingRow.push(shape);
      continue;
    }

    rows.push([shape]);
  }

  return rows;
}

function getMedian(values: number[]): number {
  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex] ?? 0;
  }

  const left = sortedValues[middleIndex - 1] ?? 0;
  const right = sortedValues[middleIndex] ?? 0;
  return (left + right) / 2;
}

function maybeQueueAlignmentSuggestions(
  shapes: AgentShapeSummary[],
  updates: Map<string, PendingCleanupUpdate>
): void {
  const rows = buildRows(shapes);

  for (const row of rows) {
    if (row.length < 2) {
      continue;
    }

    const yValues = row.map((shape) => shape.bounds.y);
    const alignmentRange = Math.max(...yValues) - Math.min(...yValues);

    if (alignmentRange < ALIGNMENT_THRESHOLD || alignmentRange > MAX_ALIGNMENT_RANGE) {
      continue;
    }

    const targetY = Math.round(getMedian(yValues));
    row.forEach((shape) => {
      if (Math.abs(shape.bounds.y - targetY) <= 4) {
        return;
      }

      queueBoundsChange(updates, shape, { y: targetY }, 'align row position');
    });
  }
}

function maybeQueueSpacingSuggestions(
  shapes: AgentShapeSummary[],
  updates: Map<string, PendingCleanupUpdate>
): void {
  const rows = buildRows(shapes);

  for (const row of rows) {
    if (row.length < 3) {
      continue;
    }

    const orderedRow = [...row].sort((left, right) => left.bounds.x - right.bounds.x);
    const gaps = orderedRow.slice(0, -1).map((shape, index) => {
      const nextShape = orderedRow[index + 1];
      if (!nextShape) {
        return 0;
      }

      return nextShape.bounds.x - (shape.bounds.x + shape.bounds.width);
    });

    const gapVariance = Math.max(...gaps) - Math.min(...gaps);
    if (gapVariance < SPACING_VARIANCE_THRESHOLD) {
      continue;
    }

    const averageGap = gaps.reduce((total, gap) => total + gap, 0) / gaps.length;
    const targetGap = Math.max(16, Math.round(averageGap));
    let currentX = orderedRow[0]?.bounds.x ?? 0;

    orderedRow.forEach((shape, index) => {
      if (index === 0) {
        currentX = shape.bounds.x + shape.bounds.width;
        return;
      }

      const expectedX = currentX + targetGap;
      if (Math.abs(shape.bounds.x - expectedX) > SPACING_POSITION_THRESHOLD) {
        queueBoundsChange(updates, shape, { x: expectedX }, 'normalize horizontal spacing');
      }

      currentX = expectedX + shape.bounds.width;
    });
  }
}

function getDominantValue<T>(values: T[]): T | null {
  if (values.length === 0) {
    return null;
  }

  const counts = values.reduce<Map<T, number>>((result, value) => {
    result.set(value, (result.get(value) ?? 0) + 1);
    return result;
  }, new Map());

  let dominantValue: T | null = null;
  let dominantCount = 0;

  counts.forEach((count, value) => {
    if (count > dominantCount) {
      dominantValue = value;
      dominantCount = count;
    }
  });

  return dominantCount > values.length / 2 ? dominantValue : null;
}

function maybeQueueStyleSuggestions(
  shapes: AgentShapeSummary[],
  updates: Map<string, PendingCleanupUpdate>
): void {
  const stylableShapes = shapes.filter(isStylableShape);
  if (stylableShapes.length < 3) {
    return;
  }

  const dominantStrokeWidth = getDominantValue(stylableShapes.map((shape) => shape.style.strokeWidth));
  if (dominantStrokeWidth !== null) {
    stylableShapes.forEach((shape) => {
      if (Math.abs(shape.style.strokeWidth - dominantStrokeWidth) < STYLE_OUTLIER_THRESHOLD) {
        return;
      }

      queueStyleChange(updates, shape, { strokeWidth: dominantStrokeWidth }, 'standardize stroke width');
    });
  }

  const dominantStrokeColor = getDominantValue(
    stylableShapes.map((shape) => shape.style.color.trim().toLowerCase())
  );
  if (dominantStrokeColor) {
    stylableShapes.forEach((shape) => {
      if (shape.style.color.trim().toLowerCase() === dominantStrokeColor) {
        return;
      }

      queueStyleChange(updates, shape, { color: dominantStrokeColor }, 'standardize stroke color');
    });
  }
}

function joinReasons(reasons: string[]): string {
  if (reasons.length === 0) {
    return 'Refresh';
  }

  if (reasons.length === 1) {
    return reasons[0];
  }

  if (reasons.length === 2) {
    return `${reasons[0]} and ${reasons[1]}`;
  }

  return `${reasons.slice(0, -1).join(', ')}, and ${reasons[reasons.length - 1]}`;
}

function buildDeleteAction(shape: AgentShapeSummary): AgentDeleteShapeAction {
  return {
    type: 'delete-shape',
    targetId: shape.id,
    description: `Delete the empty text block "${getShapeLabel(shape)}".`,
  };
}

function buildUpdateAction(pending: PendingCleanupUpdate): AgentUpdateShapeAction {
  return {
    type: 'update-shape',
    targetId: pending.target.id,
    description: `${joinReasons(pending.reasons)} for "${getShapeLabel(pending.target)}".`,
    changes: {
      ...(Object.keys(pending.bounds).length > 0 ? { bounds: pending.bounds } : {}),
      ...(Object.keys(pending.style).length > 0 ? { style: pending.style } : {}),
    },
  };
}

export class CleanupSuggestionsProvider implements AgentProvider {
  public readonly id = 'cleanup-suggestions-provider';
  public readonly workflow = 'cleanup' as const;

  public async generate(request: AgentRequest): Promise<AgentMutationProposal> {
    const updates = new Map<string, PendingCleanupUpdate>();
    const scopedShapes = request.context.shapes.filter(isOrganizableShape);
    const blankTextShapes = request.context.textShapes.filter((shape) => !shape.text?.trim());

    maybeQueueAlignmentSuggestions(scopedShapes, updates);
    maybeQueueSpacingSuggestions(scopedShapes, updates);
    maybeQueueStyleSuggestions(scopedShapes, updates);

    const updateActionsById = new Map<string, AgentUpdateShapeAction>(
      Array.from(updates.values(), (pending) => [pending.target.id, buildUpdateAction(pending)])
    );

    const orderedActions: Array<AgentUpdateShapeAction | AgentDeleteShapeAction> = request.context.shapes.flatMap(
      (shape): Array<AgentUpdateShapeAction | AgentDeleteShapeAction> => {
        if (blankTextShapes.some((textShape) => textShape.id === shape.id)) {
          return [buildDeleteAction(shape)];
        }

        const updateAction = updateActionsById.get(shape.id);
        return updateAction ? [updateAction] : [];
      }
    );

    const scopeLabel = getScopeLabel(request.context.scope);
    const deletionCount = orderedActions.filter((action) => action.type === 'delete-shape').length;
    const summary =
      orderedActions.length === 0
        ? `No obvious low-risk cleanup suggestions found in the ${scopeLabel}.`
        : `Prepared ${orderedActions.length} cleanup suggestion${orderedActions.length === 1 ? '' : 's'} for the ${scopeLabel}${deletionCount > 0 ? `, including ${deletionCount} deletion${deletionCount === 1 ? '' : 's'} to confirm` : ''}.`;

    return {
      kind: 'mutation',
      workflow: 'cleanup',
      summary,
      actions: orderedActions,
    };
  }
}
