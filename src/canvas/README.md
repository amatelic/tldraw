# Canvas Directory

This directory contains the canvas rendering engine for drawing shapes.

## Overview

The CanvasEngine provides low-level canvas rendering capabilities:
- Shape rendering (rectangle, circle, line, arrow, pencil, image, audio, text, embed)
- Coordinate transformations (screen ↔ world)
- Camera transformations (pan/zoom)
- Grid rendering
- Selection indicators
- Shape creation from drag points
- Raster/vector export helpers for viewport, all-shapes, and selection downloads

## Files

| File | Purpose | Lines |
|------|---------|-------|
| `CanvasEngine.ts` | Canvas rendering engine class plus export helpers | ~1100 |
| `CanvasEngine.test.ts` | Resize, gradient, arrow, and export coverage | ~340 |
| `CanvasEngine.shadow.test.ts` | Shadow rendering tests | 370 |

## Detailed Documentation

### CanvasEngine Class

**Purpose**: Handles all canvas rendering operations and coordinate math.

**⚠️ CRITICAL**: This class manages the HTML5 Canvas 2D Context. All rendering goes through here.

**Constructor**:
```typescript
constructor(canvas: HTMLCanvasElement)
```

**Throws**: Error if canvas 2D context unavailable.

**Instance Properties**:
```typescript
private canvas: HTMLCanvasElement;
private ctx: CanvasRenderingContext2D;
private dpr: number;  // Device Pixel Ratio
private imageCache: Map<string, HTMLImageElement>;
```

**Public Methods**:

| Method | Purpose |
|--------|---------|
| `resize()` | Updates canvas size for DPR and resets the context transform before re-scaling |
| `clear()` | Clears entire canvas |
| `applyCamera(camera)` | Saves context, applies camera transform |
| `restoreCamera()` | Restores context |
| `screenToWorld(point, camera)` | Convert screen to world coordinates |
| `worldToScreen(point, camera)` | Convert world to screen coordinates |
| `drawShape(shape, isSelected?, showSelectionHandles?)` | Render any shape type with blend mode support |
| `drawGrid(camera, gridSize?)` | Render background grid |
| `drawPreviewShape(start, end, type, style)` | Draw preview during drag |
| `createShapeFromPoints(start, end, type, style)` | Create shape object from drag |
| `CanvasEngine.getBoundsForShape(shape)` | Static bounds helper for export/layout work |
| `CanvasEngine.getBoundsForShapes(shapes)` | Static aggregate bounds for content export |
| `CanvasEngine.exportViewportToPng(canvas)` | Serialize the current live canvas viewport to PNG |
| `CanvasEngine.exportShapesToPng(shapes, options?)` | Render a shape collection to an offscreen PNG |
| `CanvasEngine.exportShapesToSvg(shapes, options?)` | Serialize a shape collection to SVG markup |

**Private Methods**:

| Method | Purpose |
|--------|---------|
| `setStrokeStyle(style)` | Apply stroke color, width, dash |
| `createFillGradient(bounds, fillGradient)` | Build a linear or radial gradient for fills |
| `setFillStyle(style, bounds)` | Apply solid or gradient fills with opacity |
| `hexToRgba(hex, opacity)` | Convert hex color to rgba format |
| `createShapePath(shape)` | Create shape path without drawing |
| `createRectanglePath(shape)` | Create rectangle path |
| `createCirclePath(shape)` | Create circle path |
| `createLinePath(shape)` | Create line path |
| `createLinePathFromPoints(start, end)` | Create line path from points |
| `createArrowPath(shape)` | Create arrow path (line only) |
| `createPencilPath(shape)` | Create pencil path |
| `drawShapeWithShadow(shape, index)` | Draw shape with shadow at index |
| `drawRectangle(shape)` | Render rectangle |
| `drawCircle(shape)` | Render circle |
| `drawLine(shape)` | Render line |
| `drawArrow(shape)` | Render arrow with arrowhead |
| `drawArrowhead(shape)` | Render arrowhead only |
| `drawPencil(shape)` | Render freehand pencil strokes |
| `drawImage(shape)` | Render image (with caching) |
| `drawAudio(shape)` | Render audio waveform |
| `drawText(shape)` | Render text with word wrap |
| `drawEmbed(shape)` | Render embed placeholder |
| `drawSelectionIndicator(shape, showHandles?)` | Render selection border and optionally resize handles |
| `getShapeBounds(shape)` | Calculate shape bounds |
| `getResizeHandles(bounds)` | Get 8 resize handle positions |

