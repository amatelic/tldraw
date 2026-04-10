# Types Directory

This directory contains TypeScript type definitions used throughout the application.

## Overview

Centralized type definitions ensure consistency across the application. All modules import types from here.

## Files

| File | Purpose | Lines |
|------|---------|-------|
| `index.ts` | All type definitions | 254 |

## Type Definitions

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

#### ShapeStyle
```typescript
interface ShapeStyle {
  color: string;              // Stroke color (hex)
  fillColor: string;          // Fill color (hex)
  strokeWidth: number;        // Line width (1, 2, 4, 8, 12)
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  fillStyle: 'none' | 'solid' | 'pattern';
  opacity: number;            // 0-1
  // Text-specific
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}
```

Visual styling applied to shapes. Text-specific properties only apply to text shapes.

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

#### EditorState
```typescript
interface EditorState {
  tool: ToolType;
  selectedShapeIds: string[];
  camera: CameraState;
  isDragging: boolean;
  isDrawing: boolean;
  shapeStyle: ShapeStyle;
  editingTextId: string | null;
}
```

Complete editor state. Stored per-workspace.

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
  strokeWidth: 2,
  strokeStyle: 'solid',
  fillStyle: 'none',
  opacity: 1,
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
  '#1e1e1e',  // Dark gray
  '#dc2626',  // Red
  '#ea580c',  // Orange
  '#ca8a04',  // Yellow
  '#16a34a',  // Green
  '#0891b2',  // Cyan
  '#2563eb',  // Blue
  '#9333ea',  // Purple
  '#db2777',  // Pink
  '#9ca3af',  // Gray
] as const;
```

11 preset colors for color picker.

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

Generates unique shape IDs:
```typescript
return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
// Example: "shape-1712530800000-abc123xyz"
```

Uses timestamp + random string for uniqueness.

#### generateBounds(start, end)
```typescript
function generateBounds(start: Point, end: Point): Bounds
```

Creates Bounds from two corner points:
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

Hit testing for all shape types:

- **Rectangle**: Point-in-rect test
- **Circle**: Distance from center ≤ radius
- **Line/Arrow**: Distance to line segment ≤ 5px
- **Pencil**: Distance to any point ≤ 10px
- **Image/Audio/Text/Embed**: Point-in-bounds test

**⚠️ NOTE**: This is a duplicate - same logic exists in Canvas component. Consider consolidating.

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
  - Canvas component (add hit testing)
  - Toolbar (add tool)
  - Keyboard shortcuts
  - Possibly workspace store

## Known Issues

1. **Duplicate Hit Testing**: `isPointInShape()` exists here and in Canvas component. Should consolidate.

2. **Type Changes Cascade**: Adding a field to Shape requires updates in many places.

3. **No Runtime Validation**: TypeScript types don't validate at runtime. Corrupted localStorage data could break app.

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
