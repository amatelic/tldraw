import { useState, useCallback } from 'react';
import type { BlendMode, ShapeStyle, ShadowStyle } from '../types';
import { COLORS, STROKE_WIDTHS, FONT_SIZES, FONT_FAMILIES } from '../types';
import { ColorPicker } from './ColorPicker';
import './PropertiesPanel.css';

interface PropertiesPanelProps {
  style: ShapeStyle;
  onChange: (style: Partial<ShapeStyle>) => void;
  hasTextSelection?: boolean;
  onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute?: (axis: 'horizontal' | 'vertical') => void;
  onTidy?: () => void;
  selectedCount?: number;
}

interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isExpanded, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="properties-section">
      <button
        className="section-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`section-${title}`}
      >
        <span className="section-title">{title}</span>
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

export function PropertiesPanel({
  style,
  onChange,
  hasTextSelection,
  onAlign,
  onDistribute,
  onTidy,
  selectedCount = 0,
}: PropertiesPanelProps) {
  const [expandedSections, setExpandedSections] = useState<{
    layout: boolean;
    style: boolean;
    opacity: boolean;
    effects: boolean;
  }>({
    layout: false,
    style: true,
    opacity: true,
    effects: false,
  });

  const [activeColorPicker, setActiveColorPicker] = useState<'stroke' | 'fill' | null>(null);
  const [activeShadowColorPicker, setActiveShadowColorPicker] = useState<number | null>(null);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

   
  const handleStrokeColorChange = useCallback(
    (color: string, _alpha: number) => {
      onChange({ color });
    },
    [onChange]
  );


   const handleFillColorChange = useCallback(
     (color: string, _alpha: number) => {
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
     const updatedShadows = [...(style.shadows || []), newShadow];
     onChange({ shadows: updatedShadows });
   }, [style.shadows, onChange]);
 
   const handleUpdateShadow = useCallback(
     (index: number, updates: Partial<ShadowStyle>) => {
       const updatedShadows = (style.shadows || []).map((shadow, i) =>
         i === index ? { ...shadow, ...updates } : shadow
       );
       onChange({ shadows: updatedShadows });
     },
     [style.shadows, onChange]
   );
 
   const handleDeleteShadow = useCallback(
     (index: number) => {
       const updatedShadows = (style.shadows || []).filter((_, i) => i !== index);
       onChange({ shadows: updatedShadows });
       if (activeShadowColorPicker === index) {
         setActiveShadowColorPicker(null);
       }
     },
     [style.shadows, onChange, activeShadowColorPicker]
   );
 
   const handleShadowColorChange = useCallback(
     (index: number, color: string, _alpha: number) => {
       handleUpdateShadow(index, { color });
     },
     [handleUpdateShadow]
   );
 
   return (
    <div className="properties-panel">
      <h3 className="panel-title">Properties</h3>

      <CollapsibleSection
        title="Layout"
        isExpanded={expandedSections.layout}
        onToggle={() => toggleSection('layout')}
      >
        <div className="layout-grid">
          <div className="layout-field">
            <label className="field-label">X</label>
            <input type="text" className="field-input" value="0" readOnly placeholder="0" />
          </div>
          <div className="layout-field">
            <label className="field-label">Y</label>
            <input type="text" className="field-input" value="0" readOnly placeholder="0" />
          </div>
          <div className="layout-field">
            <label className="field-label">W</label>
            <input type="text" className="field-input" value="0" readOnly placeholder="0" />
          </div>
          <div className="layout-field">
            <label className="field-label">H</label>
            <input type="text" className="field-input" value="0" readOnly placeholder="0" />
          </div>
        </div>

        {selectedCount > 1 && onAlign && (
          <div className="layout-controls">
            <div className="layout-control-row">
              <label className="layout-control-label">Align</label>
              <div className="alignment-buttons">
                <button
                  className="layout-button"
                  onClick={() => onAlign('left')}
                  title="Align Left"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h12M3 12h8M3 18h16" />
                  </svg>
                </button>
                <button
                  className="layout-button"
                  onClick={() => onAlign('center')}
                  title="Align Center"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6h12M8 12h8M4 18h16" />
                  </svg>
                </button>
                <button
                  className="layout-button"
                  onClick={() => onAlign('right')}
                  title="Align Right"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 6h12M11 12h8M5 18h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="layout-control-row">
              <div className="alignment-buttons">
                <button
                  className="layout-button"
                  onClick={() => onAlign('top')}
                  title="Align Top"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 3v12M12 3v8M18 3v16" />
                  </svg>
                </button>
                <button
                  className="layout-button"
                  onClick={() => onAlign('middle')}
                  title="Align Middle"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6v12M12 8v8M18 4v16" />
                  </svg>
                </button>
                <button
                  className="layout-button"
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
          <div className="layout-controls">
            <div className="layout-control-row">
              <label className="layout-control-label">Distribute</label>
              <div className="distribute-buttons">
                <button
                  className="layout-button"
                  onClick={() => onDistribute('horizontal')}
                  title="Distribute Horizontally"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 8L2 12l2 4M20 8l2 4-2 4M8 12h8" />
                  </svg>
                </button>
                <button
                  className="layout-button"
                  onClick={() => onDistribute('vertical')}
                  title="Distribute Vertically"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 4l4-2 4 2M8 20l4 2 4-2M12 8v8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedCount > 1 && onTidy && (
          <div className="layout-controls">
            <div className="layout-control-row">
              <label className="layout-control-label">Arrange</label>
              <button
                className="layout-button tidy-button"
                onClick={onTidy}
                title="Tidy Selection"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z" />
                </svg>
                <span>Tidy</span>
              </button>
            </div>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Style"
        isExpanded={expandedSections.style}
        onToggle={() => toggleSection('style')}
      >
        <div className="property-group">
          <label className="property-label">Stroke Color</label>
          <div className="color-grid">
            {COLORS.map((color) => (
              <button
                key={color}
                className={`color-button ${style.color === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onChange({ color })}
                title={color}
              />
            ))}
            <button
              className={`color-button color-button-custom ${activeColorPicker === 'stroke' ? 'active' : ''}`}
              onClick={() => setActiveColorPicker(activeColorPicker === 'stroke' ? null : 'stroke')}
              title="Custom Color"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </button>
          </div>
          {activeColorPicker === 'stroke' && (
            <div className="color-picker-container">
              <ColorPicker
                color={style.color}
                alpha={1}
                onChange={handleStrokeColorChange}
                onClose={() => setActiveColorPicker(null)}
                showAlpha={false}
              />
            </div>
          )}
        </div>

        <div className="property-group">
          <label className="property-label">Fill Color</label>
          <div className="color-grid">
            <button
              className={`color-button ${style.fillStyle === 'none' ? 'active' : ''}`}
              onClick={() => onChange({ fillStyle: 'none' })}
              title="No Fill"
            >
              <span className="no-fill-icon">/</span>
            </button>
            {COLORS.map((color) => (
              <button
                key={color}
                className={`color-button ${style.fillColor === color && style.fillStyle !== 'none' ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onChange({ fillColor: color, fillStyle: 'solid' })}
                title={color}
              />
            ))}
            <button
              className={`color-button color-button-custom ${activeColorPicker === 'fill' ? 'active' : ''}`}
              onClick={() => setActiveColorPicker(activeColorPicker === 'fill' ? null : 'fill')}
              title="Custom Color"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </button>
          </div>
          {activeColorPicker === 'fill' && (
            <div className="color-picker-container">
              <ColorPicker
                color={style.fillStyle === 'none' ? '#000000' : style.fillColor}
                alpha={1}
                onChange={handleFillColorChange}
                onClose={() => setActiveColorPicker(null)}
                showAlpha={false}
              />
            </div>
          )}
        </div>

        <div className="property-group">
          <label className="property-label">Stroke Width</label>
          <div className="stroke-width-options">
            {STROKE_WIDTHS.map((width) => (
              <button
                key={width}
                className={`stroke-width-button ${style.strokeWidth === width ? 'active' : ''}`}
                onClick={() => onChange({ strokeWidth: width })}
              >
                <div className="stroke-width-line" style={{ height: width }} />
              </button>
            ))}
          </div>
        </div>

        <div className="property-group">
          <label className="property-label">Stroke Style</label>
          <select
            className="property-select"
            value={style.strokeStyle}
            onChange={(e) => onChange({ strokeStyle: e.target.value as ShapeStyle['strokeStyle'] })}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Opacity"
        isExpanded={expandedSections.opacity}
        onToggle={() => toggleSection('opacity')}
      >
        <div className="property-group">
          <label className="property-label">Opacity</label>
          <div className="opacity-control">
            <input
              type="range"
              className="opacity-slider"
              min="0"
              max="1"
              step="0.1"
              value={style.opacity}
              onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
            />
            <span className="opacity-value">{Math.round(style.opacity * 100)}%</span>
          </div>
        </div>

        <div className="property-group">
          <label className="property-label">Blend Mode</label>
          <select
            className="property-select blend-mode-select"
            value={style.blendMode}
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Effects"
        isExpanded={expandedSections.effects}
        onToggle={() => toggleSection('effects')}
      >
        <div className="property-group">
          <label className="property-label">Shadows</label>
          <div className="shadows-list">
            {(!style.shadows || style.shadows.length === 0) && (
              <p className="shadow-empty-message">No shadows. Click "Add Shadow" to create one.</p>
            )}
            {style.shadows?.map((shadow, index) => (
              <div key={index} className="shadow-item">
                <div className="shadow-row">
                  <div className="shadow-input-group">
                    <label className="shadow-input-label">X</label>
                    <input
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
                    <label className="shadow-input-label">Y</label>
                    <input
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
                    <label className="shadow-input-label">Blur</label>
                    <input
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
                {activeShadowColorPicker === index && (
                  <div className="shadow-color-picker-container">
                    <ColorPicker
                      color={shadow.color}
                      alpha={shadow.opacity}
                      onChange={(color, alpha) => {
                        handleShadowColorChange(index, color, alpha);
                        handleUpdateShadow(index, { opacity: alpha });
                      }}
                      onClose={() => setActiveShadowColorPicker(null)}
                      showAlpha={true}
                    />
                  </div>
                )}
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
                    {Math.round(shadow.opacity * 100)}%
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

      {hasTextSelection && (
        <div className="text-properties">
          <div className="properties-section">
            <div className="section-header-static">
              <span className="section-title">Text</span>
            </div>
            <div className="section-content">
              <div className="property-group">
                <label className="property-label">Font Size</label>
                <select
                  className="property-select"
                  value={style.fontSize}
                  onChange={(e) => onChange({ fontSize: parseInt(e.target.value) })}
                >
                  {FONT_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
              </div>

              <div className="property-group">
                <label className="property-label">Font Family</label>
                <select
                  className="property-select"
                  value={style.fontFamily}
                  onChange={(e) => onChange({ fontFamily: e.target.value })}
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              <div className="property-group">
                <label className="property-label">Font Style</label>
                <div className="font-style-options">
                  <button
                    className={`style-toggle ${style.fontWeight === 'bold' ? 'active' : ''}`}
                    onClick={() =>
                      onChange({
                        fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold',
                      })
                    }
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    className={`style-toggle ${style.fontStyle === 'italic' ? 'active' : ''}`}
                    onClick={() =>
                      onChange({
                        fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic',
                      })
                    }
                  >
                    <em>I</em>
                  </button>
                </div>
              </div>

              <div className="property-group">
                <label className="property-label">Text Align</label>
                <div className="text-align-options">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      className={`align-button ${style.textAlign === align ? 'active' : ''}`}
                      onClick={() => onChange({ textAlign: align })}
                    >
                      {align === 'left' && 'L'}
                      {align === 'center' && 'C'}
                      {align === 'right' && 'R'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
