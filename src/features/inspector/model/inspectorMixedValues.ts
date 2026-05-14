import type { ShapeStyle } from '../../../types';

export interface InspectorMixedValueState {
  hasMixedValues: boolean;
  strokeColorMixed: boolean;
  fillMixed: boolean;
  strokeWidthMixed: boolean;
  strokeStyleMixed: boolean;
  blendModeMixed: boolean;
  opacityMixed: boolean;
  fontFamilyMixed: boolean;
  fontSizeMixed: boolean;
  fontWeightMixed: boolean;
  fontStyleMixed: boolean;
  textAlignMixed: boolean;
  shadowMixed: boolean;
  styleSectionMixed: boolean;
  typeSectionMixed: boolean;
}

export function buildInspectorMixedValueState(
  selectedCount: number,
  mixedStyleKeys: Array<keyof ShapeStyle>
): InspectorMixedValueState {
  const mixedStyleKeySet = new Set(mixedStyleKeys);
  const strokeColorMixed = mixedStyleKeySet.has('color');
  const fillMixed =
    mixedStyleKeySet.has('fillColor') ||
    mixedStyleKeySet.has('fillStyle') ||
    mixedStyleKeySet.has('fillGradient');
  const strokeWidthMixed = mixedStyleKeySet.has('strokeWidth');
  const strokeStyleMixed = mixedStyleKeySet.has('strokeStyle');
  const blendModeMixed = mixedStyleKeySet.has('blendMode');
  const opacityMixed = mixedStyleKeySet.has('opacity');
  const fontFamilyMixed = mixedStyleKeySet.has('fontFamily');
  const fontSizeMixed = mixedStyleKeySet.has('fontSize');
  const fontWeightMixed = mixedStyleKeySet.has('fontWeight');
  const fontStyleMixed = mixedStyleKeySet.has('fontStyle');
  const textAlignMixed = mixedStyleKeySet.has('textAlign');
  const shadowMixed = mixedStyleKeySet.has('shadows');

  return {
    hasMixedValues: selectedCount > 1 && mixedStyleKeySet.size > 0,
    strokeColorMixed,
    fillMixed,
    strokeWidthMixed,
    strokeStyleMixed,
    blendModeMixed,
    opacityMixed,
    fontFamilyMixed,
    fontSizeMixed,
    fontWeightMixed,
    fontStyleMixed,
    textAlignMixed,
    shadowMixed,
    styleSectionMixed:
      strokeWidthMixed || strokeStyleMixed || fillMixed || blendModeMixed || opacityMixed,
    typeSectionMixed:
      fontFamilyMixed || fontSizeMixed || fontWeightMixed || fontStyleMixed || textAlignMixed,
  };
}
