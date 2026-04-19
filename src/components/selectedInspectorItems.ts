import type { Shape } from '../types';

export interface SelectedInspectorItem {
  id: string;
  typeLabel: string;
  layerIndex: number;
  hierarchyLabel: string;
}

const SHAPE_TYPE_LABELS: Record<Shape['type'], string> = {
  rectangle: 'Rectangle',
  circle: 'Circle',
  line: 'Line',
  arrow: 'Arrow',
  pencil: 'Pencil',
  image: 'Image',
  audio: 'Audio',
  text: 'Text',
  embed: 'Embed',
  group: 'Group',
};

function getHierarchyLabel(shape: Shape, shapesById: Map<string, Shape>): string {
  const ancestors: string[] = [];
  let currentParentId = shape.parentId;

  while (currentParentId) {
    const parent = shapesById.get(currentParentId);
    if (!parent || parent.type !== 'group') {
      break;
    }

    ancestors.unshift('Group');
    currentParentId = parent.parentId;
  }

  if (ancestors.length > 0) {
    return ancestors.join(' > ');
  }

  return shape.type === 'group' ? 'Top level' : 'Ungrouped';
}

export function buildSelectedInspectorItems(
  selectedIds: string[],
  shapes: Shape[]
): SelectedInspectorItem[] {
  const shapesById = new Map(shapes.map((shape) => [shape.id, shape]));
  const layerIndexById = new Map(shapes.map((shape, index) => [shape.id, index]));
  const uniqueSelectedIds = Array.from(new Set(selectedIds));

  return uniqueSelectedIds
    .map((id) => {
      const shape = shapesById.get(id);
      const layerIndex = layerIndexById.get(id);

      if (!shape) {
        return null;
      }

      return {
        id: shape.id,
        typeLabel: SHAPE_TYPE_LABELS[shape.type],
        layerIndex: layerIndex ?? -1,
        hierarchyLabel: getHierarchyLabel(shape, shapesById),
      };
    })
    .filter((item): item is SelectedInspectorItem => item !== null && item.layerIndex >= 0)
    .sort((left, right) => left.layerIndex - right.layerIndex);
}
