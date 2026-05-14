import type { KeyboardEvent, MutableRefObject, ReactNode } from 'react';
import type { Bounds, ShapeStyle } from '../../types';
import type { SelectedInspectorItem } from '../../features/inspector/model/selectedInspectorItems';

export interface CollapsibleSectionProps {
  title: string;
  meta?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export type StrokeWidthPickerVariant = 'visual' | 'slider' | 'compact';
export type ColorPickerTarget = 'stroke' | 'fill';
export type LayoutField = keyof Bounds;
export type LayoutDraftValues = Record<LayoutField, string>;

export interface ExpandedInspectorSections {
  selectedItems: boolean;
  layout: boolean;
  style: boolean;
  color: boolean;
  effects: boolean;
  type: boolean;
}

export type ActiveFloatingPicker =
  | { type: 'color'; key: ColorPickerTarget }
  | { type: 'shadow'; key: number };

export type ColorTriggerRefs = MutableRefObject<Record<ColorPickerTarget, HTMLButtonElement | null>>;
export type ShadowTriggerRefs = MutableRefObject<Record<number, HTMLButtonElement | null>>;

export interface LayoutSectionActions {
  onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute?: (axis: 'horizontal' | 'vertical') => void;
  onTidy?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
}

export interface LayoutDraftHandlers {
  onInputChange: (field: LayoutField, nextValue: string) => void;
  onCommitField: (field: LayoutField) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>, field: LayoutField) => void;
}

export type ShapeStyleChangeHandler = (style: Partial<ShapeStyle>) => void;

export interface SelectedItemsSectionData {
  selectedCount: number;
  selectedItems: SelectedInspectorItem[];
}
