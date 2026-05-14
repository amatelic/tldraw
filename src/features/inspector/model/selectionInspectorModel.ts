import type { Bounds, Shape, ShapeStyle } from '../../../types';
import { getSelectionBounds } from '../../../types/selection';
import { getTextShapeTypography, normalizeShapeStyle } from '../../../document/textStyle';
import {
  buildSelectedInspectorItems,
  type SelectedInspectorItem,
} from './selectedInspectorItems';

export type InspectorMode = 'defaults' | 'single' | 'multi';

export interface SelectionInspectorModel {
  mode: InspectorMode;
  style: ShapeStyle;
  mixedStyleKeys: Array<keyof ShapeStyle>;
  selectedItems: SelectedInspectorItem[];
  selectedShapes: Shape[];
  selectedCount: number;
  selectedLayoutBounds: Bounds | null;
  hasTextSelection: boolean;
  singleSelectedShape: Shape | null;
  canGroup: boolean;
  canUngroup: boolean;
}

interface SelectionInspectorModelOptions {
  defaultStyle: ShapeStyle;
  selectedIds: string[];
  shapes: Shape[];
}

const STYLE_KEYS: Array<keyof ShapeStyle> = [
  'color',
  'fillColor',
  'fillGradient',
  'strokeWidth',
  'strokeStyle',
  'fillStyle',
  'opacity',
  'blendMode',
  'shadows',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'textAlign',
];

function isStyleValueEqual(left: ShapeStyle[keyof ShapeStyle], right: ShapeStyle[keyof ShapeStyle]): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  if (typeof left === 'object' && left !== null && typeof right === 'object' && right !== null) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  return left === right;
}

function getInspectorStyleForShape(shape: Shape): ShapeStyle {
  const style = normalizeShapeStyle(shape.style);

  if (shape.type !== 'text') {
    return style;
  }

  return {
    ...style,
    ...getTextShapeTypography(shape),
  };
}

function getSharedStyle(
  selectedShapes: Shape[],
  defaultStyle: ShapeStyle
): Pick<SelectionInspectorModel, 'style' | 'mixedStyleKeys'> {
  if (selectedShapes.length === 0) {
    return {
      style: normalizeShapeStyle(defaultStyle),
      mixedStyleKeys: [],
    };
  }

  const selectedStyles = selectedShapes.map(getInspectorStyleForShape);
  const nextStyle = normalizeShapeStyle(defaultStyle);
  const mixedStyleKeys: Array<keyof ShapeStyle> = [];

  for (const key of STYLE_KEYS) {
    const firstValue = selectedStyles[0][key];
    const allShared = selectedStyles.every((style) => isStyleValueEqual(style[key], firstValue));

    if (allShared) {
      Object.assign(nextStyle, { [key]: firstValue });
    } else {
      mixedStyleKeys.push(key);
    }
  }

  return {
    style: nextStyle,
    mixedStyleKeys,
  };
}

export function buildSelectionInspectorModel({
  defaultStyle,
  selectedIds,
  shapes,
}: SelectionInspectorModelOptions): SelectionInspectorModel {
  const selectedShapes = shapes.filter((shape) => selectedIds.includes(shape.id));
  const selectedCount = selectedIds.length;
  const singleSelectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
  const mode: InspectorMode =
    selectedCount === 0 ? 'defaults' : selectedCount === 1 ? 'single' : 'multi';
  const { style, mixedStyleKeys } = getSharedStyle(
    selectedShapes,
    normalizeShapeStyle(defaultStyle)
  );

  return {
    mode,
    style,
    mixedStyleKeys,
    selectedItems: buildSelectedInspectorItems(selectedIds, shapes),
    selectedShapes,
    selectedCount,
    selectedLayoutBounds: getSelectionBounds(selectedIds, shapes),
    hasTextSelection: selectedShapes.some((shape) => shape.type === 'text'),
    singleSelectedShape,
    canGroup: selectedCount >= 2,
    canUngroup: selectedCount === 1 && singleSelectedShape?.type === 'group',
  };
}