**Coordinate Systems**:

### Screen Coordinates
- Origin: Top-left of canvas element
- Units: CSS pixels
- Used for: Mouse events, DOM positioning

### World Coordinates
- Origin: Arbitrary point in infinite canvas
- Units: Logical drawing units
- Used for: Shape positions, storing data

### Camera Transform
```typescript
// Screen to World
worldX = (screenX - camera.x) / camera.zoom
worldY = (screenY - camera.y) / camera.zoom

// World to Screen
screenX = worldX * camera.zoom + camera.x
screenY = worldY * camera.zoom + camera.y
```

**Device Pixel Ratio (DPR)**:

Canvas is scaled for high-DPI displays:
```typescript
// Internal canvas size (actual pixels)
canvas.width = rect.width * dpr
canvas.height = rect.height * dpr

// CSS size (displayed size)
canvas.style.width = `${rect.width}px`
canvas.style.height = `${rect.height}px`

// Reset then scale the context so repeated resizes do not compound transforms
ctx.setTransform(1, 0, 0, 1, 0, 0)
ctx.scale(dpr, dpr)
```

This ensures crisp rendering on Retina/4K displays.

**Resize Integration**:
- Canvas size changes are driven from the React `useElementSize` hook in the UI layer
- This allows the drawing surface to refresh when the application layout changes width or height, even if the browser window itself did not resize
- `resize()` is idempotent and safe to call repeatedly during those layout updates

**Selection Rendering**:
- CanvasEngine still renders per-shape selection outlines on the bitmap canvas
- Resize handles are now only drawn for single selection; multi-selection can request outlines without handles
- The combined multi-selection frame and marquee rectangle are rendered in the React `Canvas` layer as DOM overlays so they stay easy to evolve without complicating the engine

**Export Support**:
- `exportViewportToPng()` preserves the exact current viewport from the live canvas element
- `exportShapesToPng()` renders an arbitrary shape list onto an offscreen canvas with padding and a solid background
- `exportShapesToSvg()` serializes shapes into vector markup for rectangle/circle/line/arrow/pencil/image/audio/text/embed/group content
- Selection exports can include grouped descendants as long as the caller expands the selection before passing shapes in

**Rendering Shapes**:

### Gradient Fill Support
Rectangle and circle fills can now render optional gradients from `ShapeStyle.fillGradient`:
- `linear` gradients use the stored `angle` plus `startColor` and `endColor`
- `radial` gradients create a rounded center-out fill using `startColor` and `endColor`
- when `fillGradient` is absent, the engine falls back to the legacy solid `fillColor`

### Blend Mode Support
All shapes support blend modes through Canvas 2D's `globalCompositeOperation`. The blend mode is applied before drawing and restored after:

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

// Apply blend mode before drawing
currentCtx.globalCompositeOperation = BLEND_MODE_MAP[shape.style.blendMode];

// Draw shape...

// Restore default after drawing
currentCtx.globalCompositeOperation = 'source-over';
```

**Supported Blend Modes** (16 total):
1. `normal` - Default source-over blending
2. `multiply` - Darkens by multiplying colors
3. `screen` - Lightens by inverting and multiplying
4. `overlay` - Combines multiply and screen
5. `darken` - Keeps darker of the two
6. `lighten` - Keeps lighter of the two
7. `color-dodge` - Brightens backdrop
8. `color-burn` - Darkens backdrop
9. `hard-light` - Intense overlay effect
10. `soft-light` - Softer overlay effect
11. `difference` - Absolute difference
12. `exclusion` - Difference with lower contrast
13. `hue` - Uses hue from source
14. `saturation` - Uses saturation from source
15. `color` - Uses hue and saturation from source
16. `luminosity` - Uses luminosity from source

### Multiple Shadows Support

All shapes support multiple shadows. Since Canvas 2D only supports one shadow at a time via `shadowColor`, `shadowBlur`, `shadowOffsetX`, and `shadowOffsetY`, the engine draws the shape multiple times - once for each shadow, then once for the actual shape:

```typescript
// Shadow definition in ShapeStyle
interface ShadowStyle {
  x: number;        // Horizontal offset
  y: number;        // Vertical offset
  blur: number;     // Blur radius
  color: string;    // Hex color (#RRGGBB or #RGB)
  opacity: number;  // 0-1 opacity
}

