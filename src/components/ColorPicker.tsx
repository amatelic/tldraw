import { useState, useCallback, useRef, useEffect } from 'react';
import './ColorPicker.css';

export interface ColorPickerProps {
  color: string;
  alpha?: number;
  onChange: (color: string, alpha: number) => void;
  onClose?: () => void;
  showAlpha?: boolean;
}

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 100 };
  
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  
  let r: number, g: number, b: number;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

const PRESET_COLORS = [
  '#000000', '#1e1e1e', '#dc2626', '#ea580c',
  '#ca8a04', '#16a34a', '#0891b2', '#2563eb',
  '#9333ea', '#db2777', '#ffffff', '#9ca3af'
];

export function ColorPicker({
  color,
  alpha = 1,
  onChange,
  onClose,
  showAlpha = true
}: ColorPickerProps) {
  const hsl = hexToHsl(color);
  const [h, setH] = useState(hsl.h);
  const [s, setS] = useState(hsl.s);
  const [l, setL] = useState(hsl.l);
  const [a, setA] = useState(alpha);
  const [hexInput, setHexInput] = useState(color.replace('#', '').toUpperCase());
  
  // Update internal state when props change
  useEffect(() => {
    const newHsl = hexToHsl(color);
    setH(newHsl.h);
    setS(newHsl.s);
    setL(newHsl.l);
    setHexInput(color.replace('#', '').toUpperCase());
  }, [color]);
  
  useEffect(() => {
    setA(alpha);
  }, [alpha]);
  
  const gradientRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const currentDrag = useRef<'gradient' | 'hue' | 'alpha' | null>(null);
  
  // Update hex when HSL changes
  const updateColor = useCallback((newH: number, newS: number, newL: number, newA: number) => {
    const newHex = hslToHex(newH, newS, newL);
    setHexInput(newHex.replace('#', ''));
    onChange(newHex, newA);
  }, [onChange]);
  
  // Handle gradient click/drag
  const handleGradientInteraction = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!gradientRef.current) return;
    const rect = gradientRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    const newS = x * 100;
    const newL = (1 - y) * 100;
    setS(newS);
    setL(newL);
    updateColor(h, newS, newL, a);
  }, [h, a, updateColor]);
  
  // Handle hue click/drag
  const handleHueInteraction = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newH = x * 360;
    setH(newH);
    updateColor(newH, s, l, a);
  }, [s, l, a, updateColor]);
  
  // Handle alpha click/drag
  const handleAlphaInteraction = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!alphaRef.current) return;
    const rect = alphaRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setA(x);
    updateColor(h, s, l, x);
  }, [h, s, l, updateColor]);
  
  // Mouse event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !currentDrag.current) return;
      e.preventDefault();
      
      switch (currentDrag.current) {
        case 'gradient':
          handleGradientInteraction(e);
          break;
        case 'hue':
          handleHueInteraction(e);
          break;
        case 'alpha':
          handleAlphaInteraction(e);
          break;
      }
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
      currentDrag.current = null;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleGradientInteraction, handleHueInteraction, handleAlphaInteraction]);
  
  // Handle hex input change
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    setHexInput(value);
    
    if (value.length === 6) {
      const newHsl = hexToHsl(`#${value}`);
      setH(newHsl.h);
      setS(newHsl.s);
      setL(newHsl.l);
      onChange(`#${value.toUpperCase()}`, a);
    }
  };
  
  // Handle eyedropper
  const handleEyedropper = async () => {
    if ('EyeDropper' in window) {
      try {
        // @ts-expect-error - EyeDropper API not yet in TypeScript
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        const newHsl = hexToHsl(result.sRGBHex);
        setH(newHsl.h);
        setS(newHsl.s);
        setL(newHsl.l);
        setHexInput(result.sRGBHex.replace('#', '').toUpperCase());
        onChange(result.sRGBHex.toUpperCase(), a);
      } catch (e) {
        // User cancelled
      }
    }
  };
  
  const currentColor = hslToHex(h, s, l);
  
  return (
    <div className="color-picker">
      <div className="color-picker-header">
        <span className="color-picker-title">Solid Color</span>
        <div className="color-picker-actions">
          {'EyeDropper' in window && (
            <button 
              className="color-picker-action" 
              onClick={handleEyedropper}
              title="Pick color from screen"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 11l-8-8-8.5 8.5a2.12 2.12 0 000 3l3 3a2.12 2.12 0 003 0L19 11zM16 14l-3-3"/>
              </svg>
            </button>
          )}
          <button className="color-picker-action" onClick={onClose} title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Gradient Selector */}
      <div
        ref={gradientRef}
        className="color-picker-gradient"
        style={{
          background: `
            linear-gradient(to bottom, transparent, #000),
            linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))
          `
        }}
        onMouseDown={(e) => {
          isDragging.current = true;
          currentDrag.current = 'gradient';
          handleGradientInteraction(e);
        }}
      >
        <div
          className="color-picker-handle"
          style={{
            left: `${s}%`,
            top: `${100 - l}%`,
            background: currentColor
          }}
        />
      </div>
      
      {/* Hue Slider */}
      <div
        ref={hueRef}
        className="color-picker-hue"
        onMouseDown={(e) => {
          isDragging.current = true;
          currentDrag.current = 'hue';
          handleHueInteraction(e);
        }}
      >
        <div
          className="color-picker-handle"
          style={{ left: `${h / 3.6}%`, background: `hsl(${h}, 100%, 50%)` }}
        />
      </div>
      
      {/* Alpha Slider */}
      {showAlpha && (
        <div
          ref={alphaRef}
          className="color-picker-alpha"
          onMouseDown={(e) => {
            isDragging.current = true;
            currentDrag.current = 'alpha';
            handleAlphaInteraction(e);
          }}
        >
          <div
            className="color-picker-alpha-bg"
            style={{ background: `linear-gradient(to right, transparent, ${currentColor})` }}
          />
          <div
            className="color-picker-handle"
            style={{ left: `${a * 100}%`, background: `rgba(255,255,255,${a})` }}
          />
        </div>
      )}
      
      {/* Input Fields */}
      <div className="color-picker-inputs">
        <div className="color-picker-input-group">
          <label htmlFor="color-h">H</label>
          <input
            id="color-h"
            type="number"
            value={Math.round(h)}
            min={0}
            max={360}
            onChange={(e) => {
              const val = Math.max(0, Math.min(360, Number(e.target.value)));
              setH(val);
              updateColor(val, s, l, a);
            }}
          />
        </div>
        <div className="color-picker-input-group">
          <label htmlFor="color-s">S</label>
          <input
            id="color-s"
            type="number"
            value={Math.round(s)}
            min={0}
            max={100}
            onChange={(e) => {
              const val = Math.max(0, Math.min(100, Number(e.target.value)));
              setS(val);
              updateColor(h, val, l, a);
            }}
          />
        </div>
        <div className="color-picker-input-group">
          <label htmlFor="color-l">L</label>
          <input
            id="color-l"
            type="number"
            value={Math.round(l)}
            min={0}
            max={100}
            onChange={(e) => {
              const val = Math.max(0, Math.min(100, Number(e.target.value)));
              setL(val);
              updateColor(h, s, val, a);
            }}
          />
        </div>
      </div>
      
      <div className="color-picker-inputs color-picker-inputs-bottom">
        <div className="color-picker-input-group color-picker-hex">
          <label htmlFor="color-hex">#</label>
          <input
            id="color-hex"
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            maxLength={6}
          />
        </div>
        {showAlpha && (
          <div className="color-picker-input-group">
            <label htmlFor="color-alpha">A</label>
            <input
              id="color-alpha"
              type="number"
              value={Math.round(a * 100)}
              min={0}
              max={100}
              onChange={(e) => {
                const val = Math.max(0, Math.min(100, Number(e.target.value))) / 100;
                setA(val);
                updateColor(h, s, l, val);
              }}
            />
          </div>
        )}
      </div>
      
      {/* Presets */}
      <div className="color-picker-presets">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            className="color-picker-preset"
            style={{ background: preset }}
            onClick={() => {
              const newHsl = hexToHsl(preset);
              setH(newHsl.h);
              setS(newHsl.s);
              setL(newHsl.l);
              setHexInput(preset.replace('#', ''));
              onChange(preset, a);
            }}
            title={preset}
          />
        ))}
      </div>
    </div>
  );
}
