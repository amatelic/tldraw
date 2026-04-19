import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { BlendMode, Bounds, FillGradient, ShapeStyle, ShadowStyle } from '../types';
import { COLORS, STROKE_WIDTHS, FONT_SIZES, FONT_FAMILIES, DEFAULT_STYLE } from '../types';
import { ColorPicker } from './ColorPicker';
import type { SelectedInspectorItem } from './selectedInspectorItems';
import './PropertiesPanel.css';

interface PropertiesPanelProps {
  style: ShapeStyle;
  onChange: (style: Partial<ShapeStyle>) => void;
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

interface CollapsibleSectionProps {
  title: string;
  meta?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

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

const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  'source-over': 'Normal',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  darken: 'Darken',
  lighten: 'Lighten',
  'color-dodge': 'Color Dodge',
  'color-burn': 'Color Burn',
  'hard-light': 'Hard Light',
  'soft-light': 'Soft Light',
  difference: 'Difference',
  exclusion: 'Exclusion',
  hue: 'Hue',
  saturation: 'Saturation',
  color: 'Color',
  luminosity: 'Luminosity',
};

function formatHex(color: string): string {
  return color.replace('#', '').toUpperCase();
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatMeasurement(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }

  return `${Math.round(value)}`;
}

const FLOATING_PICKER_WIDTH = 430;
const FLOATING_PICKER_GAP = 18;
const FLOATING_PICKER_MARGIN = 16;
type StrokeWidthPickerVariant = 'visual' | 'slider' | 'compact';
type ColorPickerTarget = 'stroke' | 'fill';
type LayoutField = keyof Bounds;
type LayoutDraftValues = Record<LayoutField, string>;

function getFloatingPickerPortalHost(anchorElement: HTMLElement | null): HTMLElement | null {
  return anchorElement?.closest<HTMLElement>('.app') ?? null;
}

function buildLayoutDraft(layoutBounds?: Bounds | null): LayoutDraftValues {
  return {
    x: formatMeasurement(layoutBounds?.x),
    y: formatMeasurement(layoutBounds?.y),
    width: formatMeasurement(layoutBounds?.width),
    height: formatMeasurement(layoutBounds?.height),
  };
}

function getGradientPreview(fillGradient: FillGradient): string {
  return fillGradient.type === 'linear'
    ? `linear-gradient(${fillGradient.angle}deg, ${fillGradient.startColor}, ${fillGradient.endColor})`
    : `radial-gradient(circle at center, ${fillGradient.startColor}, ${fillGradient.endColor})`;
}

const STROKE_WIDTH_VARIANTS: Array<{
  value: StrokeWidthPickerVariant;
  label: string;
}> = [
  { value: 'visual', label: 'Visual' },
  { value: 'slider', label: 'Slider' },
  { value: 'compact', label: 'Compact' },
];

export function PropertiesPanel({
  style,
  onChange,
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
  const [expandedSections, setExpandedSections] = useState<{
    selectedItems: boolean;
    layout: boolean;
    style: boolean;
    color: boolean;
    effects: boolean;
    type: boolean;
  }>({
    selectedItems: true,
    layout: true,
    style: true,
    color: true,
    effects: false,
    type: Boolean(hasTextSelection),
  });

  const [activeColorPicker, setActiveColorPicker] = useState<ColorPickerTarget | null>(null);
  const [activeShadowColorPicker, setActiveShadowColorPicker] = useState<number | null>(null);
  const [floatingPickerStyle, setFloatingPickerStyle] = useState<{ top: number; left: number } | null>(
    null
  );
  const [floatingPickerPortalHost, setFloatingPickerPortalHost] = useState<HTMLElement | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<{
    sourceKey: string;
    values: LayoutDraftValues;
  }>({
    sourceKey: '',
    values: buildLayoutDraft(),
  });
  const [strokeWidthPickerVariant, setStrokeWidthPickerVariant] =
    useState<StrokeWidthPickerVariant>('visual');
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

  const activeFloatingPicker = useMemo(
    () =>
      activeColorPicker !== null
        ? { type: 'color' as const, key: activeColorPicker }
        : activeShadowColorPicker !== null
          ? { type: 'shadow' as const, key: activeShadowColorPicker }
          : null,
    [activeColorPicker, activeShadowColorPicker]
  );
  const selectedStrokeWidthIndex = Math.max(
    0,
    STROKE_WIDTHS.findIndex((width) => width === resolvedStyle.strokeWidth)
  );
  const hasSelectedItemsSection = selectedCount > 1 && selectedItems.length > 0;
  const canEditLayout = Boolean(layoutBounds && onLayoutBoundsChange && selectedCount === 1);
  const layoutSourceKey = `${layoutBounds?.x ?? ''}:${layoutBounds?.y ?? ''}:${layoutBounds?.width ?? ''}:${layoutBounds?.height ?? ''}`;
  const displayedLayoutDraft =
    layoutDraft.sourceKey === layoutSourceKey ? layoutDraft.values : buildLayoutDraft(layoutBounds);

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

  const getAnchorElement = useCallback((): HTMLButtonElement | null => {
    if (!activeFloatingPicker) {
      return null;
    }

    if (activeFloatingPicker.type === 'color') {
      return colorTriggerRefs.current[activeFloatingPicker.key];
    }

    return shadowTriggerRefs.current[activeFloatingPicker.key] ?? null;
  }, [activeFloatingPicker]);

  const updateFloatingPickerPosition = useCallback(() => {
    const anchorElement = getAnchorElement();
    if (!anchorElement) {
      setFloatingPickerStyle(null);
      setFloatingPickerPortalHost(null);
      return;
    }

    const rect = anchorElement.getBoundingClientRect();
    const portalHost = getFloatingPickerPortalHost(anchorElement);
    const hostRect = portalHost?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const anchorLeft = rect.left - hostRect.left;
    const anchorRight = rect.right - hostRect.left;
    const anchorTop = rect.top - hostRect.top;
    const anchorHeight = rect.height;
    const availableWidth = hostRect.width;
    const availableHeight = hostRect.height;
    const preferredLeft = anchorLeft - FLOATING_PICKER_WIDTH - FLOATING_PICKER_GAP;
    const fallbackLeft = anchorRight + FLOATING_PICKER_GAP;
    const left =
      preferredLeft >= FLOATING_PICKER_MARGIN
        ? preferredLeft
        : fallbackLeft + FLOATING_PICKER_WIDTH <= availableWidth - FLOATING_PICKER_MARGIN
          ? fallbackLeft
          : Math.max(
              FLOATING_PICKER_MARGIN,
              Math.min(
                anchorLeft + rect.width / 2 - FLOATING_PICKER_WIDTH / 2,
                availableWidth - FLOATING_PICKER_WIDTH - FLOATING_PICKER_MARGIN
              )
            );
    const estimatedHeight = 520;
    const top = Math.max(
      FLOATING_PICKER_MARGIN,
      Math.min(
        anchorTop + anchorHeight / 2 - estimatedHeight / 2,
        availableHeight - estimatedHeight - FLOATING_PICKER_MARGIN
      )
    );

    setFloatingPickerPortalHost(portalHost);
    setFloatingPickerStyle({ top, left });
  }, [getAnchorElement]);

  useEffect(() => {
    if (!activeFloatingPicker) return;

    const anchorElement = getAnchorElement();
    const portalHost = getFloatingPickerPortalHost(anchorElement);
    const handleViewportChange = () => {
      updateFloatingPickerPosition();
    };

    const animationFrameId = requestAnimationFrame(updateFloatingPickerPosition);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            updateFloatingPickerPosition();
          });

    if (resizeObserver) {
      if (anchorElement) {
        resizeObserver.observe(anchorElement);
      }
      if (portalHost) {
        resizeObserver.observe(portalHost);
      }
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      resizeObserver?.disconnect();
    };
  }, [activeFloatingPicker, getAnchorElement, updateFloatingPickerPosition]);

