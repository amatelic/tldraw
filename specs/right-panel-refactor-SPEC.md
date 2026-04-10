# Right Side Panel (PropertiesPanel) Refactoring to TLDraw Style

## Overview

Refactor the current right sidebar (PropertiesPanel) to match TLDraw's modern, comprehensive properties panel design. The new design features collapsible sections, better organization, enhanced controls, and a color picker popup.

## Current State Analysis

### Current Implementation
- **Position**: Fixed right sidebar (240px width)
- **Layout**: Simple vertical stack of controls
- **Sections**: Basic style controls (color, fill, stroke, opacity, font)
- **Design**: Light theme, basic inputs

### TLDraw Reference Design
Based on the reference images, the new design features:
- **Light theme** with dark mode support (adapts to system preference)
- **Collapsible sections** with clear headers
- **Grouped controls** in organized layouts
- **Enhanced inputs** with labels and icons
- **Reusable color picker component** with gradient selector
- **Position/Layout controls** for precise adjustments
- **Effects section** for customizable shadows and advanced styling
- **Export controls** at the bottom (PNG, SVG)

## Design Specifications

### Visual Design

```
┌─────────────────────────────────────┐
│  Group ▾                     [icon] │
├─────────────────────────────────────┤
│  [↔] [↕] [=] [T] [-] [|] [·] [|] [=]│  ← Alignment controls
├─────────────────────────────────────┤
│  X    -114      Y    -191    [pos]  │  ← Position inputs
│  ↻    0°       [align] [distribute] │  ← Rotation & alignment
├─────────────────────────────────────┤
│  Layout                    [+]      │
│  W    138      H    23   [🔒] [↗]   │  ← Size + lock + aspect
│  ↔    0        ↕    0        [Tidy] │  ← Spacing controls
├─────────────────────────────────────┤
│  Style                     [+]      │
│  [🔧] No Layer Style          [↔]   │
├─────────────────────────────────────┤
│  Opacity                            │
│  [◎] Normal              [◐] 100%   │  ← Blend mode + opacity
├─────────────────────────────────────┤
│  Shadows                   [+]      │
│  [●] [○] [◎] [🔵]        [◐] 100%   │  ← Shadow presets
│  X    0        Y    4    [blur] [sprd]│
├─────────────────────────────────────┤
│  Effects                   [+]      │
├─────────────────────────────────────┤
│  Export                             │
│  [⚙] [+]                            │
└─────────────────────────────────────┘
```

### Color Picker Popup

```
┌─────────────────────────────────────┐
│  Solid Color    [🔧] [+] [···] [×]  │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │                             │   │  ← Color gradient
│  │      ●                      │   │
│  │                             │
│  └─────────────────────────────┘   │
│  ○──🌈───────────────────────────●  │  ← Hue slider
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓○  │  ← Alpha slider
├─────────────────────────────────────┤
│  H    0      S    0      L    100   │
│  #  FFFFFF        A    100%         │
├─────────────────────────────────────┤
│  [◎] Normal                    ▾    │
└─────────────────────────────────────┘
```

### Panel Container

