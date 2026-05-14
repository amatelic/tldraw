import { useCallback, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BlendMode, ShapeStyle, ShadowStyle } from '../../types';
import { COLORS, FONT_FAMILIES, FONT_SIZES, STROKE_WIDTHS } from '../../types';
import type { InspectorMixedValueState } from '../../features/inspector/model/inspectorMixedValues';
import {
  BLEND_MODE_LABELS,
  formatHex,
  formatPercent,
  getGradientPreview,
  MIXED_SELECT_VALUE,
  STROKE_WIDTH_VARIANTS,
} from './format';
import type {
  CollapsibleSectionProps,
  ColorPickerTarget,
  ColorTriggerRefs,
  LayoutDraftHandlers,
  LayoutDraftValues,
  LayoutSectionActions,
  SelectedItemsSectionData,
  ShadowTriggerRefs,
  ShapeStyleChangeHandler,
  StrokeWidthPickerVariant,
} from './types';

function CollapsibleSection({
  title,
  meta,
  isExpanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const sectionId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className="properties-section">
      <button
        className="section-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={sectionId}
      >
        <span className="section-header-copy">
          <span className="section-title">{title}</span>
          {meta && <span className="section-meta">{meta}</span>}
        </span>
        <svg
          className={`section-chevron ${isExpanded ? 'expanded' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="16"
          height="16"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      {isExpanded && (
        <div className="section-content" id={sectionId}>
          {children}
        </div>
      )}
    </div>
  );
}

interface SelectedItemsSectionProps extends SelectedItemsSectionData {
  isExpanded: boolean;
  onToggle: () => void;
}

export function SelectedItemsSection({
  selectedItems,
  isExpanded,
  onToggle,
}: SelectedItemsSectionProps) {
  return (
    <CollapsibleSection
      title="Selected Items"
      meta={`${selectedItems.length} selected`}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <ul className="selected-items-list" aria-label="Selected items">
        {selectedItems.map((item) => (
          <li key={item.id} className="selected-item-row">
            <div className="selected-item-copy">
              <span className="selected-item-type">{item.typeLabel}</span>
              <span className="selected-item-hierarchy">{item.hierarchyLabel}</span>
            </div>
            <span className="selected-item-layer-badge">L{item.layerIndex}</span>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}

interface LayoutSectionProps extends LayoutSectionActions, LayoutDraftHandlers {
  isExpanded: boolean;
  onToggle: () => void;
  selectedCount: number;
  canEditLayout: boolean;
  displayedLayoutDraft: LayoutDraftValues;
  canGroup: boolean;
  canUngroup: boolean;
}

export function LayoutSection({
  isExpanded,
  onToggle,
  selectedCount,
  canEditLayout,
  displayedLayoutDraft,
  onInputChange,
  onCommitField,
  onInputKeyDown,
  onAlign,
  onDistribute,
  onTidy,
  onGroup,
  onUngroup,
  canGroup,
  canUngroup,
}: LayoutSectionProps) {
  return (
    <CollapsibleSection
      title="Layout"
      meta={selectedCount > 1 ? 'Arrange' : 'Frame'}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="layout-grid">
        {(['x', 'y', 'width', 'height'] as const).map((field) => (
          <div className="layout-field" key={field}>
            <label className="field-label">{field === 'width' ? 'W' : field === 'height' ? 'H' : field.toUpperCase()}</label>
            <input
              type="text"
              className="field-input"
              aria-label={`Layout ${field === 'x' || field === 'y' ? field.toUpperCase() : field[0].toUpperCase() + field.slice(1)}`}
              inputMode="numeric"
              value={displayedLayoutDraft[field]}
              readOnly={!canEditLayout}
              onChange={(event) => onInputChange(field, event.target.value)}
              onBlur={() => onCommitField(field)}
              onKeyDown={(event) => onInputKeyDown(event, field)}
              placeholder="0"
            />
          </div>
        ))}
      </div>

      {selectedCount > 1 && onAlign && (
        <div className="layout-cluster">
          <div className="cluster-heading">
            <span className="cluster-title">Align</span>
            <span className="cluster-caption">Snap the selection to a shared edge.</span>
          </div>
          <div className="alignment-matrix">
            <div className="alignment-row">
              <button className="layout-icon-button" onClick={() => onAlign('left')} title="Align Left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h12M3 12h8M3 18h16" />
                </svg>
              </button>
              <button className="layout-icon-button" onClick={() => onAlign('center')} title="Align Center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6h12M8 12h8M4 18h16" />
                </svg>
              </button>
              <button className="layout-icon-button" onClick={() => onAlign('right')} title="Align Right">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 6h12M11 12h8M5 18h16" />
                </svg>
              </button>
            </div>
            <div className="alignment-anchor" aria-hidden="true">
              A
            </div>
            <div className="alignment-row">
              <button className="layout-icon-button" onClick={() => onAlign('top')} title="Align Top">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 3v12M12 3v8M18 3v16" />
                </svg>
              </button>
              <button className="layout-icon-button" onClick={() => onAlign('middle')} title="Align Middle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6v12M12 8v8M18 4v16" />
                </svg>
              </button>
              <button className="layout-icon-button" onClick={() => onAlign('bottom')} title="Align Bottom">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9v12M12 13v8M18 5v16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCount > 1 && onDistribute && (
        <div className="layout-inline-actions">
          <button className="layout-wide-action" onClick={() => onDistribute('horizontal')} title="Distribute Horizontally">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 8L2 12l2 4M20 8l2 4-2 4M8 12h8" />
            </svg>
            Horizontal
          </button>
          <button className="layout-wide-action" onClick={() => onDistribute('vertical')} title="Distribute Vertically">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 4l4-2 4 2M8 20l4 2 4-2M12 8v8" />
            </svg>
            Vertical
          </button>
        </div>
      )}

      {selectedCount > 1 && onTidy && (
        <div className="layout-inline-actions layout-inline-actions-single">
          <button className="layout-wide-action layout-wide-action-primary" onClick={onTidy} title="Tidy Selection">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z" />
            </svg>
            Tidy selection
          </button>
        </div>
      )}

      {(canGroup || canUngroup) && (
        <div className="layout-inline-actions layout-inline-actions-single">
          {canGroup && onGroup && (
            <button className="layout-wide-action" onClick={onGroup} title="Group Selection">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="6" height="6" />
                <rect x="14" y="4" width="6" height="6" />
                <rect x="9" y="14" width="6" height="6" />
              </svg>
              Group selection
            </button>
          )}
          {canUngroup && onUngroup && (
            <button className="layout-wide-action" onClick={onUngroup} title="Ungroup Selection">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="6" height="6" />
                <rect x="14" y="4" width="6" height="6" />
                <rect x="9" y="14" width="6" height="6" />
                <path d="M10 10l4 4M14 10l-4 4" />
              </svg>
              Ungroup
            </button>
          )}
        </div>
      )}
    </CollapsibleSection>
  );
}

interface StyleSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  hasTextSelection?: boolean;
  resolvedStyle: ShapeStyle;
  mixedValues: InspectorMixedValueState;
  selectedStrokeWidthIndex: number;
  onChange: ShapeStyleChangeHandler;
  onStrokeWidthIndexChange: (index: number) => void;
}

export function StyleSection({
  isExpanded,
  onToggle,
  hasTextSelection,
  resolvedStyle,
  mixedValues,
  selectedStrokeWidthIndex,
  onChange,
  onStrokeWidthIndexChange,
}: StyleSectionProps) {
  const [strokeWidthPickerVariant, setStrokeWidthPickerVariant] =
    useState<StrokeWidthPickerVariant>('visual');

  return (
    <CollapsibleSection
      title="Style"
      meta={mixedValues.styleSectionMixed ? 'Mixed values' : BLEND_MODE_LABELS[resolvedStyle.blendMode]}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {hasTextSelection && (
        <div className="style-preview-chip">
          <span className="style-preview-icon">Aa</span>
          <span>No Text Style</span>
        </div>
      )}

      <div className="property-stack">
        <div className="property-row property-row-stacked">
          <div className="property-row-header">
            <span className="property-label">Stroke Weight</span>
            <span className={`property-inline-value${mixedValues.strokeWidthMixed ? ' is-mixed' : ''}`}>
              {mixedValues.strokeWidthMixed ? 'Mixed' : `${resolvedStyle.strokeWidth}px`}
            </span>
          </div>
          <div className="stroke-width-picker">
            <div className="stroke-width-variant-toggle" role="tablist" aria-label="Stroke width picker style">
              {STROKE_WIDTH_VARIANTS.map((variant) => (
                <button
                  key={variant.value}
                  type="button"
                  role="tab"
                  aria-selected={strokeWidthPickerVariant === variant.value}
                  className={`stroke-width-variant-button ${strokeWidthPickerVariant === variant.value ? 'active' : ''}`}
                  onClick={() => setStrokeWidthPickerVariant(variant.value)}
                >
                  {variant.label}
                </button>
              ))}
            </div>

            {strokeWidthPickerVariant === 'visual' && (
              <div className="stroke-width-rail" role="radiogroup" aria-label="Stroke width">
                {STROKE_WIDTHS.map((width) => (
                  <button
                    key={width}
                    type="button"
                    role="radio"
                    aria-checked={!mixedValues.strokeWidthMixed && resolvedStyle.strokeWidth === width}
                    className={`stroke-width-rail-option ${!mixedValues.strokeWidthMixed && resolvedStyle.strokeWidth === width ? 'active' : ''}`}
                    onClick={() => onChange({ strokeWidth: width })}
                    title={`${width}px`}
                  >
                    <div className="stroke-width-rail-preview">
                      <div className="stroke-width-line" style={{ height: width }} />
                    </div>
                    <span>{width}</span>
                  </button>
                ))}
              </div>
            )}

            {strokeWidthPickerVariant === 'slider' && (
              <div className="stroke-width-slider-card">
                <div className="stroke-width-slider-preview">
                  <span className="stroke-width-slider-label">Live preview</span>
                  <div className="stroke-width-slider-preview-line" style={{ height: resolvedStyle.strokeWidth }} />
                </div>
                <input
                  className="stroke-width-slider"
                  type="range"
                  min="0"
                  max={String(STROKE_WIDTHS.length - 1)}
                  step="1"
                  value={selectedStrokeWidthIndex}
                  aria-label="Stroke width slider"
                  aria-valuetext={mixedValues.strokeWidthMixed ? 'Mixed stroke weight' : `${resolvedStyle.strokeWidth}px`}
                  onChange={(event) => onStrokeWidthIndexChange(Number(event.target.value))}
                />
                <div className="stroke-width-slider-stops">
                  {STROKE_WIDTHS.map((width, index) => (
                    <button
                      key={width}
                      type="button"
                      className={`stroke-width-slider-stop ${!mixedValues.strokeWidthMixed && resolvedStyle.strokeWidth === width ? 'active' : ''}`}
                      onClick={() => onStrokeWidthIndexChange(index)}
                    >
                      {width}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {strokeWidthPickerVariant === 'compact' && (
              <div className="stroke-width-chip-row" role="radiogroup" aria-label="Stroke width compact">
                {STROKE_WIDTHS.map((width) => (
                  <button
                    key={width}
                    type="button"
                    role="radio"
                    aria-checked={!mixedValues.strokeWidthMixed && resolvedStyle.strokeWidth === width}
                    className={`stroke-width-chip ${!mixedValues.strokeWidthMixed && resolvedStyle.strokeWidth === width ? 'active' : ''}`}
                    onClick={() => onChange({ strokeWidth: width })}
                  >
                    <div className="stroke-width-chip-preview">
                      <div className="stroke-width-line" style={{ height: width }} />
                    </div>
                    <span>{width}px</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="property-row">
          <div className="property-row-header">
            <span className="property-label">Stroke Pattern</span>
          </div>
          <div className="segmented-control">
            {(['solid', 'dashed', 'dotted'] as const).map((strokeStyle) => (
              <button
                key={strokeStyle}
                className={`segmented-option ${!mixedValues.strokeStyleMixed && resolvedStyle.strokeStyle === strokeStyle ? 'active' : ''}`}
                onClick={() => onChange({ strokeStyle })}
              >
                {strokeStyle}
              </button>
            ))}
          </div>
        </div>

        <div className="property-row">
          <div className="property-row-header">
            <span className="property-label">Fill Mode</span>
          </div>
          <div className="segmented-control">
            {(['none', 'solid', 'pattern'] as const).map((fillStyle) => (
              <button
                key={fillStyle}
                className={`segmented-option ${!mixedValues.fillMixed && resolvedStyle.fillStyle === fillStyle ? 'active' : ''}`}
                onClick={() => onChange({ fillStyle })}
              >
                {fillStyle}
              </button>
            ))}
          </div>
        </div>

        <div className="property-row property-row-split">
          <div className="mini-panel">
            <label className="property-label" htmlFor="blend-mode-select">
              Blend
            </label>
            <select
              id="blend-mode-select"
              className="property-select"
              value={mixedValues.blendModeMixed ? MIXED_SELECT_VALUE : resolvedStyle.blendMode}
              onChange={(event) => onChange({ blendMode: event.target.value as BlendMode })}
            >
              {mixedValues.blendModeMixed && (
                <option value={MIXED_SELECT_VALUE} disabled>
                  Mixed
                </option>
              )}
              {Object.entries(BLEND_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mini-panel">
            <div className="property-row-header">
              <span className="property-label">Opacity</span>
              <span className={`property-inline-value${mixedValues.opacityMixed ? ' is-mixed' : ''}`}>
                {mixedValues.opacityMixed ? 'Mixed' : formatPercent(resolvedStyle.opacity)}
              </span>
            </div>
            <input
              type="range"
              className="opacity-slider"
              min="0"
              max="1"
              step="0.1"
              value={resolvedStyle.opacity}
              aria-valuetext={mixedValues.opacityMixed ? 'Mixed opacity' : formatPercent(resolvedStyle.opacity)}
              onChange={(event) => onChange({ opacity: parseFloat(event.target.value) })}
            />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}

interface TypeSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  resolvedStyle: ShapeStyle;
  mixedValues: InspectorMixedValueState;
  onChange: ShapeStyleChangeHandler;
}

export function TypeSection({
  isExpanded,
  onToggle,
  resolvedStyle,
  mixedValues,
  onChange,
}: TypeSectionProps) {
  return (
    <CollapsibleSection
      title="Type"
      meta={mixedValues.typeSectionMixed ? 'Mixed type' : resolvedStyle.fontFamily}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="property-stack">
        <div className="property-row property-row-split">
          <div className="mini-panel">
            <label className="property-label" htmlFor="font-family-select">
              Typeface
            </label>
            <select
              id="font-family-select"
              className="property-select"
              value={mixedValues.fontFamilyMixed ? MIXED_SELECT_VALUE : resolvedStyle.fontFamily}
              onChange={(event) => onChange({ fontFamily: event.target.value })}
            >
              {mixedValues.fontFamilyMixed && (
                <option value={MIXED_SELECT_VALUE} disabled>
                  Mixed
                </option>
              )}
              {FONT_FAMILIES.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          <div className="mini-panel">
            <label className="property-label" htmlFor="font-size-select">
              Size
            </label>
            <select
              id="font-size-select"
              className="property-select"
              value={mixedValues.fontSizeMixed ? MIXED_SELECT_VALUE : String(resolvedStyle.fontSize)}
              onChange={(event) => onChange({ fontSize: parseInt(event.target.value) })}
            >
              {mixedValues.fontSizeMixed && (
                <option value={MIXED_SELECT_VALUE} disabled>
                  Mixed
                </option>
              )}
              {FONT_SIZES.map((size) => (
                <option key={size} value={String(size)}>
                  {size}px
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="property-row">
          <div className="property-row-header">
            <span className="property-label">Weight</span>
          </div>
          <div className="segmented-control">
            <button
              className={`segmented-option ${!mixedValues.fontWeightMixed && resolvedStyle.fontWeight === 'normal' ? 'active' : ''}`}
              onClick={() => onChange({ fontWeight: 'normal' })}
            >
              Regular
            </button>
            <button
              className={`segmented-option ${!mixedValues.fontWeightMixed && resolvedStyle.fontWeight === 'bold' ? 'active' : ''}`}
              onClick={() => onChange({ fontWeight: 'bold' })}
            >
              Bold
            </button>
          </div>
        </div>

        <div className="property-row">
          <div className="property-row-header">
            <span className="property-label">Emphasis</span>
          </div>
          <div className="segmented-control">
            <button
              className={`segmented-option ${!mixedValues.fontStyleMixed && resolvedStyle.fontStyle === 'normal' ? 'active' : ''}`}
              onClick={() => onChange({ fontStyle: 'normal' })}
            >
              Upright
            </button>
            <button
              className={`segmented-option ${!mixedValues.fontStyleMixed && resolvedStyle.fontStyle === 'italic' ? 'active' : ''}`}
              onClick={() => onChange({ fontStyle: 'italic' })}
            >
              Italic
            </button>
          </div>
        </div>

        <div className="property-row">
          <div className="property-row-header">
            <span className="property-label">Align</span>
          </div>
          <div className="segmented-control">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                className={`segmented-option ${!mixedValues.textAlignMixed && resolvedStyle.textAlign === align ? 'active' : ''}`}
                onClick={() => onChange({ textAlign: align })}
              >
                {align}
              </button>
            ))}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}

interface ColorSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  resolvedStyle: ShapeStyle;
  mixedValues: InspectorMixedValueState;
  activeColorPicker: ColorPickerTarget | null;
  colorTriggerRefs: ColorTriggerRefs;
  onChange: ShapeStyleChangeHandler;
  onTogglePicker: (picker: ColorPickerTarget) => void;
}

export function ColorSection({
  isExpanded,
  onToggle,
  resolvedStyle,
  mixedValues,
  activeColorPicker,
  colorTriggerRefs,
  onChange,
  onTogglePicker,
}: ColorSectionProps) {
  const renderColorGroup = ({
      label,
      picker,
      selectedColor,
      isMixed,
      isNone,
      note,
      previewStyle,
      onSelect,
      onSelectNone,
    }: {
      label: 'Stroke' | 'Fill';
      picker: ColorPickerTarget;
      selectedColor: string;
      isMixed?: boolean;
      isNone?: boolean;
      note?: string;
      previewStyle?: CSSProperties;
      onSelect: (color: string) => void;
      onSelectNone?: () => void;
    }) => (
      <div className="color-group">
        <div className="color-control-card">
          <div className="color-control-copy">
            <span className="property-label">{label}</span>
            <span className="color-value-note">
              {isMixed ? 'Mixed' : isNone ? 'No fill' : note ?? `#${formatHex(selectedColor)}`}
            </span>
          </div>
          <div className="color-control-actions">
            {onSelectNone && (
              <button
                className={`color-toggle-chip ${isNone ? 'active' : ''}`}
                onClick={onSelectNone}
                title={`Disable ${label.toLowerCase()}`}
              >
                None
              </button>
            )}
            <button
              className={`color-preview-button ${activeColorPicker === picker ? 'active' : ''}`}
              style={previewStyle ?? { backgroundColor: isNone ? '#f1eef7' : selectedColor }}
              onClick={() => onTogglePicker(picker)}
              title={`Edit ${label.toLowerCase()} color`}
              ref={(element) => {
                colorTriggerRefs.current[picker] = element;
              }}
            >
              {isNone && <span className="color-preview-slash">/</span>}
            </button>
          </div>
        </div>

        <div className="color-swatch-grid">
          {COLORS.map((color) => (
            <button
              key={`${label}-${color}`}
              className={`color-swatch ${!isNone && !isMixed && selectedColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onSelect(color)}
              title={`${label} ${color}`}
            />
          ))}
          <button
            className={`color-swatch color-swatch-custom ${activeColorPicker === picker ? 'active' : ''}`}
            onClick={() => onTogglePicker(picker)}
            title={`Custom ${label.toLowerCase()} color`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4l3 2" />
            </svg>
          </button>
        </div>
      </div>
    );

  const fillPreviewStyle: CSSProperties =
    resolvedStyle.fillStyle === 'none'
      ? { backgroundColor: '#f1eef7' }
      : resolvedStyle.fillGradient
        ? { background: getGradientPreview(resolvedStyle.fillGradient) }
        : { backgroundColor: resolvedStyle.fillColor };
  const fillNote =
    resolvedStyle.fillStyle === 'none'
      ? 'No fill'
      : resolvedStyle.fillGradient
        ? resolvedStyle.fillGradient.type === 'linear'
          ? 'Linear gradient'
          : 'Rounded gradient'
        : `#${formatHex(resolvedStyle.fillColor)}`;

  return (
    <CollapsibleSection
      title="Color"
      meta={mixedValues.strokeColorMixed || mixedValues.fillMixed ? 'Mixed colors' : `#${formatHex(resolvedStyle.color)}`}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="property-stack">
        {renderColorGroup({
          label: 'Stroke',
          picker: 'stroke',
          selectedColor: resolvedStyle.color,
          isMixed: mixedValues.strokeColorMixed,
          previewStyle: mixedValues.strokeColorMixed
            ? {
                background:
                  'linear-gradient(135deg, rgba(91, 101, 245, 0.16), rgba(255, 255, 255, 0.92) 48%, rgba(217, 83, 112, 0.16))',
              }
            : undefined,
          onSelect: (color) => onChange({ color }),
        })}

        {renderColorGroup({
          label: 'Fill',
          picker: 'fill',
          selectedColor: resolvedStyle.fillColor,
          isMixed: mixedValues.fillMixed,
          isNone: resolvedStyle.fillStyle === 'none',
          note: fillNote,
          previewStyle: mixedValues.fillMixed
            ? {
                background:
                  'linear-gradient(135deg, rgba(91, 101, 245, 0.16), rgba(255, 255, 255, 0.92) 48%, rgba(217, 83, 112, 0.16))',
              }
            : fillPreviewStyle,
          onSelect: (color) => onChange({ fillColor: color, fillStyle: 'solid', fillGradient: null }),
          onSelectNone: () => onChange({ fillStyle: 'none' }),
        })}
      </div>
    </CollapsibleSection>
  );
}

interface EffectsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  resolvedStyle: ShapeStyle;
  shadowMixed: boolean;
  activeShadowColorPicker: number | null;
  shadowTriggerRefs: ShadowTriggerRefs;
  onChange: ShapeStyleChangeHandler;
  onToggleShadowPicker: (index: number) => void;
  onCloseShadowPicker: () => void;
}

export function EffectsSection({
  isExpanded,
  onToggle,
  resolvedStyle,
  shadowMixed,
  activeShadowColorPicker,
  shadowTriggerRefs,
  onChange,
  onToggleShadowPicker,
  onCloseShadowPicker,
}: EffectsSectionProps) {
  const handleAddShadow = useCallback(() => {
    const newShadow: ShadowStyle = {
      x: 0,
      y: 4,
      blur: 8,
      color: '#000000',
      opacity: 0.2,
    };
    onChange({ shadows: [...resolvedStyle.shadows, newShadow] });
  }, [resolvedStyle.shadows, onChange]);

  const handleUpdateShadow = useCallback(
    (index: number, updates: Partial<ShadowStyle>) => {
      const updatedShadows = resolvedStyle.shadows.map((shadow, i) =>
        i === index ? { ...shadow, ...updates } : shadow
      );
      onChange({ shadows: updatedShadows });
    },
    [resolvedStyle.shadows, onChange]
  );

  const handleDeleteShadow = useCallback(
    (index: number) => {
      const updatedShadows = resolvedStyle.shadows.filter((_, i) => i !== index);
      onChange({ shadows: updatedShadows });
      if (activeShadowColorPicker === index) {
        onCloseShadowPicker();
      }
    },
    [activeShadowColorPicker, onChange, onCloseShadowPicker, resolvedStyle.shadows]
  );

  return (
    <CollapsibleSection
      title="Effects"
      meta={
        shadowMixed
          ? 'Mixed shadows'
          : resolvedStyle.shadows.length > 0
            ? `${resolvedStyle.shadows.length} shadow`
            : 'Add depth'
      }
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="property-stack">
        <div className="shadows-list">
          {resolvedStyle.shadows.length === 0 && (
            <p className="shadow-empty-message">
              No shadows yet. Add one to give the selection more depth.
            </p>
          )}
          {resolvedStyle.shadows.map((shadow, index) => (
            <div key={index} className="shadow-item">
              <div className="shadow-item-header">
                <div>
                  <span className="shadow-title">Shadow {index + 1}</span>
                  <span className="shadow-subtitle">{formatPercent(shadow.opacity)} opacity</span>
                </div>
                <div className="shadow-item-actions">
                  <button
                    className="shadow-color-button"
                    style={{ backgroundColor: shadow.color }}
                    ref={(element) => {
                      shadowTriggerRefs.current[index] = element;
                    }}
                    onClick={() => onToggleShadowPicker(index)}
                    title="Shadow Color"
                  />
                  <button
                    className="shadow-delete-button"
                    onClick={() => handleDeleteShadow(index)}
                    title="Delete Shadow"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="shadow-grid">
                <div className="shadow-input-group">
                  <label className="shadow-input-label" htmlFor={`shadow-x-${index}`}>
                    X
                  </label>
                  <input
                    id={`shadow-x-${index}`}
                    type="number"
                    className="shadow-input"
                    value={shadow.x}
                    onChange={(event) => handleUpdateShadow(index, { x: parseFloat(event.target.value) || 0 })}
                    step="1"
                  />
                </div>
                <div className="shadow-input-group">
                  <label className="shadow-input-label" htmlFor={`shadow-y-${index}`}>
                    Y
                  </label>
                  <input
                    id={`shadow-y-${index}`}
                    type="number"
                    className="shadow-input"
                    value={shadow.y}
                    onChange={(event) => handleUpdateShadow(index, { y: parseFloat(event.target.value) || 0 })}
                    step="1"
                  />
                </div>
                <div className="shadow-input-group">
                  <label className="shadow-input-label" htmlFor={`shadow-blur-${index}`}>
                    Blur
                  </label>
                  <input
                    id={`shadow-blur-${index}`}
                    type="number"
                    className="shadow-input"
                    value={shadow.blur}
                    onChange={(event) => handleUpdateShadow(index, { blur: parseFloat(event.target.value) || 0 })}
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              <div className="shadow-opacity-row">
                <label className="shadow-input-label">Opacity</label>
                <input
                  type="range"
                  className="shadow-opacity-slider"
                  min="0"
                  max="1"
                  step="0.01"
                  value={shadow.opacity}
                  onChange={(event) => handleUpdateShadow(index, { opacity: parseFloat(event.target.value) })}
                />
                <span className="shadow-opacity-value">{formatPercent(shadow.opacity)}</span>
              </div>
            </div>
          ))}
        </div>
        <button className="add-shadow-button" onClick={handleAddShadow}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Shadow
        </button>
      </div>
    </CollapsibleSection>
  );
}
