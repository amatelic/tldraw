# Left Panel Refactoring to TLDraw-Style Toolbar

## Overview

Refactor the current vertical left sidebar into a horizontal floating toolbar docked at the bottom of the canvas, similar to TLDraw's design. This improves screen real estate usage and provides a more modern, compact interface.

## Current State Analysis

### Current Implementation
- **Position**: Fixed vertical sidebar on the left (64px width)
- **Layout**: Vertical stack of tool buttons
- **Content**: Each tool shows 20px icon + 10px text label below
- **Button size**: 40px x 40px
- **Active state**: Light blue background (#e3f2fd) with blue text
- **Responsive**: Switches to horizontal at top on mobile (< 768px)

### TLDraw Reference Design
- **Position**: Floating horizontal toolbar at bottom center
- **Layout**: Horizontal row of icon-only buttons
- **Content**: Icons only (no text labels)
- **Button size**: ~36px x 36px with padding
- **Active state**: Filled blue background (#2f80ed) with white icon
- **Design**: Rounded corners (8-12px), subtle shadow, white background
- **Keyboard shortcuts**: Displayed in tooltips on hover

## Design Specifications

### Visual Design

```
┌──────────────────────────────────────────────────────┐
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│  │ 👆 │ │ ✋ │ │ ✏️ │ │ ▭ │ │ ○ │ │ 📷 │ │ ▲ │  │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘  │
└──────────────────────────────────────────────────────┘
       ↑ Floating toolbar at bottom center
```

**Toolbar Container:**
- Position: Fixed, bottom: 20px, left: 50%, transform: translateX(-50%)
- Background: #ffffff
- Border-radius: 12px
- Box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15)
- Border: 1px solid rgba(0, 0, 0, 0.08)
- Padding: 6px
- Gap between buttons: 4px

**Tool Buttons:**
- Size: 36px x 36px
- Border-radius: 8px
- Default state: transparent background, #666 icon color
- Hover state: #f5f5f5 background
- Active/Selected state: 
  - Background: #2f80ed (TLDraw blue)
  - Icon color: #ffffff (white)
- Transition: all 0.15s ease

**Icons:**
- Size: 20px x 20px (unchanged)
- Stroke-width: 1.75 (slightly thinner for elegance)
- Color: inherits from button state

### Tool Order (TLDraw Standard)

The tools should be reordered to match TLDraw's standard layout:

1. **Select** (V) - Cursor/arrow icon
2. **Hand/Pan** (H) - Hand/grab icon
3. **Pencil** (D) - Pencil icon
4. **Eraser** (E) - Eraser icon
5. **Arrow** (A) - Arrow line icon
6. **Text** (T) - Text/T icon
7. **Rectangle** (R) - Square/rectangle icon
8. **Circle** (C) - Circle icon
9. **Line** (L) - Straight line icon
10. **Image** (I) - Image icon
11. **More/Expand** - Chevron up to show additional tools

**Additional tools in expanded menu:**
- Audio
- Embed

### Tooltips

- Display on hover with 300ms delay
- Content: "Tool Name (Shortcut)"
- Example: "Select (V)", "Rectangle (R)"
- Position: Above the button
- Style: Dark background (#1a1a1a), white text, 8px border-radius

### Keyboard Shortcuts

Keep existing shortcuts but add a few new ones:
- **Select**: V (unchanged)
- **Hand/Pan**: H (unchanged)
- **Pencil**: D (replaces Freehand F)
- **Eraser**: E (unchanged)
- **Arrow**: A (NEW)
- **Text**: T (unchanged)
- **Rectangle**: R (unchanged)
- **Circle**: C (unchanged)
- **Line**: L (unchanged)
- **Image**: I (unchanged)
- **Embed**: B (stays in More menu)

**Note**: Audio tool has no keyboard shortcut (accessed via More menu only)

### Responsive Behavior

**Desktop (> 768px):**
- Floating toolbar at bottom center
- All primary tools visible
- Expandable "More" button for additional tools

**Mobile (≤ 768px):**
- Same floating toolbar design
- May show fewer tools by default
- Horizontal scroll if needed
- Same expand/collapse behavior

## Technical Implementation

### Component Changes

**Toolbar.tsx:**
- Remove `.toolbar` wrapper div
- Change from vertical flex to horizontal flex
- Remove labels, keep only icons
- Add tooltip component or title attribute
- Add expand/collapse state for "More" button
- Update active state styling logic

**New Components:**
- `Tooltip.tsx` (if not already exists) - for hover tooltips

### CSS Changes

**Remove/Update in App.css:**
```css
/* Old vertical toolbar styles to remove */
.toolbar { width: 64px; border-right: 1px solid #e0e0e0; ... }
.toolbar-content { flex-direction: column; ... }
.toolbar-label { ... } /* Remove entirely */

/* Mobile media query - update to match new design */
@media (max-width: 768px) { ... }
```

**Add new styles:**
```css
/* Floating toolbar container */
.toolbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  padding: 6px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.08);
  z-index: 100;
}

.toolbar-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Tool buttons */
.toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #666;
}

.toolbar-button:hover {
  background-color: #f5f5f5;
  color: #333;
}

.toolbar-button.active {
  background-color: #2f80ed;
  color: #ffffff;
}

/* Remove toolbar-label styles entirely */
```

### Icon Updates

Update or add new icons to match TLDraw style:

1. **Select**: Arrow cursor (keep current)
2. **Hand**: Change from circle to hand/grab icon
3. **Pencil**: Add pencil icon (replaces freehand as primary drawing tool)
4. **Eraser**: Keep but update path
5. **Arrow**: Add arrow line tool icon
6. **Text**: Keep or update to "T" letter icon
7. **Rectangle**: Keep square outline
8. **Circle**: Keep circle outline
9. **Line**: Keep diagonal line
10. **Image**: Keep landscape image
11. **More**: NEW - Chevron up icon

**Tools moved to "More" menu (no main toolbar icons needed):**
- Audio
- Embed

### State Management

**No changes needed** - tool selection state remains in workspace store.

**New state for Toolbar:**
- `isExpanded: boolean` - controls visibility of additional tools

### Layout Impact

**App.tsx changes:**
- Remove left sidebar area
- Canvas container expands to full width
- Toolbar is now floating over canvas (position: fixed)

```
Before:                    After:
┌──┬────────────┬──┐       ┌──────────────────┐
│TB│   Canvas   │PP│       │                  │
│  │            │  │       │      Canvas      │
│  │            │  │       │                  │
└──┴────────────┴──┘       │    [Toolbar]     │
                           └──────────────────┘
TB = Toolbar (left)        Toolbar floats at bottom
PP = Properties (right)
```

## Testing Requirements

### Visual Regression Tests
- Toolbar renders at correct position (bottom center)
- All tools are visible and clickable
- Active state styling is applied correctly
- Tooltips appear on hover with correct content
- Expand/collapse "More" button works

### Functional Tests
- Tool selection changes the current tool
- Keyboard shortcuts work for all tools
- Special tools (Image, Audio, Embed) still open dialogs
- Mobile responsive behavior works

### Accessibility Tests
- All buttons have proper aria-labels
- Tooltips are accessible
- Keyboard navigation works (Tab through tools)

## Migration Plan

### Phase 1: Create Tooltip Component
1. Create new Tooltip component with proper styling
2. Implement hover delay (300ms) and positioning
3. Add dark theme styling (#1a1a1a background)
4. Ensure accessibility (aria-labels, keyboard navigation)

### Phase 2: Update Toolbar Component
1. Update Toolbar.tsx with new layout and styling
2. Update tool definitions (icons, order, shortcuts)
3. Add expand/collapse functionality for "More" menu
4. Integrate Tooltip component

### Phase 3: Update Styles
1. Remove old vertical toolbar CSS
2. Add new floating toolbar CSS
3. Update responsive styles

### Phase 4: Update Layout
1. Modify App.tsx to remove sidebar layout
2. Ensure canvas expands to fill available space
3. Position floating toolbar correctly

### Phase 5: Add New Tools and Renames
1. Add Arrow tool type and implementation
2. Rename Freehand tool to Pencil (update tool type and UI)
3. Move Audio and Embed to "More" menu
4. Update all keyboard shortcuts
5. Update ToolType definition

## Acceptance Criteria

- [ ] Toolbar is positioned at bottom center, floating over canvas
- [ ] Shows only icons (no text labels)
- [ ] Active tool has filled blue background with white icon
- [ ] Tooltips show tool name and shortcut on hover
- [ ] All existing functionality preserved (tool switching, dialogs, shortcuts)
- [ ] Mobile responsive design works correctly
- [ ] Matches TLDraw visual style closely
- [ ] All existing tests pass
- [ ] New visual tests added for toolbar

## Open Questions

**All questions have been resolved:**

1. ✅ **Arrow tool**: Add it as new tool type
2. ✅ **Freehand → Pencil**: Yes, rename and make primary
3. ✅ **Audio/Embed**: Move to "More" menu
4. ✅ **Tooltips**: Use custom Tooltip component

## Updated Tool Type Definition

```typescript
type ToolType = 
  | 'select'
  | 'hand'
  | 'pencil'      // renamed from 'freehand'
  | 'eraser'
  | 'arrow'       // NEW tool type
  | 'text'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'image'
  | 'audio'
  | 'embed';
```

**Changes:**
- `'freehand'` → `'pencil'` (renamed)
- Added `'arrow'` as new tool type
- `'audio'` and `'embed'` remain in type but moved to "More" menu in UI

## Resources

- TLDraw interface reference (user-provided images)
- Current implementation: `src/components/Toolbar.tsx`
- Current styles: `src/App.css` (lines 64-116, 831-842)
