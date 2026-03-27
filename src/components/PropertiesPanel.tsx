import type { ShapeStyle } from '../types';
import { COLORS, STROKE_WIDTHS } from '../types';

interface PropertiesPanelProps {
  style: ShapeStyle;
  onChange: (style: Partial<ShapeStyle>) => void;
}

export function PropertiesPanel({ style, onChange }: PropertiesPanelProps) {
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
    </div>
  );
}
