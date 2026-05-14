import { describe, expect, it, vi } from 'vitest';
import type { TextTypography } from '../../types';
import { getTextMeasurementFont, measureTextEditBounds } from './textMeasurement';

const typography: TextTypography = {
  fontSize: 20,
  fontFamily: 'sans-serif',
  fontWeight: 'bold',
  fontStyle: 'italic',
  textAlign: 'left',
};

describe('canvas text measurement', () => {
  it('builds the canvas font string from text typography', () => {
    expect(getTextMeasurementFont(typography)).toBe('italic bold 20px sans-serif');
  });

  it('keeps minimum editor dimensions for short text', () => {
    const measureTextWidth = vi.fn(() => 40);

    expect(
      measureTextEditBounds(
        'Hi',
        { x: 10, y: 20, width: 200, height: 100 },
        typography,
        measureTextWidth
      )
    ).toEqual({ x: 10, y: 20, width: 200, height: 100 });
    expect(measureTextWidth).toHaveBeenCalledWith('Hi', 'italic bold 20px sans-serif');
  });

  it('expands width and height from measured multiline content', () => {
    const measureTextWidth = vi.fn((line: string) => (line === 'long line' ? 260 : 30));

    expect(
      measureTextEditBounds(
        'short\nlong line\nthird\nfourth\nlast',
        { x: 0, y: 0, width: 200, height: 100 },
        typography,
        measureTextWidth
      )
    ).toEqual({ x: 0, y: 0, width: 280, height: 144 });
  });
});
