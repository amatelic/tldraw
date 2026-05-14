import { useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Bounds, FillGradient, ShapeStyle } from '../types';
import { DEFAULT_STYLE, STROKE_WIDTHS } from '../types';
import type { SelectedInspectorItem } from '../features/inspector/model/selectedInspectorItems';
import { buildInspectorMixedValueState } from '../features/inspector/model/inspectorMixedValues';
import { ColorPicker } from './ColorPicker';
import {
  ColorSection,
  EffectsSection,
  LayoutSection,
  SelectedItemsSection,
  StyleSection,
  TypeSection,
} from './properties-panel/PropertiesPanelSections';
import { buildLayoutDraft, formatMeasurement } from './properties-panel/format';
import { getFillGradientChange, getShadowColorChange } from './properties-panel/styleUpdates';
import { useFloatingColorPicker } from './properties-panel/useFloatingColorPicker';
import type {
  ActiveFloatingPicker,
  ColorPickerTarget,
  ExpandedInspectorSections,
  LayoutField,
  LayoutDraftValues,
} from './properties-panel/types';
import './PropertiesPanel.css';

interface PropertiesPanelProps {
  style: ShapeStyle;
  onChange: (style: Partial<ShapeStyle>) => void;
  mixedStyleKeys?: Array<keyof ShapeStyle>;
  layoutBounds?: Bounds | null;
  onLayoutBoundsChange?: (bounds: Partial<Bounds>) => void;
  hasTextSelection?: boolean;
  onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute?: (axis: 'horizontal' | 'vertical') => void;
  onTidy?: () => void;
  selectedCount?: number;
  selectedItems?: SelectedInspectorItem[];
  onGroup?: () => void;
  onUngroup?: () => void;
  canGroup?: boolean;
  canUngroup?: boolean;
}