// Draw shadows first (if any)
if (shape.style.shadows && shape.style.shadows.length > 0) {
  shape.style.shadows.forEach((shadow, index) => {
    ctx.shadowColor = hexToRgba(shadow.color, shadow.opacity)
    ctx.shadowBlur = shadow.blur
    ctx.shadowOffsetX = shadow.x
    ctx.shadowOffsetY = shadow.y
    
    // Draw shape path with current shadow
    drawShapeWithShadow(shape, index)
  })
  
  // Reset shadows
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

// Now draw the actual shape
setStrokeStyle(shape.style)
drawShapeActual(shape)
```

**Supported Shadow Shapes**:
- `rectangle` - Full shadow support (fill + stroke)
- `circle` - Full shadow support (fill + stroke)
- `line` - Stroke-only shadows
- `arrow` - Stroke + arrowhead shadows
- `pencil` - Stroke-only shadows
- `image`, `audio`, `text`, `embed`, `group` - Shadow rendering not supported

**Color Conversion**:
Hex colors are automatically converted to rgba for proper opacity support:
```typescript
// 6-character hex
hexToRgba('#ff0000', 0.5) // returns 'rgba(255, 0, 0, 0.5)'

// 3-character hex (expanded)
hexToRgba('#f00', 0.5)    // returns 'rgba(255, 0, 0, 0.5)'
```

**Performance Note**: Each shadow requires an additional draw pass. Shapes with many shadows will impact performance proportionally.

### Rectangle
```typescript
ctx.rect(x, y, width, height)
```
Optional fill with 30% opacity.

### Circle
```typescript
ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
```

### Line
```typescript
ctx.moveTo(start.x, start.y)
ctx.lineTo(end.x, end.y)
```

### Arrow
Line plus arrowhead calculated with trigonometry:
```typescript
const angle = Math.atan2(end.y - start.y, end.x - start.x)
// Draw two lines at a wider ±36° from the end point
// Arrowhead length scales with stroke width and stays between 14px and 24px
// The arrowhead itself is always rendered as solid segments for readability
```

### Pencil (Freehand)
Quadratic curves for smooth lines:
```typescript
for (let i = 1; i < points.length - 1; i++) {
  const midX = (points[i].x + points[i + 1].x) / 2
  const midY = (points[i].y + points[i + 1].y) / 2
  ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY)
}
```

### Image
Cached by URL:
```typescript
let img = this.imageCache.get(src)
if (!img) {
  img = new Image()
  img.src = src
  this.imageCache.set(src, img)
}
ctx.drawImage(img, x, y, width, height)
```

**⚠️ IMPORTANT**: Images are cached by URL, not by content. Two different images with same URL will show the same cached image.

### Audio
Renders waveform bars:
```typescript
waveformData.forEach((amplitude, i) => {
  const barHeight = amplitude * height * 0.8
  ctx.fillRect(barX, barY, barWidth - 1, barHeight)
})
```
Plus play/pause indicator and duration text.

### Text
Word wrapping with alignment:
```typescript
// Measure and wrap text
const metrics = ctx.measureText(testLine)
if (testWidth > maxWidth) { /* wrap */ }

// Draw with alignment
ctx.textAlign = shape.textAlign
ctx.fillText(line, lineX, y + index * lineHeight)
```

### Embed
Placeholder with icon:
- YouTube: Play triangle icon
- Website: Two horizontal bars icon

**Stroke Styles**:
```typescript
switch (style.strokeStyle) {
  case 'dashed':
    ctx.setLineDash([5, 5])
    break
  case 'dotted':
    ctx.setLineDash([2, 4])
    break
  default:
    ctx.setLineDash([])
}
```

**Selection Indicator**:
```typescript
// Dashed blue border
ctx.strokeStyle = '#2563eb'
ctx.setLineDash([4, 4])
ctx.strokeRect(bounds.x - 4, bounds.y - 4, ...)

// 8 resize handles (4px squares)
handles.forEach((handle) => {
  ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8)
})
```

**Grid Rendering**:
```typescript
// Calculate visible grid range
const startX = Math.floor(-camera.x / camera.zoom / gridSize) * gridSize
const endX = startX + rect.width / camera.zoom + gridSize * 2

// Draw vertical lines
for (let x = startX; x < endX; x += gridSize) {
  ctx.moveTo(x, startY)
  ctx.lineTo(x, endY)
}

