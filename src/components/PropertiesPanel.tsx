import type { ShapeStyle } from '../types';
import { COLORS, STROKE_WIDTHS, FONT_SIZES, FONT_FAMILIES } from '../types';

interface PropertiesPanelProps {
  style: ShapeStyle;
  onChange: (style: Partial<ShapeStyle>) => void;
  hasTextSelection?: boolean;
}

export function PropertiesPanel({ style, onChange, hasTextSelection }: PropertiesPanelProps) {
  return (
    <div className="properties-panel">
      <h3>Properties</h3>

      <div className="property-group">
        <label>Stroke Color</label>
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
        </div>
      </div>

      <div className="property-group">
        <label>Fill Color</label>
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
        </div>
      </div>

      <div className="property-group">
        <label>Stroke Width</label>
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
        <label>Stroke Style</label>
        <select
          value={style.strokeStyle}
          onChange={(e) => onChange({ strokeStyle: e.target.value as ShapeStyle['strokeStyle'] })}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>

      <div className="property-group">
        <label>Opacity</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={style.opacity}
          onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
        />
        <span className="opacity-value">{Math.round(style.opacity * 100)}%</span>
      </div>

      {/* Text-specific properties - only show when text is selected */}
      {hasTextSelection && (
        <>
          <div className="property-group">
            <label>Font Size</label>
            <select
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
            <label>Font Family</label>
            <select
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
            <label>Font Style</label>
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
            <label>Text Align</label>
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
        </>
      )}
    </div>
  );
}
