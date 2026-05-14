# Types Directory

This directory contains TypeScript type definitions used throughout the application.

## Overview

Centralized type definitions ensure consistency across the application. The core contracts and pure helper modules are now split by responsibility, while `index.ts` stays in place as a compatibility barrel plus `createShapeId()`.

## Files

| File | Purpose | Lines |
|------|---------|-------|
| `document.ts` | Document geometry, style, and shape contracts | ~180 |
| `editor.ts` | Tool, camera, and editor-session contracts | ~40 |
| `export.ts` | Versioned workspace export contracts | ~110 |
| `geometry.ts` | Shared geometry helpers such as bounds generation/intersection | ~20 |
| `hitTesting.ts` | Shared point-in-shape hit-testing helpers | ~45 |
| `selection.ts` | Group traversal, selection normalization, and selection-bounds helpers | ~120 |
| `index.ts` | Compatibility barrel plus `createShapeId()` | ~15 |
| `agents.ts` | Agent workflow and proposal contracts | ~150 |

## Type Definitions

### Focused Core Modules

The base app contracts are now split by ownership:

- `document.ts` owns durable canvas entities such as shapes, bounds, points, styles, and shared drawing constants.
- `editor.ts` owns runtime editor/session contracts such as `ToolType`, `CameraState`, `PersistedEditorState`, `EditorRuntimeState`, `EditorState`, and `CanvasState`.
- `export.ts` owns the versioned workspace export schema used by `src/utils/workspaceExport.ts`.
- `geometry.ts`, `hitTesting.ts`, and `selection.ts` own the extracted pure helper logic that used to live in the type barrel.
- `index.ts` re-exports those modules so existing imports keep working while the rest of the app migrates gradually.

### Agent Contracts

`agents.ts` defines the structured contracts used by the agent workflow system.

Key areas covered:

- workflow identifiers such as review, cleanup, rewrite, and diagram generation
- request/context packaging for current board scope
- structured proposal types for:
  - review findings
  - mutation actions
  - diagram-generation actions
- presentation brief metadata for generated diagrams
- generated shape and connector contracts used before apply

These types keep the UI, orchestrator, providers, and OpenCode transport aligned on one schema.

### Workspace Export Contract

`export.ts` defines the public-facing versioned export schema used by `src/utils/workspaceExport.ts`.

Key pieces:
- `WORKSPACE_EXPORT_FORMAT`: stable format id for downloaded workspace JSON
- `WORKSPACE_EXPORT_VERSION`: current schema version
- `WorkspaceExportDocumentV1`: top-level export document
- `ExportedShape`: discriminated union for exported nodes
- `WorkspaceExportMetadata`: exported workspace identity/timestamps

**Why it exists**:
- Prevents the download format from being tightly coupled to Zustand persistence internals
- Keeps transient editor/runtime state out of exported files
- Preserves group hierarchy explicitly for nested groups and future import support

**Grouping model**:
- Runtime group relationships use child `parentId` values as the canonical source of truth
- Every exported node includes `parentId`
- Exported group nodes derive `childrenIds` from those parent relationships for compatibility
- The exported `nodes` array preserves canvas layer order and each node also includes `zIndex`

### Core Types

#### ToolType
```typescript
type ToolType =
  | 'select'
  | 'pan'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'pencil'
  | 'eraser'
  | 'image'
  | 'audio'
  | 'text'
  | 'embed';
```

**Purpose**: Identifies the active drawing tool.

**Tools**:
1. **select**: Selection and dragging (V)
2. **pan**: Hand tool for panning canvas (H)
3. **rectangle**: Draw rectangles (R)
4. **circle**: Draw circles (C)
5. **line**: Draw lines (L)
6. **arrow**: Draw arrows with arrowheads (A)
7. **pencil**: Freehand drawing (D)
8. **eraser**: Delete shapes on click (E)
9. **image**: Add images (I)
10. **audio**: Add audio with waveform
11. **text**: Add text boxes (T)
12. **embed**: Embed YouTube/websites (B)

#### Point
```typescript
interface Point {
  x: number;
  y: number;
}
```

2D coordinate in world space.

