import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { FillGradient } from '../types';
import { COLORS } from '../types';
import './ColorPicker.css';

type ColorPickerTab = 'custom' | 'variables';
type ColorFormat = 'HSLA' | 'RGBA' | 'HEX';
type GradientMode = 'solid' | 'linear' | 'radial';
type GradientStop = 'start' | 'end';

interface ColorVariable {
  name: string;
  color: string;
  meta: string;
}

export interface ColorPickerProps {
  color: string;
  alpha?: number;
  onChange: (color: string, alpha: number) => void;
  onClose?: () => void;
  showAlpha?: boolean;
  variables?: ColorVariable[];
  allowGradient?: boolean;
  gradientValue?: FillGradient | null;
  onGradientChange?: (gradient: FillGradient | null) => void;
}

const DEFAULT_VARIABLES: ColorVariable[] = [
  { name: 'Ocean', color: '#2563EB', meta: 'Primary preset' },
  { name: 'Forest', color: '#16A34A', meta: 'Fresh accent' },
  { name: 'Flame', color: '#DC2626', meta: 'Alert accent' },
  { name: 'Violet', color: '#7C3AED', meta: 'Highlight preset' },
  { name: 'Slate', color: '#9CA3AF', meta: 'Neutral fill' },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeHexInput(value: string): string {
  return value.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
}

function normalizeHex(value: string): string | null {
  const sanitized = sanitizeHexInput(value.replace('#', ''));
  if (sanitized.length !== 6) {
    return null;
  }

  return `#${sanitized}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex) ?? '#000000';
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / Math.max(max + min, 0.0001);

  let hue = 0;
  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }

  return {
    h: hue * 60,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360 / 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;

  if (saturation === 0) {
    const value = Math.round(lightness * 255);
    return rgbToHex(value, value, value);
  }

  const hueToRgb = (p: number, q: number, t: number): number => {
    let sample = t;
    if (sample < 0) sample += 1;
    if (sample > 1) sample -= 1;
    if (sample < 1 / 6) return p + (q - p) * 6 * sample;
    if (sample < 1 / 2) return q;
    if (sample < 2 / 3) return p + (q - p) * (2 / 3 - sample) * 6;
    return p;
  };

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return rgbToHex(
    hueToRgb(p, q, hue + 1 / 3) * 255,
    hueToRgb(p, q, hue) * 255,
    hueToRgb(p, q, hue - 1 / 3) * 255
  );
}

function getGradientPreview(fillGradient: FillGradient): string {
  return fillGradient.type === 'linear'
    ? `linear-gradient(${fillGradient.angle}deg, ${fillGradient.startColor}, ${fillGradient.endColor})`
    : `radial-gradient(circle at center, ${fillGradient.startColor}, ${fillGradient.endColor})`;
}

function createGradient(
  mode: Exclude<GradientMode, 'solid'>,
  color: string,
  existing: FillGradient | null | undefined
): FillGradient {
  const fallbackEnd = color.toUpperCase() === COLORS[4].toUpperCase() ? COLORS[5] : COLORS[4];

  return {
    type: mode,
    startColor: existing?.startColor ?? color,
    endColor: existing?.endColor ?? fallbackEnd,
    angle: existing?.angle ?? 45,
  };
}

function getHandlePosition(saturation: number, lightness: number): { left: string; top: string } {
  return {
    left: `${clamp(saturation, 0, 100)}%`,
    top: `${100 - clamp(lightness, 0, 100)}%`,
  };
}

export function ColorPicker({
  color,
  alpha = 1,
  onChange,
  onClose,
  showAlpha = true,
  variables = DEFAULT_VARIABLES,
  allowGradient = false,
  gradientValue = null,
  onGradientChange,
}: ColorPickerProps) {
  const [activeTab, setActiveTab] = useState<ColorPickerTab>('custom');
  const [format, setFormat] = useState<ColorFormat>('HSLA');
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);
  const [activeGradientStop, setActiveGradientStop] = useState<GradientStop>('start');
  const [h, setH] = useState(0);
  const [s, setS] = useState(0);
  const [l, setL] = useState(0);
  const [a, setA] = useState(alpha);
  const [hexInput, setHexInput] = useState('000000');
  const gradientRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);
  const dragTargetRef = useRef<'gradient' | 'hue' | 'alpha' | null>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);

  const gradientMode: GradientMode =
    allowGradient && gradientValue ? gradientValue.type : 'solid';
  const editableColor =
    gradientMode === 'solid'
      ? color
      : activeGradientStop === 'start'
        ? gradientValue?.startColor ?? color
        : gradientValue?.endColor ?? color;

  const syncPickerState = useCallback((nextColor: string, nextAlpha: number) => {
    const normalized = normalizeHex(nextColor) ?? '#000000';
    const hsl = hexToHsl(normalized);
    setH(hsl.h);
    setS(hsl.s);
    setL(hsl.l);
    setA(clamp(nextAlpha, 0, 1));
    setHexInput(normalized.slice(1));
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    syncPickerState(editableColor, alpha);
  }, [alpha, editableColor, syncPickerState]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const handlePointerUp = () => {
      dragTargetRef.current = null;
    };

    const handlePointerMove = (event: MouseEvent) => {
      if (!dragTargetRef.current) {
        return;
      }

      event.preventDefault();

      const target = dragTargetRef.current;
      if (target === 'gradient') {
        const rect = gradientRef.current?.getBoundingClientRect();
        if (!rect) return;
        const nextS = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
        const nextL = clamp(100 - ((event.clientY - rect.top) / rect.height) * 100, 0, 100);
        const nextHex = hslToHex(h, nextS, nextL);
        syncPickerState(nextHex, a);
        if (gradientMode !== 'solid' && onGradientChange) {
          const nextGradient = createGradient(gradientMode, color, gradientValue);
          onGradientChange({
            ...nextGradient,
            [activeGradientStop === 'start' ? 'startColor' : 'endColor']: nextHex,
          });
        } else {
          onChange(nextHex, a);
        }
        return;
      }

      if (target === 'hue') {
        const rect = hueRef.current?.getBoundingClientRect();
        if (!rect) return;
        const nextH = clamp(((event.clientX - rect.left) / rect.width) * 360, 0, 360);
        const nextHex = hslToHex(nextH, s, l);
        syncPickerState(nextHex, a);
        if (gradientMode !== 'solid' && onGradientChange) {
          const nextGradient = createGradient(gradientMode, color, gradientValue);
          onGradientChange({
            ...nextGradient,
            [activeGradientStop === 'start' ? 'startColor' : 'endColor']: nextHex,
          });
        } else {
          onChange(nextHex, a);
        }
        return;
      }

      const rect = alphaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nextAlpha = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      setA(nextAlpha);
      onChange(normalizeHex(editableColor) ?? '#000000', nextAlpha);
    };

    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('mousemove', handlePointerMove);

    return () => {
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('mousemove', handlePointerMove);
    };
  }, [
    a,
    activeGradientStop,
    color,
    editableColor,
    gradientMode,
    gradientValue,
    h,
    l,
    onChange,
    onGradientChange,
    s,
    syncPickerState,
  ]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!formatMenuRef.current?.contains(event.target as Node)) {
        setIsFormatMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const commitColor = useCallback(
    (nextColor: string, nextAlpha: number = a) => {
      const normalized = normalizeHex(nextColor);
      if (!normalized) {
        return;
      }

      syncPickerState(normalized, nextAlpha);

      if (gradientMode !== 'solid' && onGradientChange) {
        const nextGradient = createGradient(gradientMode, color, gradientValue);
        onGradientChange({
          ...nextGradient,
          [activeGradientStop === 'start' ? 'startColor' : 'endColor']: normalized,
        });
        return;
      }

      onChange(normalized, clamp(nextAlpha, 0, 1));
    },
    [
      a,
      activeGradientStop,
      color,
      gradientMode,
      gradientValue,
      onChange,
      onGradientChange,
      syncPickerState,
    ]
  );

  const handleGradientModeChange = useCallback(
    (mode: GradientMode) => {
      if (!allowGradient || !onGradientChange) {
        return;
      }

      if (mode === 'solid') {
        onGradientChange(null);
        return;
      }

      setActiveGradientStop('start');
      onGradientChange(createGradient(mode, color, gradientValue));
    },
    [allowGradient, color, gradientValue, onGradientChange]
  );

  const handleGradientInteraction = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      dragTargetRef.current = 'gradient';
      const rect = gradientRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const nextS = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
      const nextL = clamp(100 - ((event.clientY - rect.top) / rect.height) * 100, 0, 100);
      commitColor(hslToHex(h, nextS, nextL), a);
    },
    [a, commitColor, h]
  );

  const handleHueInteraction = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      dragTargetRef.current = 'hue';
      const rect = hueRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const nextH = clamp(((event.clientX - rect.left) / rect.width) * 360, 0, 360);
      commitColor(hslToHex(nextH, s, l), a);
    },
    [a, commitColor, l, s]
  );

  const handleAlphaInteraction = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      dragTargetRef.current = 'alpha';
      const rect = alphaRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const nextAlpha = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      setA(nextAlpha);
      onChange(normalizeHex(editableColor) ?? '#000000', nextAlpha);
    },
    [editableColor, onChange]
  );

  const handleHexChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = sanitizeHexInput(event.target.value);
      setHexInput(nextValue);
      if (nextValue.length === 6) {
        commitColor(`#${nextValue}`, a);
      }
    },
    [a, commitColor]
  );

  const handleEyedropper = useCallback(async () => {
    if (!('EyeDropper' in window)) {
      return;
    }

    try {
      const eyeDropper = new (window as Window & { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
      const result = await eyeDropper.open();
      commitColor(result.sRGBHex, a);
    } catch {
      // User cancelled.
    }
  }, [a, commitColor]);

  const currentColor = normalizeHex(editableColor) ?? '#000000';
  const currentHsl = hexToHsl(currentColor);
  const currentRgb = hexToRgb(currentColor);
  const gradientHandlePosition = getHandlePosition(s, l);
  const alphaPercentage = Math.round(a * 100);

  return (
    <div className="color-picker">
      <div className="color-picker-topbar">
        <div className="color-picker-topbar-slot">
          {'EyeDropper' in window && (
            <button
              className="color-picker-action"
              onClick={handleEyedropper}
              title="Pick color from screen"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 11l-8-8-8.5 8.5a2.12 2.12 0 000 3l3 3a2.12 2.12 0 003 0L19 11zM16 14l-3-3" />
              </svg>
            </button>
          )}
        </div>

        <span className="color-picker-title">Color</span>

        <div className="color-picker-topbar-slot color-picker-topbar-slot-end">
          <button className="color-picker-action" onClick={onClose} title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="color-picker-tabs" role="tablist" aria-label="Color source">
        <button
          className={`color-picker-tab ${activeTab === 'custom' ? 'color-picker-tab-active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'custom'}
          onClick={() => setActiveTab('custom')}
        >
          Custom
        </button>
        <button
          className={`color-picker-tab ${activeTab === 'variables' ? 'color-picker-tab-active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'variables'}
          onClick={() => setActiveTab('variables')}
        >
          Variables
        </button>
      </div>

      {activeTab === 'custom' ? (
        <div className="color-picker-panel">
          {allowGradient && (
            <div className="color-picker-gradient-controls">
              <div className="color-picker-gradient-mode-row" role="tablist" aria-label="Fill type">
                <button
                  className={`color-picker-gradient-mode ${gradientMode === 'solid' ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleGradientModeChange('solid')}
                >
                  Solid
                </button>
                <button
                  className={`color-picker-gradient-mode ${gradientMode === 'linear' ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleGradientModeChange('linear')}
                >
                  Linear
                </button>
                <button
                  className={`color-picker-gradient-mode ${gradientMode === 'radial' ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleGradientModeChange('radial')}
                >
                  Rounded
                </button>
              </div>

              {gradientMode !== 'solid' && gradientValue && (
                <>
                  <div
                    className="color-picker-gradient-preview"
                    style={{ background: getGradientPreview(gradientValue) }}
                    aria-label="Gradient preview"
                  />

                  <div className="color-picker-gradient-stop-row">
                    <button
                      className={`color-picker-gradient-stop ${
                        activeGradientStop === 'start' ? 'active' : ''
                      }`}
                      type="button"
                      onClick={() => setActiveGradientStop('start')}
                      title="Edit gradient start color"
                    >
                      <span
                        className="color-picker-gradient-stop-swatch"
                        style={{ backgroundColor: gradientValue.startColor }}
                        aria-hidden="true"
                      />
                      <span className="color-picker-gradient-stop-copy">
                        <span className="color-picker-gradient-stop-label">Start</span>
                        <span className="color-picker-gradient-stop-value">
                          {gradientValue.startColor.toUpperCase()}
                        </span>
                      </span>
                    </button>

                    <button
                      className={`color-picker-gradient-stop ${
                        activeGradientStop === 'end' ? 'active' : ''
                      }`}
                      type="button"
                      onClick={() => setActiveGradientStop('end')}
                      title="Edit gradient end color"
                    >
                      <span
                        className="color-picker-gradient-stop-swatch"
                        style={{ backgroundColor: gradientValue.endColor }}
                        aria-hidden="true"
                      />
                      <span className="color-picker-gradient-stop-copy">
                        <span className="color-picker-gradient-stop-label">End</span>
                        <span className="color-picker-gradient-stop-value">
                          {gradientValue.endColor.toUpperCase()}
                        </span>
                      </span>
                    </button>
                  </div>

                  {gradientValue.type === 'linear' && (
                    <div className="color-picker-gradient-angle-row">
                      <div className="color-picker-gradient-angle-header">
                        <span className="color-picker-gradient-angle-title">Angle</span>
                        <span className="color-picker-gradient-angle-value">
                          {Math.round(gradientValue.angle)}°
                        </span>
                      </div>
                      <input
                        className="color-picker-gradient-angle-slider"
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={gradientValue.angle}
                        aria-label="Gradient angle"
                        onChange={(event) =>
                          onGradientChange?.({
                            ...gradientValue,
                            angle: clamp(Number(event.target.value), 0, 360),
                          })
                        }
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div
            ref={gradientRef}
            className="color-picker-gradient"
            style={{ backgroundColor: `hsl(${currentHsl.h}, 100%, 50%)` }}
            onMouseDown={handleGradientInteraction}
          >
            <div className="color-picker-gradient-surface">
              <div className="color-picker-gradient-overlay color-picker-gradient-overlay-white" />
              <div className="color-picker-gradient-overlay color-picker-gradient-overlay-black" />
            </div>
            <div
              className="color-picker-handle"
              style={{
                ...gradientHandlePosition,
                backgroundColor: currentColor,
              }}
            />
          </div>

          <div ref={hueRef} className="color-picker-hue" onMouseDown={handleHueInteraction}>
            <div
              className="color-picker-handle"
              style={{
                left: `${currentHsl.h / 3.6}%`,
                backgroundColor: `hsl(${currentHsl.h}, 100%, 50%)`,
              }}
            />
          </div>

          {showAlpha && (
            <>
              <input
                className="color-picker-sr-only"
                aria-label="Alpha"
                type="number"
                value={alphaPercentage}
                readOnly
              />
              <div ref={alphaRef} className="color-picker-alpha" onMouseDown={handleAlphaInteraction}>
                <div
                  className="color-picker-alpha-bg"
                  style={{ background: `linear-gradient(90deg, transparent, ${currentColor})` }}
                />
                <div
                  className="color-picker-handle"
                  style={{
                    left: `${alphaPercentage}%`,
                    backgroundColor: `rgba(255, 255, 255, ${Math.max(a, 0.08)})`,
                  }}
                />
              </div>
            </>
          )}

          <div className="color-picker-toolbar">
            <div className="color-picker-format-wrap" ref={formatMenuRef}>
              <button
                className="color-picker-format"
                type="button"
                onClick={() => setIsFormatMenuOpen((value) => !value)}
              >
                {format}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 10l4 4 4-4" />
                </svg>
              </button>
              {isFormatMenuOpen && (
                <div className="color-picker-format-menu" role="menu">
                  {(['HSLA', 'RGBA', 'HEX'] as const).map((option) => (
                    <button
                      key={option}
                      className={`color-picker-format-option ${
                        format === option ? 'color-picker-format-option-active' : ''
                      }`}
                      type="button"
                      role="menuitemradio"
                      aria-checked={format === option}
                      onClick={() => {
                        setFormat(option);
                        setIsFormatMenuOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="color-picker-toolbar-meta">
              <div
                className="color-picker-toolbar-swatch"
                style={{ backgroundColor: currentColor, opacity: showAlpha ? a : 1 }}
                aria-hidden="true"
              />
              {showAlpha && <span className="color-picker-toolbar-alpha">A {alphaPercentage}%</span>}
            </div>
          </div>

          {format === 'HSLA' && (
            <div className="color-picker-inputs">
              {[
                {
                  label: 'H',
                  value: Math.round(h),
                  min: 0,
                  max: 360,
                  onValueChange: (value: number) => {
                    commitColor(hslToHex(value, s, l), a);
                    setH(value);
                  },
                },
                {
                  label: 'S',
                  value: Math.round(s),
                  min: 0,
                  max: 100,
                  onValueChange: (value: number) => commitColor(hslToHex(h, value, l), a),
                },
                {
                  label: 'L',
                  value: Math.round(l),
                  min: 0,
                  max: 100,
                  onValueChange: (value: number) => commitColor(hslToHex(h, s, value), a),
                },
              ].map((field) => (
                <div key={field.label} className="color-picker-input-group">
                  <label htmlFor={`color-${field.label.toLowerCase()}`}>{field.label}</label>
                  <input
                    id={`color-${field.label.toLowerCase()}`}
                    aria-label={field.label}
                    type="number"
                    value={field.value}
                    min={field.min}
                    max={field.max}
                    onChange={(event) =>
                      field.onValueChange(clamp(Number(event.target.value), field.min, field.max))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {format === 'RGBA' && (
            <div
              className={`color-picker-inputs ${showAlpha ? 'color-picker-inputs-four' : ''}`}
            >
              {[
                {
                  label: 'R',
                  value: currentRgb.r,
                  onValueChange: (value: number) => commitColor(rgbToHex(value, currentRgb.g, currentRgb.b), a),
                },
                {
                  label: 'G',
                  value: currentRgb.g,
                  onValueChange: (value: number) => commitColor(rgbToHex(currentRgb.r, value, currentRgb.b), a),
                },
                {
                  label: 'B',
                  value: currentRgb.b,
                  onValueChange: (value: number) => commitColor(rgbToHex(currentRgb.r, currentRgb.g, value), a),
                },
                ...(showAlpha
                  ? [
                      {
                        label: 'A',
                        value: alphaPercentage,
                        onValueChange: (value: number) => {
                          const nextAlpha = clamp(value, 0, 100) / 100;
                          setA(nextAlpha);
                          onChange(currentColor, nextAlpha);
                        },
                      },
                    ]
                  : []),
              ].map((field) => (
                <div key={field.label} className="color-picker-input-group">
                  <label htmlFor={`color-${field.label.toLowerCase()}-rgba`}>{field.label}</label>
                  <input
                    id={`color-${field.label.toLowerCase()}-rgba`}
                    aria-label={field.label}
                    type="number"
                    value={field.value}
                    min={0}
                    max={field.label === 'A' ? 100 : 255}
                    onChange={(event) =>
                      field.onValueChange(
                        clamp(
                          Number(event.target.value),
                          0,
                          field.label === 'A' ? 100 : 255
                        )
                      )
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <div className="color-picker-inputs color-picker-inputs-bottom">
            <div className="color-picker-input-group color-picker-hex">
              <label htmlFor="color-hex">#</label>
              <input
                id="color-hex"
                aria-label="#"
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
                  aria-label="Hex alpha"
                  type="number"
                  value={alphaPercentage}
                  min={0}
                  max={100}
                  onChange={(event) => {
                    const nextAlpha = clamp(Number(event.target.value), 0, 100) / 100;
                    setA(nextAlpha);
                    onChange(currentColor, nextAlpha);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="color-picker-panel color-picker-variables-panel">
          <div className="color-picker-variables-copy">
            <span className="color-picker-variables-title">Preset variables</span>
            <span className="color-picker-variables-subtitle">
              Reuse the shared palette for consistent fills, strokes, and gradient stops.
            </span>
          </div>

          <div className="color-picker-variable-list">
            {variables.map((variable) => {
              const isActive = currentColor.toUpperCase() === variable.color.toUpperCase();
              return (
                <button
                  key={variable.name}
                  className={`color-picker-variable ${isActive ? 'color-picker-variable-active' : ''}`}
                  type="button"
                  onClick={() => commitColor(variable.color, a)}
                >
                  <span
                    className="color-picker-variable-swatch"
                    style={{ backgroundColor: variable.color }}
                    aria-hidden="true"
                  />
                  <span className="color-picker-variable-copy">
                    <span className="color-picker-variable-name">{variable.name}</span>
                    <span className="color-picker-variable-meta">{variable.meta}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