**Panel Styling**:
- Position: Fixed right side
- Width: 280px (fixed, not resizable)
- Background: Light theme (#ffffff or #f8f9fa) with dark mode support via CSS variables
- Border-left: 1px solid rgba(0,0,0,0.1)
- Padding: 16px
- Gap between sections: 16px
- Scrollable: Yes (overflow-y: auto)
- Theme: Responds to `prefers-color-scheme` media query

**CSS Variables for Theming**:
```css
:root {
  --panel-bg: #ffffff;
  --panel-border: rgba(0,0,0,0.1);
  --text-primary: #1a1a1a;
  --text-secondary: rgba(0,0,0,0.6);
  --input-bg: rgba(0,0,0,0.05);
}

@media (prefers-color-scheme: dark) {
  :root {
    --panel-bg: #1a1a1a;
    --panel-border: rgba(255,255,255,0.1);
    --text-primary: #ffffff;
    --text-secondary: rgba(255,255,255,0.6);
    --input-bg: rgba(255,255,255,0.1);
  }
}
```

**Section Headers**:
- Font-size: 14px
- Font-weight: 600
- Color: var(--text-primary)
- Chevron icon for expand/collapse
- Plus icon for adding new items (where applicable)

**Input Fields**:
- Background: var(--input-bg)
- Border-radius: 8px
- Padding: 8px 12px
- Label: Inside or left of input
- Font: Monospace for numbers
- Color: var(--text-primary)
- Border: 1px solid var(--panel-border)

**Color Picker Component** (Reusable):

**Location**: `src/components/ColorPicker.tsx`

**Purpose**: Standalone reusable color picker component that can be used in PropertiesPanel, Toolbar, or any other component.

**Interface**:
```typescript
interface ColorPickerProps {
  color: string;           // Hex color (#RRGGBB)
  alpha?: number;          // 0-1, default 1
  onChange: (color: string, alpha: number) => void;
  onClose?: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showAlpha?: boolean;     // Show alpha slider, default true
}
```

**Features**:
1. **Gradient Selector**: Large HSL gradient area (200x150px)
   - Click/drag to select saturation/lightness
   - Current color indicator (circle with border)
2. **Hue Slider**: Rainbow gradient slider (height: 16px)
3. **Alpha Slider**: Transparency slider with checkerboard pattern (optional)
4. **Input Fields**:
   - H (Hue): 0-360
   - S (Saturation): 0-100
   - L (Lightness): 0-100
   - Hex: #RRGGBB (with # prefix)
   - A (Alpha): 0-100% (if showAlpha=true)
5. **Presets**: Row of preset color swatches (8-10 colors)
6. **Eyedropper**: Button to pick color from screen (if browser supports EyeDropper API)

**Popup Styling**:
- Background: var(--panel-bg)
- Border-radius: 12px
- Box-shadow: 0 8px 32px rgba(0,0,0,0.2)
- Width: 260px
- Padding: 16px
- Close button (X) in header
- Adapts to light/dark theme

**Usage Example**:
```tsx
import { ColorPicker } from './components/ColorPicker';

// In PropertiesPanel or Toolbar
<ColorPicker
  color="#2f80ed"
  alpha={1}
  onChange={(color, alpha) => updateStyle({ color, opacity: alpha })}
  onClose={() => setShowPicker(false)}
  showAlpha={true}
/>
```

### Sections Detail

#### 1. Group Section
- **Header**: "Group" with collapse arrow
- **Alignment Controls**: Row of icon buttons
  - Horizontal align: left, center, right, justify
  - Vertical align: top, middle, bottom
  - Distribute: horizontal, vertical
- **Position Inputs**: X, Y coordinates
- **Rotation**: Angle input with rotation icon
- **Quick Actions**: Align, Distribute buttons

#### 2. Layout Section
- **Header**: "Layout" with collapse arrow and add button
- **Size Inputs**: Width, Height
- **Lock Aspect Ratio**: Toggle button
- **Reset/Scale**: Button to reset proportions
- **Spacing**: Horizontal spacing, Vertical spacing
- **Tidy**: Button to auto-arrange

#### 3. Style Section
- **Header**: "Style" with collapse arrow and add button
- **Layer Style Selector**: Dropdown showing current style
- **Add/Edit**: Buttons to modify styles

#### 4. Opacity Section
- **Header**: "Opacity"
- **Blend Mode**: Dropdown (Normal, Multiply, Screen, Overlay, etc.)
- **Opacity Slider**: 0-100% with input field

#### 5. Shadows Section
- **Header**: "Shadows" with collapse arrow and add button (+)
- **Custom Shadows**: Users can add multiple custom shadows (not just presets)
- **Shadow List**: Each shadow shows:
  - Color swatch (click to open color picker)
  - X offset input
  - Y offset input
  - Blur radius input
  - Opacity slider
  - Delete button (×)
- **Add Shadow**: Button to add new shadow with default values
- **Presets** (optional): Quick buttons for common shadows (drop shadow, inner shadow)
- **Shadow Controls per Item**:
  - X offset: -100 to 100 pixels
  - Y offset: -100 to 100 pixels
  - Blur: 0 to 100 pixels
  - Opacity: 0-100%
  - Color picker for shadow color

#### 6. Effects Section
- **Header**: "Effects" with collapse arrow and add button
- Placeholder for future effects (blur, etc.)

#### 7. Export Section
- **Header**: "Export"
- **Format Toggle**: Two-button toggle (PNG | SVG)
- **PNG Options** (when PNG selected):
  - Quality: 0.1-1.0 (for JPEG, but PNG is lossless)
  - Scale: 1x, 2x, 3x (for retina displays)
- **SVG Options** (when SVG selected):
  - Include Images: Toggle (embed or link)
- **Export Button**: Primary button to download file
- **Export All**: Option to export all workspaces or just current

**Supported Formats**:
1. **PNG** - Raster image, good for screenshots/sharing
   - Lossless quality
   - Scale options for high DPI
   - Transparent background support
2. **SVG** - Vector format, good for editing in other tools
   - Editable in Illustrator, Figma, etc.
   - Infinitely scalable
   - Smaller file size for simple drawings

### Color Picker Component

**Trigger**: Clicking any color input opens popup

**Popup Features**:
1. **Gradient Selector**: Large HSL gradient area
   - Click/drag to select saturation/lightness
   - Current color indicator (circle)
2. **Hue Slider**: Rainbow gradient slider
3. **Alpha Slider**: Transparency slider with checkerboard pattern
4. **Input Fields**:
   - H (Hue): 0-360
   - S (Saturation): 0-100
   - L (Lightness): 0-100
   - Hex: #RRGGBB
   - A (Alpha): 0-100%
5. **Blend Mode**: Dropdown for layer blend mode
6. **Actions**: Eyedropper tool, add to palette, more options

**Popup Styling**:
- Background: Dark (#2a2a2a)
- Border-radius: 12px
- Box-shadow: Large shadow for elevation
- Width: ~280px
- Close button (X) in header

## Technical Implementation

### Component Structure

```typescript
// Main panel component
interface PropertiesPanelProps {
  selectedShapes: Shape[];
  style: ShapeStyle;
  onStyleChange: (updates: Partial<ShapeStyle>) => void;
  onAlign?: (alignment: Alignment) => void;
  onDistribute?: (distribution: Distribution) => void;
  onTidy?: () => void;
}

// Section components
interface PanelSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  action?: {
    icon: string;
    onClick: () => void;
  };
}

// Color picker
interface ColorPickerProps {
  color: string;
  alpha: number;
  blendMode: BlendMode;
  onChange: (color: string, alpha: number) => void;
  onBlendModeChange?: (mode: BlendMode) => void;
  onClose: () => void;
}
```

### CSS Structure

```css
/* Panel container */
.properties-panel {
  width: 280px;
  background: var(--panel-bg, #ffffff);
  border-left: 1px solid var(--panel-border, rgba(0,0,0,0.1));
  padding: 16px;
  overflow-y: auto;
  color: var(--text-primary, #1a1a1a);
  flex-shrink: 0;
}

/* Section */
.panel-section {
  margin-bottom: 16px;
  border-bottom: 1px solid var(--panel-border, rgba(0,0,0,0.1));
  padding-bottom: 16px;
}

.panel-section:last-child {
  border-bottom: none;
}

.panel-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  cursor: pointer;
  user-select: none;
}

.panel-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

/* Input row */
.input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.input-group {
  display: flex;
  align-items: center;
  background: var(--input-bg, rgba(0,0,0,0.05));
  border-radius: 8px;
  padding: 8px 12px;
  flex: 1;
  border: 1px solid var(--panel-border, rgba(0,0,0,0.1));
}

.input-label {
  font-size: 12px;
  color: var(--text-secondary, rgba(0,0,0,0.6));
  margin-right: 8px;
  text-transform: uppercase;
  font-weight: 500;
}

.input-field {
  background: transparent;
  border: none;
  color: var(--text-primary, #1a1a1a);
  font-family: monospace;
  font-size: 14px;
  width: 100%;
  outline: none;
}

/* Color picker popup */
.color-picker-popup {
  position: absolute;
  background: var(--panel-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  padding: 16px;
  width: 260px;
  z-index: 1000;
  border: 1px solid var(--panel-border, rgba(0,0,0,0.1));
}

/* Toggle button for export formats */
.format-toggle {
  display: flex;
  background: var(--input-bg, rgba(0,0,0,0.05));
  border-radius: 8px;
  padding: 4px;
  gap: 4px;
}

.format-toggle button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.format-toggle button.active {
  background: var(--primary-color, #2f80ed);
  color: white;
}
```

### New Types Needed

```typescript
// Blend modes
type BlendMode = 
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

// Alignment types
type HorizontalAlignment = 'left' | 'center' | 'right' | 'justify';
type VerticalAlignment = 'top' | 'middle' | 'bottom';
type Distribution = 'horizontal' | 'vertical';

// Shadow
type ShadowStyle = {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
};

// Extended shape style
interface ExtendedShapeStyle extends ShapeStyle {
  blendMode: BlendMode;
  shadows: ShadowStyle[];
}
```

### State Management

```typescript
// Panel expansion state (per session, not persisted)
interface PanelSectionsState {
  group: boolean;
  layout: boolean;
  style: boolean;
  opacity: boolean;
  shadows: boolean;
  effects: boolean;
  export: boolean;
}

// Default: all expanded
const defaultSectionsState: PanelSectionsState = {
  group: true,
  layout: true,
  style: true,
  opacity: true,
  shadows: true,
  effects: true,
  export: true,
};
```

## Migration Plan

### Phase 1: Theme Update
1. Update PropertiesPanel to dark theme
2. Update section headers with collapse functionality
3. Add section state management

### Phase 2: Layout Section
1. Add Position inputs (X, Y)
2. Add Size inputs (W, H) with lock aspect ratio
3. Add Rotation input
4. Add Spacing controls

### Phase 3: Alignment Controls
1. Create alignment button components
2. Add horizontal/vertical alignment
3. Add distribute functionality
4. Add Tidy button

### Phase 4: Enhanced Styling
1. Add blend mode selector
2. Add opacity slider with input
3. Create color picker component
4. Integrate color picker popups

### Phase 5: Shadows
1. Add shadow section
2. Create shadow preset buttons
3. Add shadow controls (x, y, blur, spread, color, opacity)
4. Allow multiple shadows

### Phase 6: Effects & Export
1. Add effects section (placeholder)
2. Add export section with format selector
3. Add export button

### Phase 7: Polish
1. Add animations for expand/collapse
2. Add tooltips
3. Keyboard shortcuts
4. Responsive adjustments

## Acceptance Criteria

- [ ] Panel uses light theme by default with dark mode support via `prefers-color-scheme`
- [ ] All sections are collapsible with smooth animations
- [ ] Color picker is a reusable component in `src/components/ColorPicker.tsx`
- [ ] Position inputs show and update shape position
- [ ] Size inputs with lock aspect ratio toggle
- [ ] Rotation input works with 0-360 degrees
- [ ] Alignment buttons work for multiple selections
- [ ] Distribute buttons work horizontally and vertically
- [ ] Tidy button auto-arranges shapes
- [ ] Blend mode selector works and updates canvas rendering
- [ ] Opacity slider and input synchronized
- [ ] Color picker opens on color input click
- [ ] Color picker has gradient, hue, alpha selectors
- [ ] Color picker updates color in real-time
- [ ] Color picker is reusable component
- [ ] Shadow section allows adding multiple custom shadows
- [ ] Each shadow has X, Y, blur, opacity, color controls
- [ ] Export section has PNG/SVG toggle
- [ ] PNG export supports scale options (1x, 2x, 3x)
- [ ] SVG export works correctly
- [ ] All existing functionality preserved
- [ ] Panel width fixed at 280px
- [ ] Panel is scrollable when content overflows
- [ ] Animations smooth (300ms ease)
- [ ] All inputs accessible via keyboard
- [ ] Tests for new components (ColorPicker, new PropertiesPanel sections)
- [ ] CSS variables for theming work in both light and dark modes

## Open Questions (Resolved)

1. **✅ Color picker reusability**: YES - Color picker should be a separate reusable component (`ColorPicker.tsx`) that can be used in PropertiesPanel, Toolbar, or any other component.

2. **✅ Shadow presets**: Customizable - Users can add, edit, and delete multiple custom shadows with full control over X, Y, blur, opacity, and color.

3. **✅ Panel width**: Fixed at 280px (not resizable by user).

4. **✅ Layer styles**: Not for initial implementation - Can be added later as a feature to save/load style presets.

5. **✅ Blend modes**: YES - Support blend modes in canvas rendering (not just export).

6. **✅ Export formats**: PNG and SVG (initially). PNG for raster sharing, SVG for vector editing.

## Technical Challenges

1. **Canvas Blend Modes**: Canvas 2D API has `globalCompositeOperation` which supports: source-over, source-in, source-out, source-atop, destination-over, destination-in, destination-out, destination-atop, lighter, copy, xor, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity
   - We'll map CSS blend modes to canvas composite operations
   - Note: Not all CSS blend modes have canvas equivalents

2. **Canvas Shadows**: Canvas 2D supports `shadowBlur`, `shadowColor`, `shadowOffsetX`, `shadowOffsetY` but:
   - Only ONE shadow per shape in canvas
   - To support multiple shadows, we need to draw shape multiple times
   - This affects performance

3. **Color Picker Positioning**: Need to handle positioning near screen edges using Popper.js or similar

4. **Multiple Selection**: Some controls (position, size) need to handle mixed values (show "—" or average)

5. **Performance**: Real-time updates to canvas while dragging sliders - need to debounce/throttle

6. **Mobile**: Panel may need different layout on small screens (collapse or move to bottom)

## Dependencies

- Framer Motion (for expand/collapse animations)
- Existing types from `src/types/index.ts`
- CanvasEngine modifications for blend modes/shadows
- Potential new library for color conversion (HSL ↔ RGB ↔ Hex)

## Resources

- TLDraw interface reference (user-provided images)
- Current implementation: `src/components/PropertiesPanel.tsx`
- Current styles: `src/App.css` (PropertiesPanel section)