export function PropertiesPanel({
  style,
  onChange,
  mixedStyleKeys = [],
  layoutBounds,
  onLayoutBoundsChange,
  hasTextSelection,
  onAlign,
  onDistribute,
  onTidy,
  selectedCount = 0,
  selectedItems = [],
  onGroup,
  onUngroup,
  canGroup = false,
  canUngroup = false,
}: PropertiesPanelProps) {
  const [expandedSections, setExpandedSections] = useState<ExpandedInspectorSections>({
    selectedItems: true,
    layout: true,
    style: true,
    color: true,
    effects: false,
    type: Boolean(hasTextSelection),
  });
  const [activeColorPicker, setActiveColorPicker] = useState<ColorPickerTarget | null>(null);
  const [activeShadowColorPicker, setActiveShadowColorPicker] = useState<number | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<{
    sourceKey: string;
    values: LayoutDraftValues;
  }>({
    sourceKey: '',
    values: buildLayoutDraft(),
  });
  const colorTriggerRefs = useRef<Record<ColorPickerTarget, HTMLButtonElement | null>>({
    stroke: null,
    fill: null,
  });
  const shadowTriggerRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const resolvedStyle: ShapeStyle = {
    ...DEFAULT_STYLE,
    ...style,
    fillGradient: style.fillGradient ?? DEFAULT_STYLE.fillGradient,
    shadows: style.shadows ?? DEFAULT_STYLE.shadows,
  };
  const mixedValues = useMemo(
    () => buildInspectorMixedValueState(selectedCount, mixedStyleKeys),
    [mixedStyleKeys, selectedCount]
  );
  const hasSelectedItemsSection = selectedCount > 1 && selectedItems.length > 0;
  const canEditLayout = Boolean(layoutBounds && onLayoutBoundsChange && selectedCount === 1);
  const layoutSourceKey = `${layoutBounds?.x ?? ''}:${layoutBounds?.y ?? ''}:${layoutBounds?.width ?? ''}:${layoutBounds?.height ?? ''}`;
  const displayedLayoutDraft =
    layoutDraft.sourceKey === layoutSourceKey ? layoutDraft.values : buildLayoutDraft(layoutBounds);
  const selectedStrokeWidthIndex = Math.max(
    0,
    STROKE_WIDTHS.findIndex((width) => width === resolvedStyle.strokeWidth)
  );
  const activeFloatingPicker = useMemo<ActiveFloatingPicker | null>(
    () =>
      activeColorPicker !== null
        ? { type: 'color', key: activeColorPicker }
        : activeShadowColorPicker !== null
          ? { type: 'shadow', key: activeShadowColorPicker }
          : null,
    [activeColorPicker, activeShadowColorPicker]
  );

  const closeFloatingPicker = useCallback(() => {
    setActiveColorPicker(null);
    setActiveShadowColorPicker(null);
  }, []);

  const getAnchorElement = useCallback((): HTMLButtonElement | null => {
    if (!activeFloatingPicker) {
      return null;
    }

    if (activeFloatingPicker.type === 'color') {
      return colorTriggerRefs.current[activeFloatingPicker.key];
    }

    return shadowTriggerRefs.current[activeFloatingPicker.key] ?? null;
  }, [activeFloatingPicker]);

  const { floatingPickerPortalHost, floatingPickerPosition } = useFloatingColorPicker({
    activeFloatingPicker,
    getAnchorElement,
    onClose: closeFloatingPicker,
  });

  const toggleSection = useCallback((section: keyof ExpandedInspectorSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const updateStrokeWidthFromIndex = useCallback(
    (index: number) => {
      const width = STROKE_WIDTHS[Math.max(0, Math.min(STROKE_WIDTHS.length - 1, index))];
      onChange({ strokeWidth: width });
    },
    [onChange]
  );

  const commitLayoutField = useCallback(
    (field: LayoutField) => {
      if (!layoutBounds || !onLayoutBoundsChange || selectedCount !== 1) {
        return;
      }

      const draftValue = displayedLayoutDraft[field];
      const parsedValue = Number(draftValue);

      if (!draftValue.trim() || Number.isNaN(parsedValue)) {
        setLayoutDraft((currentDraft) => ({
          sourceKey: layoutSourceKey,
          values: {
            ...currentDraft.values,
            [field]: formatMeasurement(layoutBounds[field]),
          },
        }));
        return;
      }

      if (Math.round(layoutBounds[field]) === parsedValue) {
        setLayoutDraft((currentDraft) => ({
          sourceKey: layoutSourceKey,
          values: {
            ...currentDraft.values,
            [field]: formatMeasurement(layoutBounds[field]),
          },
        }));
        return;
      }

      onLayoutBoundsChange({ [field]: parsedValue });
    },
    [displayedLayoutDraft, layoutBounds, layoutSourceKey, onLayoutBoundsChange, selectedCount]
  );

  const handleLayoutInputChange = useCallback(
    (field: LayoutField, nextValue: string) => {
      if (!canEditLayout) {
        return;
      }

      setLayoutDraft((currentDraft) => ({
        sourceKey: layoutSourceKey,
        values: {
          ...(currentDraft.sourceKey === layoutSourceKey ? currentDraft.values : buildLayoutDraft(layoutBounds)),
          [field]: nextValue,
        },
      }));
    },
    [canEditLayout, layoutBounds, layoutSourceKey]
  );

  const handleLayoutInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, field: LayoutField) => {
      if (!canEditLayout) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        commitLayoutField(field);
        event.currentTarget.blur();
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setLayoutDraft((currentDraft) => ({
          sourceKey: layoutSourceKey,
          values: {
            ...(currentDraft.sourceKey === layoutSourceKey ? currentDraft.values : buildLayoutDraft(layoutBounds)),
            [field]: formatMeasurement(layoutBounds?.[field]),
          },
        }));
        event.currentTarget.blur();
      }
    },
    [canEditLayout, commitLayoutField, layoutBounds, layoutSourceKey]
  );

  const handleStrokeColorChange = useCallback(
    (color: string) => {
      onChange({ color });
    },
    [onChange]
  );

  const handleFillColorChange = useCallback(
    (color: string) => {
      onChange({ fillColor: color, fillStyle: 'solid', fillGradient: null });
    },
    [onChange]
  );

  const handleColorPickerToggle = useCallback(
    (picker: ColorPickerTarget) => {
      setActiveColorPicker(activeColorPicker === picker ? null : picker);
    },
    [activeColorPicker]
  );

  const handleShadowPickerToggle = useCallback(
    (index: number) => {
      setActiveShadowColorPicker(activeShadowColorPicker === index ? null : index);
    },
    [activeShadowColorPicker]
  );

  const activeColorPickerConfig =
    activeColorPicker === 'stroke'
      ? {
          type: 'stroke' as const,
          color: resolvedStyle.color,
          onChange: handleStrokeColorChange,
        }
      : activeColorPicker === 'fill'
        ? {
            type: 'fill' as const,
            color: resolvedStyle.fillColor,
            onChange: handleFillColorChange,
            gradientValue: resolvedStyle.fillGradient ?? null,
            onGradientChange: (gradient: FillGradient | null) =>
              onChange(getFillGradientChange(gradient, resolvedStyle.fillColor)),
          }
        : null;
  const activeShadowPickerConfig =
    activeShadowColorPicker !== null ? resolvedStyle.shadows[activeShadowColorPicker] : null;
  const floatingPickerPortalTarget = floatingPickerPortalHost ?? document.body;
  const floatingColorPicker = activeColorPickerConfig
    ? createPortal(
        <div className="floating-color-picker-layer" style={floatingPickerPosition}>
          <ColorPicker
            color={activeColorPickerConfig.color}
            alpha={1}
            onChange={activeColorPickerConfig.onChange}
            onClose={() => setActiveColorPicker(null)}
            showAlpha={false}
            allowGradient={activeColorPickerConfig.type === 'fill'}
            gradientValue={activeColorPickerConfig.type === 'fill' ? activeColorPickerConfig.gradientValue : null}
            onGradientChange={
              activeColorPickerConfig.type === 'fill' ? activeColorPickerConfig.onGradientChange : undefined
            }
          />
        </div>,
        floatingPickerPortalTarget
      )
    : activeShadowPickerConfig
      ? createPortal(
          <div className="floating-color-picker-layer" style={floatingPickerPosition}>
            <ColorPicker
              color={activeShadowPickerConfig.color}
              alpha={activeShadowPickerConfig.opacity}
              onChange={(color, alpha) => {
                if (activeShadowColorPicker === null) return;
                onChange({
                  shadows: getShadowColorChange(
                    resolvedStyle.shadows,
                    activeShadowColorPicker,
                    color,
                    alpha
                  ),
                });
              }}
              onClose={() => setActiveShadowColorPicker(null)}
              showAlpha={true}
            />
          </div>,
          floatingPickerPortalTarget
        )
      : null;

  return (
    <>
      <div className="properties-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Selection</p>
            <h3 className="panel-title">Inspector</h3>
          </div>
          <div className="panel-badge">
            {selectedCount} {selectedCount === 1 ? 'layer' : 'layers'}
          </div>
        </div>

        {mixedValues.hasMixedValues && (
          <div className="panel-mixed-banner" role="status">
            Some properties differ across this selection. Controls marked as mixed become concrete only
            when you choose a new value.
          </div>
        )}

        {hasSelectedItemsSection && (
          <SelectedItemsSection
            selectedCount={selectedCount}
            selectedItems={selectedItems}
            isExpanded={expandedSections.selectedItems}
            onToggle={() => toggleSection('selectedItems')}
          />
        )}

        <LayoutSection
          isExpanded={expandedSections.layout}
          onToggle={() => toggleSection('layout')}
          selectedCount={selectedCount}
          canEditLayout={canEditLayout}
          displayedLayoutDraft={displayedLayoutDraft}
          onInputChange={handleLayoutInputChange}
          onCommitField={commitLayoutField}
          onInputKeyDown={handleLayoutInputKeyDown}
          onAlign={onAlign}
          onDistribute={onDistribute}
          onTidy={onTidy}
          onGroup={onGroup}
          onUngroup={onUngroup}
          canGroup={canGroup}
          canUngroup={canUngroup}
        />

        <StyleSection
          isExpanded={expandedSections.style}
          onToggle={() => toggleSection('style')}
          hasTextSelection={hasTextSelection}
          resolvedStyle={resolvedStyle}
          mixedValues={mixedValues}
          selectedStrokeWidthIndex={selectedStrokeWidthIndex}
          onChange={onChange}
          onStrokeWidthIndexChange={updateStrokeWidthFromIndex}
        />

        {hasTextSelection && (
          <TypeSection
            isExpanded={expandedSections.type}
            onToggle={() => toggleSection('type')}
            resolvedStyle={resolvedStyle}
            mixedValues={mixedValues}
            onChange={onChange}
          />
        )}

        <ColorSection
          isExpanded={expandedSections.color}
          onToggle={() => toggleSection('color')}
          resolvedStyle={resolvedStyle}
          mixedValues={mixedValues}
          activeColorPicker={activeColorPicker}
          colorTriggerRefs={colorTriggerRefs}
          onChange={onChange}
          onTogglePicker={handleColorPickerToggle}
        />

        <EffectsSection
          isExpanded={expandedSections.effects}
          onToggle={() => toggleSection('effects')}
          resolvedStyle={resolvedStyle}
          shadowMixed={mixedValues.shadowMixed}
          activeShadowColorPicker={activeShadowColorPicker}
          shadowTriggerRefs={shadowTriggerRefs}
          onChange={onChange}
          onToggleShadowPicker={handleShadowPickerToggle}
          onCloseShadowPicker={() => setActiveShadowColorPicker(null)}
        />
      </div>
      {floatingColorPicker}
    </>
  );
}