  useEffect(() => {
    if (!activeFloatingPicker) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const anchorElement = getAnchorElement();
      if (anchorElement?.contains(target)) return;

      const pickerLayer = document.querySelector('.floating-color-picker-layer');
      if (pickerLayer?.contains(target)) return;

      setActiveColorPicker(null);
      setActiveShadowColorPicker(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveColorPicker(null);
        setActiveShadowColorPicker(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [activeFloatingPicker, getAnchorElement]);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

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
 
   const handleAddShadow = useCallback(() => {
     const newShadow: ShadowStyle = {
       x: 0,
       y: 4,
       blur: 8,
       color: '#000000',
       opacity: 0.2,
     };
     const updatedShadows = [...resolvedStyle.shadows, newShadow];
     onChange({ shadows: updatedShadows });
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
         setActiveShadowColorPicker(null);
       }
     },
     [resolvedStyle.shadows, onChange, activeShadowColorPicker]
   );
 
   const handleShadowColorChange = useCallback(
     (index: number, color: string) => {
       handleUpdateShadow(index, { color });
     },
     [handleUpdateShadow]
   );

  const renderColorGroup = useCallback(
     ({
      label,
      picker,
      selectedColor,
      isNone,
      note,
      previewStyle,
      onSelect,
      onTogglePicker,
      onSelectNone,
     }: {
       label: 'Stroke' | 'Fill';
       picker: ColorPickerTarget;
       selectedColor: string;
       isNone?: boolean;
       note?: string;
       previewStyle?: CSSProperties;
       onSelect: (color: string) => void;
       onTogglePicker: () => void;
       onSelectNone?: () => void;
     }) => (
       <div className="color-group">
         <div className="color-control-card">
           <div className="color-control-copy">
             <span className="property-label">{label}</span>
             <span className="color-value-note">
               {isNone ? 'No fill' : note ?? `#${formatHex(selectedColor)}`}
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
               onClick={onTogglePicker}
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
               className={`color-swatch ${!isNone && selectedColor === color ? 'active' : ''}`}
               style={{ backgroundColor: color }}
               onClick={() => onSelect(color)}
               title={`${label} ${color}`}
             />
           ))}
           <button
             className={`color-swatch color-swatch-custom ${activeColorPicker === picker ? 'active' : ''}`}
             onClick={onTogglePicker}
             title={`Custom ${label.toLowerCase()} color`}
           >
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               <circle cx="12" cy="12" r="8" />
               <path d="M12 8v4l3 2" />
             </svg>
           </button>
         </div>
       </div>
   ),
   [activeColorPicker]
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

