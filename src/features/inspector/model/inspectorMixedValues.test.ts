import { describe, expect, it } from 'vitest';
import { buildInspectorMixedValueState } from './inspectorMixedValues';

describe('buildInspectorMixedValueState', () => {
  it('marks style, color, type, and effects groups from mixed style keys', () => {
    const state = buildInspectorMixedValueState(3, [
      'color',
      'fillGradient',
      'strokeWidth',
      'blendMode',
      'fontFamily',
      'fontStyle',
      'shadows',
    ]);

    expect(state).toMatchObject({
      hasMixedValues: true,
      strokeColorMixed: true,
      fillMixed: true,
      strokeWidthMixed: true,
      blendModeMixed: true,
      fontFamilyMixed: true,
      fontStyleMixed: true,
      shadowMixed: true,
      styleSectionMixed: true,
      typeSectionMixed: true,
    });
  });

  it('does not show the mixed banner for one selected shape even if keys are present', () => {
    expect(buildInspectorMixedValueState(1, ['color'])).toMatchObject({
      hasMixedValues: false,
      strokeColorMixed: true,
    });
  });

  it('keeps unrelated groups concrete when no matching mixed keys are present', () => {
    expect(buildInspectorMixedValueState(2, ['textAlign'])).toMatchObject({
      hasMixedValues: true,
      styleSectionMixed: false,
      typeSectionMixed: true,
      textAlignMixed: true,
      fillMixed: false,
      shadowMixed: false,
    });
  });
});