#### Bounds
```typescript
interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Axis-aligned bounding box.

### Selection Helper Utilities

`selection.ts` exposes shared selection helpers so canvas, hooks, and app-level actions all agree on what a selectable entity means.

Key helpers:
- `getGroupChildren(groupId, shapes)` returns a group's direct children from canonical `parentId` links
- `getGroupChildIds(groupId, shapes)` returns those child ids when callers need ids instead of shapes
- `getTopLevelSelectableShape(shapeId, shapes)` resolves grouped children up to their root group
- `normalizeShapeIdsForSelection(shapeIds, shapes)` deduplicates selection sets to top-level IDs
- `getSelectableShapeBounds(shapeId, shapes)` returns bounds for one selectable entity, including live group bounds
- `getSelectionBounds(shapeIds, shapes)` combines a selection into one frame
- `boundsIntersect(a, b)` supports marquee selection and other bounds math

### Geometry And Hit-Testing Utilities

- `geometry.ts` exposes shared bounds math such as `generateBounds()` and `boundsIntersect()`
- `hitTesting.ts` exposes `isPointInShape()` so canvas hit-testing stays out of the type barrel

#### FillGradient
```typescript
interface FillGradient {
  type: 'linear' | 'radial';
  startColor: string;
  endColor: string;
  angle: number;
}
```

Optional fill background definition for shapes that need linear or rounded gradients.

#### ShapeStyle
```typescript
interface ShapeStyle {
  color: string;              // Stroke color (hex)
  fillColor: string;          // Fill color (hex)
  fillGradient?: FillGradient | null;
  strokeWidth: number;        // Line width (1, 2, 4, 8, 12)
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  fillStyle: 'none' | 'solid' | 'pattern';
  opacity: number;            // 0-1
  blendMode: BlendMode;       // Blend mode for globalCompositeOperation
  // Text-specific
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}
```

Visual styling applied to shapes. Text-specific properties only apply to text shapes.

#### TextTypography
```typescript
interface TextTypography {
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}
```

Shared typography contract used by both `ShapeStyle` and `TextShape`.

**Canonical text model**:
- `TextShape` now treats these top-level typography fields as the canonical runtime source
- `shape.style` still mirrors the same typography for compatibility while Task 07 migration code normalizes older persisted data

**Gradient Fills**:
- `fillGradient: null` means the fill uses `fillColor`
- `fillGradient.type === 'linear'` uses `angle` plus `startColor`/`endColor`
- `fillGradient.type === 'radial'` uses a rounded center-out gradient and ignores `angle` during rendering

#### ShadowStyle
```typescript
interface ShadowStyle {
  x: number;        // Horizontal offset in pixels
  y: number;        // Vertical offset in pixels
  blur: number;     // Blur radius (0 for sharp shadow)
  color: string;    // Shadow color in hex format (#RRGGBB)
  opacity: number;  // Opacity from 0 (transparent) to 1 (fully opaque)
}
```

Individual shadow definition used for shape shadows. Multiple shadows can be applied to a single shape.

**Properties**:
- **x**: Horizontal offset. Positive values move shadow right, negative left.
- **y**: Vertical offset. Positive values move shadow down, negative up.
- **blur**: Blur radius in pixels. Higher values create softer shadows.
- **color**: Hex color code for the shadow (e.g., '#000000' for black).
- **opacity**: Transparency level from 0 (invisible) to 1 (fully visible).

**Multiple Shadows**:
Shapes can have multiple shadows defined as an array:
```typescript
interface ShapeStyle {
  // ... other properties
  shadows?: ShadowStyle[];  // Optional array of shadows
}
```

**Example**:
```typescript
const dropShadow: ShadowStyle = {
  x: 4,
  y: 4,
  blur: 8,
  color: '#000000',
  opacity: 0.3
};
```

**Note**: Shadows are rendered by drawing the shape multiple times - once per shadow, then once for the actual shape. Performance scales with the number of shadows.

#### BlendMode
```typescript
type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';
```

**Purpose**: Defines how shapes blend with the canvas content below them using HTML5 Canvas `globalCompositeOperation`.

**Blend Modes**:
1. **normal**: Standard rendering (source-over)
2. **multiply**: Multiplies colors, resulting in darker
3. **screen**: Inverts, multiplies, inverts - lighter result
4. **overlay**: Combines multiply and screen
5. **darken**: Selects the darker of backdrop and source
6. **lighten**: Selects the lighter of backdrop and source
7. **color-dodge**: Brightens backdrop to reflect source
8. **color-burn**: Darkens backdrop to reflect source
9. **hard-light**: Like overlay but with source
10. **soft-light**: Softer version of hard-light
11. **difference**: Subtracts darker from lighter
12. **exclusion**: Similar to difference but lower contrast
13. **hue**: Uses source hue with backdrop saturation/luminosity
14. **saturation**: Uses source saturation with backdrop hue/luminosity
15. **color**: Uses source hue/saturation with backdrop luminosity
16. **luminosity**: Uses source luminosity with backdrop hue/saturation

**Canvas Mapping**:
```typescript
const BLEND_MODE_MAP: Record<BlendMode, GlobalCompositeOperation> = {
  'normal': 'source-over',
  'multiply': 'multiply',
  'screen': 'screen',
  'overlay': 'overlay',
  'darken': 'darken',
  'lighten': 'lighten',
  'color-dodge': 'color-dodge',
  'color-burn': 'color-burn',
  'hard-light': 'hard-light',
  'soft-light': 'soft-light',
  'difference': 'difference',
  'exclusion': 'exclusion',
  'hue': 'hue',
  'saturation': 'saturation',
  'color': 'color',
  'luminosity': 'luminosity',
};
```

All blend modes map directly to Canvas 2D Context's `globalCompositeOperation` property.

### Shape Types (Discriminated Union)

All shapes extend BaseShape and use discriminated union pattern.

#### BaseShape
```typescript
interface BaseShape {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'pencil' | 
        'image' | 'audio' | 'text' | 'embed';
  bounds: Bounds;
  style: ShapeStyle;
  createdAt: number;
  updatedAt: number;
}
```

Common properties for all shapes.

#### RectangleShape
```typescript
interface RectangleShape extends BaseShape {
  type: 'rectangle';
}
```
Simple rectangle defined by bounds.

#### CircleShape
```typescript
interface CircleShape extends BaseShape {
  type: 'circle';
  center: Point;
  radius: number;
}
```
Circle with center point and radius. Bounds are derived from center/radius.

#### LineShape
```typescript
interface LineShape extends BaseShape {
  type: 'line';
  start: Point;
  end: Point;
}
```
Straight line between two points.

#### ArrowShape
```typescript
interface ArrowShape extends BaseShape {
  type: 'arrow';
  start: Point;
  end: Point;
}
```
Line with arrowhead at end point. Same data as line, different rendering.

#### PencilShape
```typescript
interface PencilShape extends BaseShape {
  type: 'pencil';
  points: Point[];
}
```
Freehand drawing as array of points. Rendered with quadratic curves.

#### ImageShape
```typescript
interface ImageShape extends BaseShape {
  type: 'image';
  src: string;              // URL or base64 data URL
  originalWidth: number;    // Natural image width
  originalHeight: number;   // Natural image height
  isBase64: boolean;        // Whether src is base64
}
```
Raster image. Supports both URLs and base64 encoded images.

#### AudioShape
```typescript
interface AudioShape extends BaseShape {
  type: 'audio';
  src: string;              // URL or base64
  duration: number;         // Seconds
  isPlaying: boolean;
  waveformData: number[];   // Normalized amplitudes (0-1)
  isBase64: boolean;
  loop?: boolean;
}
```
Audio with waveform visualization. Playback state tracked.

#### TextShape
```typescript
interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}
```
Text box with full typography support. Bounds auto-size to content.

#### EmbedShape
```typescript
interface EmbedShape extends BaseShape {
  type: 'embed';
  url: string;              // Original URL
  embedType: 'youtube' | 'website';
  embedSrc: string;         // iframe src URL
}
```
Embedded external content (YouTube or generic website).

#### Shape Union
```typescript
type Shape =
  | RectangleShape
  | CircleShape
  | LineShape
  | ArrowShape
  | PencilShape
  | ImageShape
  | AudioShape
  | TextShape
  | EmbedShape;
