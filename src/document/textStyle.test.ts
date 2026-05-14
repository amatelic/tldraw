import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from '../types';
import type { Shape, ShapeStyle, TextShape } from '../types';
import {
  applyTextStyleUpdates,
  getTextShapeTypography,
  normalizeDocumentShapes,
  normalizeTextShape,
} from './textStyle';

function createStyle(overrides: Partial<ShapeStyle> = {}): ShapeStyle {
  return {
    ...DEFAULT_STYLE,
    ...overrides,
  };
}

function createTextShape(overrides: Partial<TextShape> = {}): TextShape {
  return {
    id: 'text-1',
    type: 'text',
    text: 'Hello',
    bounds: { x: 40, y: 50, width: 200, height: 60 },
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    style: createStyle(),
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('textStyle helpers', () => {
  it('falls back to style typography for legacy text shapes missing top-level fields', () => {
    const legacyShape = {
      id: 'text-legacy',
      type: 'text',
      text: 'Legacy',
      bounds: { x: 0, y: 0, width: 180, height: 40 },
      style: createStyle({
        fontSize: 24,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
      }),
      createdAt: 1,
      updatedAt: 1,
    } as TextShape;

    expect(getTextShapeTypography(legacyShape)).toEqual({
      fontSize: 24,
      fontFamily: 'Georgia',
      fontWeight: 'bold',
      fontStyle: 'italic',
      textAlign: 'center',
    });

    expect(normalizeTextShape(legacyShape)).toMatchObject({
      fontSize: 24,
      fontFamily: 'Georgia',
      fontWeight: 'bold',
      fontStyle: 'italic',
      textAlign: 'center',
      style: {
        fontSize: 24,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
      },
    });
  });

  it('syncs inspector-style typography updates into both text fields and style mirrors', () => {
    const nextShape = applyTextStyleUpdates(
      createTextShape(),
      {
        fontSize: 22,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
      },
      99
    );

    expect(nextShape).toMatchObject({
      fontSize: 22,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontStyle: 'italic',
      textAlign: 'center',
      style: {
        fontSize: 22,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
      },
      updatedAt: 99,
    });
  });

  it('normalizes loaded document shapes without changing non-text content', () => {
    const shapes = normalizeDocumentShapes([
      {
        id: 'text-legacy',
        type: 'text',
        text: 'Legacy',
        bounds: { x: 0, y: 0, width: 180, height: 40 },
        style: createStyle({
          fontSize: 20,
          fontFamily: 'Georgia',
          textAlign: 'right',
        }),
        createdAt: 1,
        updatedAt: 1,
      } as Shape,
      {
        id: 'rect-1',
        type: 'rectangle',
        bounds: { x: 10, y: 20, width: 120, height: 80 },
        style: createStyle({ color: '#2563eb' }),
        createdAt: 2,
        updatedAt: 2,
      } as Shape,
    ]);

    expect(shapes[0]).toMatchObject({
      fontSize: 20,
      fontFamily: 'Georgia',
      textAlign: 'right',
      style: {
        fontSize: 20,
        fontFamily: 'Georgia',
        textAlign: 'right',
      },
    });
    expect(shapes[1]).toMatchObject({
      id: 'rect-1',
      style: {
        color: '#2563eb',
      },
    });
  });
});
