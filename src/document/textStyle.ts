import { DEFAULT_STYLE } from '../types';
import type { Shape, ShapeStyle, TextShape, TextTypography } from '../types';

export const TEXT_TYPOGRAPHY_KEYS = [
  'fontSize',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'textAlign',
] as const satisfies ReadonlyArray<keyof TextTypography>;

export function normalizeShapeStyle(style?: Partial<ShapeStyle> | null): ShapeStyle {
  return {
    ...DEFAULT_STYLE,
    ...style,
    fillGradient: style?.fillGradient ?? null,
    shadows: style?.shadows ? style.shadows.map((shadow) => ({ ...shadow })) : [],
  };
}

function pickTextTypographyUpdates(updates: Partial<ShapeStyle>): Partial<TextTypography> {
  const typographyUpdates: Partial<TextTypography> = {};

  for (const key of TEXT_TYPOGRAPHY_KEYS) {
    const nextValue = updates[key];
    if (nextValue !== undefined) {
      Object.assign(typographyUpdates, { [key]: nextValue });
    }
  }

  return typographyUpdates;
}

export function getTextShapeTypography(shape: TextShape): TextTypography {
  const style = normalizeShapeStyle(shape.style);

  return {
    fontSize: shape.fontSize ?? style.fontSize,
    fontFamily: shape.fontFamily ?? style.fontFamily,
    fontWeight: shape.fontWeight ?? style.fontWeight,
    fontStyle: shape.fontStyle ?? style.fontStyle,
    textAlign: shape.textAlign ?? style.textAlign,
  };
}

export function normalizeTextShape(shape: TextShape): TextShape {
  const style = normalizeShapeStyle(shape.style);
  const typography = getTextShapeTypography({ ...shape, style });

  return {
    ...shape,
    ...typography,
    style: {
      ...style,
      ...typography,
    },
  };
}

export function applyTextStyleUpdates(
  shape: TextShape,
  updates: Partial<ShapeStyle>,
  timestamp: number
): TextShape {
  const typographyUpdates = pickTextTypographyUpdates(updates);

  return normalizeTextShape({
    ...shape,
    ...typographyUpdates,
    style: {
      ...normalizeShapeStyle(shape.style),
      ...updates,
      ...typographyUpdates,
    },
    updatedAt: timestamp,
  });
}

export function normalizeDocumentShape(shape: Shape): Shape {
  if (shape.type === 'text') {
    return normalizeTextShape(shape);
  }

  return {
    ...shape,
    style: normalizeShapeStyle(shape.style),
  };
}

export function normalizeDocumentShapes(shapes: Shape[]): Shape[] {
  return shapes.map(normalizeDocumentShape);
}