```

**Discriminated Union Pattern**:
TypeScript narrows types based on `shape.type`:
```typescript
if (shape.type === 'circle') {
  // TypeScript knows shape is CircleShape
  console.log(shape.radius)  // ✓ Valid
}
```

### State Types

#### CameraState
```typescript
interface CameraState {
  x: number;      // Pan X (screen pixels)
  y: number;      // Pan Y (screen pixels)
  zoom: number;   // Zoom level (1 = 100%)
}
```

Camera position and zoom for canvas view transformation.

#### PersistedEditorState
```typescript
interface PersistedEditorState {
  tool: ToolType;
  selectedShapeIds: string[];
  camera: CameraState;
  shapeStyle: ShapeStyle;
}
```

Durable editor fields that are safe to restore from workspace persistence.

#### EditorRuntimeState
```typescript
interface EditorRuntimeState {
  isDragging: boolean;
  isDrawing: boolean;
  editingTextId: string | null;
}
```

Transient editor/session fields that should start from defaults on reload.

#### EditorState
```typescript
interface EditorState {
  ...PersistedEditorState,
  ...EditorRuntimeState,
}
```

Complete runtime editor state used by the canvas session layer.

#### CanvasState
```typescript
interface CanvasState {
  shapes: Shape[];
  editorState: EditorState;
}
```

Combined state for history management.

### Constants

#### DEFAULT_STYLE
```typescript
const DEFAULT_STYLE: ShapeStyle = {
  color: '#000000',
  fillColor: '#000000',
  fillGradient: null,
  strokeWidth: 2,
  strokeStyle: 'solid',
  fillStyle: 'none',
  opacity: 1,
  blendMode: 'normal',
  fontSize: 16,
  fontFamily: 'sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
};
```

Default styling for new shapes.

#### COLORS
```typescript
const COLORS = [
  '#000000',  // Black
  '#dc2626',  // Red
  '#d97706',  // Amber
  '#16a34a',  // Green
  '#2563eb',  // Blue
  '#7c3aed',  // Purple
  '#9ca3af',  // Gray
] as const;
```

7 preset colors for the quick color picker.

#### STROKE_WIDTHS
```typescript
const STROKE_WIDTHS = [1, 2, 4, 8, 12] as const;
```

Available stroke widths (pixels).

#### FONT_SIZES
```typescript
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 32, 48] as const;
```

Available font sizes (pixels).

#### FONT_FAMILIES
```typescript
const FONT_FAMILIES = [
  'sans-serif',
  'serif',
  'monospace',
  'Arial',
  'Georgia',
  'Times New Roman',
] as const;
```

Available font families.

### Utility Functions

#### createShapeId()
```typescript
function createShapeId(): string
```

Defined in `index.ts`. Generates unique shape IDs:
```typescript
return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
// Example: "shape-1712530800000-abc123xyz"
```

Uses timestamp + random string for uniqueness.

#### generateBounds(start, end)
```typescript
function generateBounds(start: Point, end: Point): Bounds
```

Defined in `geometry.ts`. Creates bounds from two corner points:
```typescript
const x = Math.min(start.x, end.x);
const y = Math.min(start.y, end.y);
const width = Math.abs(end.x - start.x);
const height = Math.abs(end.y - start.y);
```

Used when creating shapes from drag operations.

#### isPointInShape(point, shape)
```typescript
function isPointInShape(point: Point, shape: Shape): boolean
```

Defined in `hitTesting.ts`. Performs hit testing for all shape types:

- **Rectangle**: Point-in-rect test
- **Circle**: Distance from center ≤ radius
- **Line/Arrow**: Distance to line segment ≤ 5px
- **Pencil**: Distance to any point ≤ 10px
- **Image/Audio/Text/Embed**: Point-in-bounds test

## Type Safety Best Practices

1. **Use Discriminated Unions**: Always check `shape.type` before accessing type-specific properties
2. **Avoid `any`**: All types are strict, no implicit any
3. **Exhaustive Switches**: TypeScript warns on non-exhaustive switch statements
4. **Readonly Arrays**: Constants use `as const` for immutability

## Success Criteria

- [ ] All types strictly defined
- [ ] No `any` types used
- [ ] Discriminated unions work correctly
- [ ] Constants match UI options
- [ ] Shape types cover all drawing needs

## Constraints

- Type changes require updates across multiple files
- Adding new shape type requires updating:
  - This file (add interface + union)
  - CanvasEngine (add rendering)
  - `hitTesting.ts` (add hit testing)
  - Toolbar (add tool)
  - Keyboard shortcuts
  - Possibly workspace store

## Known Issues

1. **Type Changes Cascade**: Adding a field to `Shape` still requires updates in many places.

2. **No Runtime Validation**: TypeScript types don't validate at runtime. Corrupted localStorage data could break app.

## Adding New Types

When adding new types:

1. Add interface definition
2. Update union types if applicable
3. Add to this documentation
4. Update all consuming code
5. Consider backward compatibility

## Migration Strategy

For breaking type changes:

```typescript
// Add optional field with default
interface Shape {
  // existing fields
  newField?: string;  // Optional for backward compatibility
}

// In code, handle undefined
const value = shape.newField ?? 'default';

// After migration period, make required
```
