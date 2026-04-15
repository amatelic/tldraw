import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { BlendMode, Bounds, ShapeStyle, ShadowStyle } from '../types';
import { COLORS, STROKE_WIDTHS, FONT_SIZES, FONT_FAMILIES, DEFAULT_STYLE } from '../types';
import { ColorPicker } from './ColorPicker';
import './PropertiesPanel.css';

interface PropertiesPanelProps {
  style: ShapeStyle;
  onChange: (style: Partial<ShapeStyle>) => void;
  layoutBounds?: Bounds | null;
  hasTextSelection?: boolean;
  onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute?: (axis: 'horizontal' | 'vertical') => void;
  onTidy?: () => void;
  selectedCount?: number;
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
  return (
    <div className="properties-section">
      <button
        className="section-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`section-${title}`}
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
        <div className="section-content" id={`section-${title}`}>
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

export function PropertiesPanel({
  style,
  onChange,
  layoutBounds,
  hasTextSelection,
  onAlign,
  onDistribute,
  onTidy,
  selectedCount = 0,
}: PropertiesPanelProps) {
  const [expandedSections, setExpandedSections] = useState<{
    layout: boolean;
    style: boolean;
    color: boolean;
    effects: boolean;
    type: boolean;
  }>({
    layout: true,
    style: true,
    color: true,
    effects: false,
    type: Boolean(hasTextSelection),
  });

  const [activeColorPicker, setActiveColorPicker] = useState<'stroke' | 'fill' | null>(null);
  const [activeShadowColorPicker, setActiveShadowColorPicker] = useState<number | null>(null);
  const resolvedStyle: ShapeStyle = {
    ...DEFAULT_STYLE,
    ...style,
    shadows: style.shadows ?? DEFAULT_STYLE.shadows,
  };

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
       onChange({ fillColor: color, fillStyle: 'solid' });
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
       onSelect,
       onTogglePicker,
       onSelectNone,
     }: {
       label: 'Stroke' | 'Fill';
       picker: 'stroke' | 'fill';
       selectedColor: string;
       isNone?: boolean;
       onSelect: (color: string) => void;
       onTogglePicker: () => void;
       onSelectNone?: () => void;
     }) => (
       <div className="color-group">
         <div className="color-control-card">
           <div className="color-control-copy">
             <span className="property-label">{label}</span>
             <span className="color-value-note">
               {isNone ? 'No fill' : `#${formatHex(selectedColor)}`}
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
               style={{ backgroundColor: isNone ? '#f1eef7' : selectedColor }}
               onClick={onTogglePicker}
               title={`Edit ${label.toLowerCase()} color`}
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
          }
        : null;
 
   return (
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
              value={formatMeasurement(layoutBounds?.x)}
              readOnly
              placeholder="0"
            />
          </div>
          <div className="layout-field">
            <label className="field-label">Y</label>
            <input
              type="text"
              className="field-input"
              value={formatMeasurement(layoutBounds?.y)}
              readOnly
              placeholder="0"
            />
          </div>
          <div className="layout-field">
            <label className="field-label">W</label>
            <input
              type="text"
              className="field-input"
              value={formatMeasurement(layoutBounds?.width)}
              readOnly
              placeholder="0"
            />
          </div>
          <div className="layout-field">
            <label className="field-label">H</label>
            <input
              type="text"
              className="field-input"
              value={formatMeasurement(layoutBounds?.height)}
              readOnly
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
            <div className="stroke-width-options">
              {STROKE_WIDTHS.map((width) => (
                <button
                  key={width}
                  className={`stroke-width-button ${resolvedStyle.strokeWidth === width ? 'active' : ''}`}
                  onClick={() => onChange({ strokeWidth: width })}
                  title={`${width}px`}
                >
                  <div className="stroke-width-line" style={{ height: width }} />
                  <span>{width}</span>
                </button>
              ))}
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
          {activeColorPickerConfig && (
            <div className="color-picker-container color-section-picker">
              <ColorPicker
                color={activeColorPickerConfig.color}
                alpha={1}
                onChange={activeColorPickerConfig.onChange}
                onClose={() => setActiveColorPicker(null)}
                showAlpha={false}
              />
            </div>
          )}

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
            onSelect: (color) => onChange({ fillColor: color, fillStyle: 'solid' }),
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

                {activeShadowColorPicker === index && (
                  <div className="shadow-color-picker-container">
                    <ColorPicker
                      color={shadow.color}
                      alpha={shadow.opacity}
                      onChange={(color, alpha) => {
                        handleShadowColorChange(index, color);
                        handleUpdateShadow(index, { opacity: alpha });
                      }}
                      onClose={() => setActiveShadowColorPicker(null)}
                      showAlpha={true}
                    />
                  </div>
                )}

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
  );
}