// Draw horizontal lines
for (let y = startY; y < endY; y += gridSize) {
  ctx.moveTo(startX, y)
  ctx.lineTo(endX, y)
}
```

Grid is semi-transparent (50% opacity) light gray (#e5e5e5).

**Shape Creation**:

Factory method creates shape objects from drag coordinates:
```typescript
createShapeFromPoints(start, end, type, style): Shape
```

Supported types:
- `rectangle`: Bounds from min/max coordinates
- `circle`: Radius from distance between points
- `line`: Start/end points
- `arrow`: Start/end points (same as line, different rendering)
- `pencil`: Points array with start and end

**⚠️ Unsupported**: `image`, `audio`, `text`, `embed` - these throw errors because they require additional data (files, text content, URLs) that can't be determined from drag points alone.

**Success Criteria**:
- [x] All shape types render correctly
- [x] Shapes render at correct positions
- [x] Selection indicators visible
- [x] Grid renders correctly
- [x] Images cache and load properly
- [x] Text wraps and aligns correctly
- [x] Audio waveforms display correctly
- [x] Coordinate transformations accurate
- [x] High-DPI displays render crisply
- [x] **Multiple shadows render correctly**
- [x] **Shadow color conversion works (hex to rgba)**
- [x] **Shadow reset after drawing**
- [x] **Blend mode support**
- [x] **Shapes without shadows render normally**
- [x] **Viewport PNG export works from the live canvas**
- [x] **Shape collections can be exported to PNG and SVG**

**Constraints**:
- Canvas 2D Context required
- DPR calculated once at construction (won't update if moved to different display)
- Image caching by URL only
- No hit testing (done in Canvas component)
- No animation support (manual requestAnimationFrame required)

**Known Issues**:

1. **DPR Fixed at Construction**: If window moves to different display with different DPR, canvas won't update. Should listen for DPR changes.

2. **Image Cache Memory**: Images cached forever. No eviction strategy. Large images could cause memory issues.

3. **No Error Handling**: If image fails to load, shows placeholder but no retry mechanism.

4. **Text Performance**: `measureText` called for every text shape on every render. Could cache measurements.

5. **Embed Placeholder**: Embed shapes just show placeholder, not actual embedded content. Actual embeds rendered as DOM overlays by Canvas component.

6. **SVG Fidelity**: SVG export focuses on shape geometry and common styling. Some canvas-only presentation details such as live image loading state and multi-shadow fidelity remain approximate.

**Performance Considerations**:

- Reuse CanvasEngine instance (don't recreate)
- Call `applyCamera`/`restoreCamera` around all drawing
- Use `requestAnimationFrame` for smooth animation
- Cache expensive calculations (e.g., text measurements)
- Image caching prevents reloads

**Usage Example**:
```typescript
const engine = new CanvasEngine(canvasElement)

// Resize when window changes
window.addEventListener('resize', () => engine.resize())

// Render loop
function render() {
  engine.clear()
  engine.applyCamera(camera)
  
  // Draw grid
  engine.drawGrid(camera)
  
  // Draw all shapes
  shapes.forEach((shape) => {
    const isSelected = selectedIds.includes(shape.id)
    engine.drawShape(shape, isSelected)
  })
  
  engine.restoreCamera()
}
```

**Testing**:

CanvasEngine can be tested with mocked canvas:
```typescript
const mockCanvas = {
  getContext: () => ({
    scale: vi.fn(),
    clearRect: vi.fn(),
    // ... mock all methods
  }),
} as unknown as HTMLCanvasElement

const engine = new CanvasEngine(mockCanvas)
```

However, integration tests with real canvas are more valuable for rendering.

## Adding New Shape Types

To add a new shape type:

1. Add type to `ToolType` in types/index.ts
2. Add shape interface extending BaseShape
3. Add to Shape union type
4. Add case in `drawShape()` method
5. Create `drawNewShape()` private method
6. Add case in `getShapeBounds()`
7. Update `createShapeFromPoints()` if drawable
8. Update hit testing in Canvas component
9. Add to Toolbar
10. Add keyboard shortcut

## Best Practices

1. **Save/Restore Context**: Always wrap transforms in save/restore
2. **Set Styles Before Drawing**: Don't assume previous state
3. **Use Constants for Magic Numbers**: Arrow size, handle size, etc.
4. **Handle Edge Cases**: Empty arrays, zero dimensions
5. **Clean State**: Reset lineDash, globalAlpha, etc. after use
