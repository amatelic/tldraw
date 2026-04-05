: "### Task 11: Conditional Right Sidebar with Animation
**Status**: ✅ Completed
**Priority**: HIGH
**Description**: Show the properties panel only when an element is selected with a smooth slide in/out animation

**Acceptance Criteria**:
- Properties panel should be hidden when no shape is selected
- Properties panel should slide in from the right when a shape is selected
- Properties panel should slide out to the right when selection is cleared
- Use Framer Motion for the slide animation
- Animation should feel natural and responsive (spring physics)
- Panel width: 240px (existing)
- Main canvas area should smoothly expand/contract when panel shows/hides

**Current State**:
- PropertiesPanel (`src/components/PropertiesPanel.tsx`) always visible on right side
- Selection tracked via `selectedShapeIds` in editor state
- Framer Motion already installed and used for workspace tabs

**Implementation Details**:
1. Wrap PropertiesPanel in AnimatePresence + motion.div
2. Use x-axis translation for slide effect (x: 240 → x: 0 for enter, x: 0 → x: 240 for exit)
3. AnimatePresence mode="wait" or "popLayout" for smooth transitions
4. Use spring transition: stiffness 300, damping 30
5. Layout animation on parent container for smooth canvas resize
6. Remove static `width: 240px` from CSS, handle via motion layout

**Files to Modify**:
- `src/App.tsx` - Wrap PropertiesPanel with motion and AnimatePresence
- `src/App.css` - Update layout styles to support animated sidebar
- `src/components/PropertiesPanel.tsx` - Wrap with motion.div

**Files to Create**:
- `src/components/PropertiesPanel.test.tsx` - Test conditional rendering and animations

---

### New Requirement: Context-Aware Properties Panel

**Status**: ✅ Completed

The PropertiesPanel should show only relevant properties based on the type of selected shape(s):

1. **For all shapes (basic properties):**
   - Stroke Color
   - Fill Color  
   - Stroke Width
   - Stroke Style
   - Opacity

2. **For text shapes only (text-specific properties):**
   - Font Size
   - Font Family
   - Font Weight (bold/normal)
   - Font Style (italic/normal)
   - Text Align
   - These should ONLY appear when a text shape is selected

3. **For image/audio shapes:**
   - No additional properties beyond basic

4. **Implementation approach:**
   - Determine the type of selected shape(s)
   - If single text shape selected: show basic + text properties
   - If single non-text shape selected: show basic properties only
   - If multiple shapes selected (mixed or same): show only shared applicable properties
   - If multiple text shapes selected: show basic + text properties

---

### Task 12: Fix Canvas Zoom with Mouse Wheel
**Status**: 🟡 In Progress
**Priority**: HIGH
**Description**: Add mouse wheel zoom support and fix zoom centering issues

**Acceptance Criteria**:
- Mouse wheel + Ctrl/Cmd should zoom in/out at cursor position
- Zoom should center on the mouse cursor, not the canvas center
- Smooth zoom transitions (animated zoom level changes)
- Maintain zoom limits: min 10%, max 500%
- Should work alongside existing zoom buttons
- Pan with mouse wheel (no modifier key) or middle-click drag

**Current State**:
- Zoom in/out/reset methods exist in `useCanvas.ts`
- Zoom only works via buttons, not mouse wheel
- Current zoom zooms from origin (0,0), not cursor position

**Implementation Details**:
1. Add `wheel` event listener to canvas container in `Canvas.tsx`
2. Check `event.ctrlKey` or `event.metaKey` for zoom gesture
3. Implement cursor-centered zoom math:
   ```
   const worldPos = screenToWorld(mousePos, camera);
   const newZoom = clamp(currentZoom * factor, 0.1, 5);
   const newCameraX = mousePos.x - worldPos.x * newZoom;
   const newCameraY = mousePos.y - worldPos.y * newZoom;
   ```
4. Add smooth animation for zoom changes using requestAnimationFrame
5. Mouse wheel without modifier = pan vertically (or horizontally with shift)
6. Middle-click drag to pan

**Files to Modify**:
- `src/components/Canvas.tsx` - Add wheel event handler, middle-click pan
- `src/hooks/useCanvas.ts` - Add cursor-centered zoom method
- `src/canvas/CanvasEngine.ts` - May need adjustment for zoom origins

**Files to Create**:
- `src/components/Canvas.zoom.test.tsx` - Test zoom behavior and cursor positioning

---

### Task 13: Add Zoom Level Display
**Status**: 🔴 Not Started
**Priority**: MEDIUM
**Description**: Show current zoom percentage in the zoom controls

**Acceptance Criteria**:
- Display current zoom level (e.g., "100%", "50%", "200%") in zoom controls
- Update in real-time as user zooms
- Click to reset zoom to 100%
- Clean, minimal design

**Files to Modify**:
- `src/components/ZoomControls.tsx` - Add zoom percentage display
- `src/components/ZoomControls.css` - Style the zoom display