  const activeColorPickerConfig =
    activeColorPicker === 'stroke'
      ? {
          color: resolvedStyle.color,
          onChange: handleStrokeColorChange,
        }
      : activeColorPicker === 'fill'
        ? {
            color: resolvedStyle.fillColor,
            onChange: handleFillColorChange,
            allowGradient: true,
            gradientValue: resolvedStyle.fillGradient ?? null,
            onGradientChange: (gradient: FillGradient | null) =>
              onChange({
                fillStyle: 'solid',
                fillColor: gradient?.startColor ?? resolvedStyle.fillColor,
                fillGradient: gradient,
              }),
          }
        : null;
  const activeShadowPickerConfig =
    activeShadowColorPicker !== null ? resolvedStyle.shadows[activeShadowColorPicker] : null;

  const floatingPickerPortalTarget = floatingPickerPortalHost ?? document.body;
  const floatingPickerPosition: CSSProperties = {
    position: floatingPickerPortalHost ? 'absolute' : 'fixed',
    top: `${floatingPickerStyle?.top ?? FLOATING_PICKER_MARGIN}px`,
    left: `${floatingPickerStyle?.left ?? FLOATING_PICKER_MARGIN}px`,
    width: `${FLOATING_PICKER_WIDTH}px`,
  };

  const floatingColorPicker = activeColorPickerConfig
    ? createPortal(
        <div
          className="floating-color-picker-layer"
          style={floatingPickerPosition}
        >
          <ColorPicker
            color={activeColorPickerConfig.color}
            alpha={1}
            onChange={activeColorPickerConfig.onChange}
            onClose={() => setActiveColorPicker(null)}
            showAlpha={false}
            allowGradient={'allowGradient' in activeColorPickerConfig && activeColorPickerConfig.allowGradient}
            gradientValue={
              'gradientValue' in activeColorPickerConfig
                ? activeColorPickerConfig.gradientValue
                : null
            }
            onGradientChange={
              'onGradientChange' in activeColorPickerConfig
                ? activeColorPickerConfig.onGradientChange
                : undefined
            }
          />
        </div>,
        floatingPickerPortalTarget
      )
    : activeShadowPickerConfig
      ? createPortal(
          <div
            className="floating-color-picker-layer"
            style={floatingPickerPosition}
          >
            <ColorPicker
              color={activeShadowPickerConfig.color}
              alpha={activeShadowPickerConfig.opacity}
              onChange={(color, alpha) => {
                if (activeShadowColorPicker === null) return;
                handleShadowColorChange(activeShadowColorPicker, color);
                handleUpdateShadow(activeShadowColorPicker, { opacity: alpha });
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

      {hasSelectedItemsSection && (
        <CollapsibleSection
          title="Selected Items"
          meta={`${selectedItems.length} selected`}
          isExpanded={expandedSections.selectedItems}
          onToggle={() => toggleSection('selectedItems')}
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
      )}

      <CollapsibleSection
        title="Layout"
        meta={selectedCount > 1 ? 'Arrange' : 'Frame'}
        isExpanded={expandedSections.layout}
        onToggle={() => toggleSection('layout')}
      >
        <div className="layout-grid">
          <div className="layout-field">
            <label className="field-label">X</label>
            <input
              type="text"
              className="field-input"
              aria-label="Layout X"
              inputMode="numeric"
              value={displayedLayoutDraft.x}
              readOnly={!canEditLayout}
              onChange={(event) => handleLayoutInputChange('x', event.target.value)}
              onBlur={() => commitLayoutField('x')}
              onKeyDown={(event) => handleLayoutInputKeyDown(event, 'x')}
              placeholder="0"
            />
          </div>
          <div className="layout-field">
            <label className="field-label">Y</label>
            <input
              type="text"
              className="field-input"
              aria-label="Layout Y"
              inputMode="numeric"
              value={displayedLayoutDraft.y}
              readOnly={!canEditLayout}
              onChange={(event) => handleLayoutInputChange('y', event.target.value)}
              onBlur={() => commitLayoutField('y')}
              onKeyDown={(event) => handleLayoutInputKeyDown(event, 'y')}
              placeholder="0"
            />
          </div>
          <div className="layout-field">
            <label className="field-label">W</label>
            <input
              type="text"
              className="field-input"
              aria-label="Layout Width"
              inputMode="numeric"
              value={displayedLayoutDraft.width}
              readOnly={!canEditLayout}
              onChange={(event) => handleLayoutInputChange('width', event.target.value)}
              onBlur={() => commitLayoutField('width')}
              onKeyDown={(event) => handleLayoutInputKeyDown(event, 'width')}
              placeholder="0"
            />
          </div>
          <div className="layout-field">
            <label className="field-label">H</label>
            <input
              type="text"
              className="field-input"
              aria-label="Layout Height"
              inputMode="numeric"
              value={displayedLayoutDraft.height}
              readOnly={!canEditLayout}
              onChange={(event) => handleLayoutInputChange('height', event.target.value)}
              onBlur={() => commitLayoutField('height')}
              onKeyDown={(event) => handleLayoutInputKeyDown(event, 'height')}
              placeholder="0"
            />
          </div>
        </div>

        {selectedCount > 1 && onAlign && (
          <div className="layout-cluster">
            <div className="cluster-heading">
              <span className="cluster-title">Align</span>
              <span className="cluster-caption">Snap the selection to a shared edge.</span>
            </div>
            <div className="alignment-matrix">
              <div className="alignment-row">
                <button
                  className="layout-icon-button"
                  onClick={() => onAlign('left')}
                  title="Align Left"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h12M3 12h8M3 18h16" />
                  </svg>
                </button>
                <button
                  className="layout-icon-button"
                  onClick={() => onAlign('center')}
                  title="Align Center"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6h12M8 12h8M4 18h16" />
                  </svg>
                </button>
                <button
                  className="layout-icon-button"
                  onClick={() => onAlign('right')}
                  title="Align Right"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 6h12M11 12h8M5 18h16" />
                  </svg>
                </button>
              </div>
              <div className="alignment-anchor" aria-hidden="true">
                A
              </div>
              <div className="alignment-row">
                <button
                  className="layout-icon-button"
                  onClick={() => onAlign('top')}
                  title="Align Top"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 3v12M12 3v8M18 3v16" />
                  </svg>
                </button>
                <button
                  className="layout-icon-button"
                  onClick={() => onAlign('middle')}
                  title="Align Middle"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6v12M12 8v8M18 4v16" />
                  </svg>
                </button>
                <button
                  className="layout-icon-button"
                  onClick={() => onAlign('bottom')}
                  title="Align Bottom"
                >
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
            <button
              className="layout-wide-action"
              onClick={() => onDistribute('horizontal')}
              title="Distribute Horizontally"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 8L2 12l2 4M20 8l2 4-2 4M8 12h8" />
              </svg>
              Horizontal
            </button>
            <button
              className="layout-wide-action"
              onClick={() => onDistribute('vertical')}
              title="Distribute Vertically"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 4l4-2 4 2M8 20l4 2 4-2M12 8v8" />
              </svg>
              Vertical
            </button>
          </div>
        )}

        {selectedCount > 1 && onTidy && (
          <div className="layout-inline-actions layout-inline-actions-single">
            <button
              className="layout-wide-action layout-wide-action-primary"
              onClick={onTidy}
              title="Tidy Selection"
            >
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
              <button
                className="layout-wide-action"
                onClick={onGroup}
                title="Group Selection"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="6" height="6" />
                  <rect x="14" y="4" width="6" height="6" />
                  <rect x="9" y="14" width="6" height="6" />
                </svg>
                Group selection
              </button>
            )}
            {canUngroup && onUngroup && (
              <button
                className="layout-wide-action"
                onClick={onUngroup}
                title="Ungroup Selection"
              >
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

      <CollapsibleSection
        title="Style"
        meta={BLEND_MODE_LABELS[resolvedStyle.blendMode]}
        isExpanded={expandedSections.style}
        onToggle={() => toggleSection('style')}
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
              <span className="property-inline-value">{resolvedStyle.strokeWidth}px</span>
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
                      aria-checked={resolvedStyle.strokeWidth === width}
                      className={`stroke-width-rail-option ${resolvedStyle.strokeWidth === width ? 'active' : ''}`}
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
                    <div
                      className="stroke-width-slider-preview-line"
                      style={{ height: resolvedStyle.strokeWidth }}
                    />
                  </div>
                  <input
                    className="stroke-width-slider"
                    type="range"
                    min="0"
                    max={String(STROKE_WIDTHS.length - 1)}
                    step="1"
                    value={selectedStrokeWidthIndex}
                    aria-label="Stroke width slider"
                    onChange={(event) => updateStrokeWidthFromIndex(Number(event.target.value))}
                  />
                  <div className="stroke-width-slider-stops">
                    {STROKE_WIDTHS.map((width, index) => (
                      <button
                        key={width}
                        type="button"
                        className={`stroke-width-slider-stop ${resolvedStyle.strokeWidth === width ? 'active' : ''}`}
                        onClick={() => updateStrokeWidthFromIndex(index)}
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
                      aria-checked={resolvedStyle.strokeWidth === width}
                      className={`stroke-width-chip ${resolvedStyle.strokeWidth === width ? 'active' : ''}`}
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
                  className={`segmented-option ${resolvedStyle.strokeStyle === strokeStyle ? 'active' : ''}`}
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
                  className={`segmented-option ${resolvedStyle.fillStyle === fillStyle ? 'active' : ''}`}
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
                value={resolvedStyle.blendMode}
                onChange={(e) => onChange({ blendMode: e.target.value as BlendMode })}
              >
                <option value="source-over">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="lighten">Lighten</option>
                <option value="color-dodge">Color Dodge</option>
                <option value="color-burn">Color Burn</option>
                <option value="hard-light">Hard Light</option>
                <option value="soft-light">Soft Light</option>
                <option value="difference">Difference</option>
                <option value="exclusion">Exclusion</option>
                <option value="hue">Hue</option>
                <option value="saturation">Saturation</option>
                <option value="color">Color</option>
                <option value="luminosity">Luminosity</option>
              </select>
            </div>

            <div className="mini-panel">
              <div className="property-row-header">
                <span className="property-label">Opacity</span>
                <span className="property-inline-value">{formatPercent(resolvedStyle.opacity)}</span>
              </div>
              <input
                type="range"
                className="opacity-slider"
                min="0"
                max="1"
                step="0.1"
                value={resolvedStyle.opacity}
                onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {hasTextSelection && (
        <CollapsibleSection
          title="Type"
          meta={resolvedStyle.fontFamily}
          isExpanded={expandedSections.type}
          onToggle={() => toggleSection('type')}
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
                  value={resolvedStyle.fontFamily}
                  onChange={(e) => onChange({ fontFamily: e.target.value })}
                >
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
                  value={resolvedStyle.fontSize}
                  onChange={(e) => onChange({ fontSize: parseInt(e.target.value) })}
                >
                  {FONT_SIZES.map((size) => (
                    <option key={size} value={size}>
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
                  className={`segmented-option ${resolvedStyle.fontWeight === 'normal' ? 'active' : ''}`}
                  onClick={() => onChange({ fontWeight: 'normal' })}
                >
                  Regular
                </button>
                <button
                  className={`segmented-option ${resolvedStyle.fontWeight === 'bold' ? 'active' : ''}`}
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
                  className={`segmented-option ${resolvedStyle.fontStyle === 'normal' ? 'active' : ''}`}
                  onClick={() => onChange({ fontStyle: 'normal' })}
                >
                  Upright
                </button>
                <button
                  className={`segmented-option ${resolvedStyle.fontStyle === 'italic' ? 'active' : ''}`}
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
                    className={`segmented-option ${resolvedStyle.textAlign === align ? 'active' : ''}`}
                    onClick={() => onChange({ textAlign: align })}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Color"
        meta={`#${formatHex(resolvedStyle.color)}`}
        isExpanded={expandedSections.color}
        onToggle={() => toggleSection('color')}
      >
        <div className="property-stack">
          {renderColorGroup({
            label: 'Stroke',
            picker: 'stroke',
            selectedColor: resolvedStyle.color,
            onSelect: (color) => onChange({ color }),
            onTogglePicker: () =>
              setActiveColorPicker(activeColorPicker === 'stroke' ? null : 'stroke'),
          })}

          {renderColorGroup({
            label: 'Fill',
            picker: 'fill',
            selectedColor: resolvedStyle.fillColor,
            isNone: resolvedStyle.fillStyle === 'none',
            note: fillNote,
            previewStyle: fillPreviewStyle,
            onSelect: (color) => onChange({ fillColor: color, fillStyle: 'solid', fillGradient: null }),
            onTogglePicker: () =>
              setActiveColorPicker(activeColorPicker === 'fill' ? null : 'fill'),
            onSelectNone: () => onChange({ fillStyle: 'none' }),
          })}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Effects"
        meta={
          resolvedStyle.shadows.length > 0
            ? `${resolvedStyle.shadows.length} shadow`
            : 'Add depth'
        }
        isExpanded={expandedSections.effects}
        onToggle={() => toggleSection('effects')}
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
                      onClick={() =>
                        setActiveShadowColorPicker(
                          activeShadowColorPicker === index ? null : index
                        )
                      }
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
                      onChange={(e) =>
                        handleUpdateShadow(index, { x: parseFloat(e.target.value) || 0 })
                      }
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
                      onChange={(e) =>
                        handleUpdateShadow(index, { y: parseFloat(e.target.value) || 0 })
                      }
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
                      onChange={(e) =>
                        handleUpdateShadow(index, { blur: parseFloat(e.target.value) || 0 })
                      }
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
                    onChange={(e) =>
                      handleUpdateShadow(index, { opacity: parseFloat(e.target.value) })
                    }
                  />
                  <span className="shadow-opacity-value">
                    {formatPercent(shadow.opacity)}
                  </span>
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
    </div>
    {floatingColorPicker}
    </>
  );
}
