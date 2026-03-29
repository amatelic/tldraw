# TLDraw Clone - Fix and Enhancement Plan

## Issues Identified

### 1. **Stroke and Fill Color Not Working**

**Root Cause Analysis:**
Looking at `Canvas.tsx`, I can see:

- Line 211: `style: { ...styleRef.current }` - Shapes ARE copying the style when created
- Line 295: `styleRef.current` is passed to `createShapeFromPoints` for preview shapes
- The `styleRef` is properly updated via the useEffect on line 59-67

**Potential Issues:**

1. **Shape creation preview** - When creating shapes (rectangle, circle, line), the preview uses `styleRef.current` correctly
2. **Freehand shapes** - Line 211 uses `styleRef.current`
3. **Shape rendering** - CanvasEngine.ts properly applies `shape.style` to strokes and fills

**BUT** - Looking more carefully, I notice that when drawing rectangle/circle/line (NOT freehand), the shape is created in `handlePointerUp` at line 329 with `onShapeAdd(shape)` where `shape` is `currentShapeRef.current`. This preview shape is created in `handlePointerMove` at line 291-296 using `engine.createShapeFromPoints()`. The issue might be that `styleRef.current` is being used correctly, but the user might expect the style to be applied to existing shapes immediately when changed in the properties panel.

**Actually** - I think the real issue is that the PropertiesPanel works correctly for:

1. Setting the **default style** for new shapes
2. Applying style to **selected shapes** via the "Apply to Selection" button

But the user might expect:

- Real-time preview of color changes on selected shapes before clicking apply
- Or immediate application without the "Apply" button

Let me check the actual PropertiesPanel to see how it works...

Looking at PropertiesPanel.tsx:

- `onChange` updates the `shapeStyle` in editorState (sets default for new shapes)
- `onApply` applies current style to selected shapes
- This is the expected behavior - user must click "Apply to Selection"

**VERDICT:** The color system is working as designed, but UX could be improved. However, if it's truly not working, the bug might be in how the style prop is being passed.

**Wait** - Looking at line 21 in Canvas.tsx, the `style` prop is typed as `Shape['style']` which should be `ShapeStyle`. Let me check if there's a type mismatch...

Actually, looking at the Canvas component interface:

```typescript
style: Shape['style'];
```

This should work fine since `Shape` has a `style: ShapeStyle` property.

**REAL BUG FOUND:** Looking at `useCanvas.ts` line 282-300:

```typescript
const applyStyleToSelection = useCallback(() => {
  if (editorState.selectedShapeIds.length === 0) return;
  setPresent((prev) => {
    saveToHistory(prev.shapes, prev.editorState);
    return {
      ...prev,
      shapes: prev.shapes.map((shape) =>
        editorState.selectedShapeIds.includes(shape.id)
          ? {
              ...shape,
              style: { ...shape.style, ...prev.editorState.shapeStyle },
              updatedAt: Date.now(),
            }
          : shape
      ),
    };
  });
}, [editorState.selectedShapeIds, saveToHistory]);
```

**The issue is on line 293:** `...prev.editorState.shapeStyle` should be `...editorState.shapeStyle` (using the closure-captured `editorState` from the hook scope, not the `prev.editorState`). The `prev.editorState` inside the setPresent callback refers to the state at the time the update started, not the current `editorState` from the hook. Actually, this might be intentional to use the style at the moment "Apply" was clicked...

Actually, both should work since `setPresent` receives the previous state, but looking more carefully:

- `prev.editorState.shapeStyle` - This is the shapeStyle from the `present` state at the time setPresent is called
- `editorState.shapeStyle` - This is the shapeStyle from the current React state (might be stale in the callback)

Since `applyStyleToSelection` is called synchronously when the button is clicked, and `editorState` is a dependency of the useCallback, both should reference the same value. So this isn't the bug.

**The real bug:** Looking at line 300, the dependency array is `[editorState.selectedShapeIds, saveToHistory]` - it's MISSING `editorState.shapeStyle`! This means if the user changes the color and then clicks apply, the callback uses a stale `shapeStyle` value from when the component first rendered or when selectedShapeIds changed.

Wait, I already see on line 300 it says `}, [editorState.selectedShapeIds, saveToHistory]);` - but we removed `editorState.shapeStyle` in a previous edit to fix a lint warning. That was wrong!

**CONFIRMED BUG:** The `applyStyleToSelection` callback is missing `editorState.shapeStyle` from its dependency array, causing stale closure issues.

---

### 2. **Canvas Panning Already Exists but Can Be Enhanced**

Current implementation in Canvas.tsx:

- Line 168: Middle mouse button or Space+drag for panning
- Line 340-352: Mouse wheel pans (without Ctrl)

**Enhancement Opportunities:**

- Add pan tool button to toolbar
- Add spacebar + drag (already exists)
- Add hand/grab cursor when panning
- Make panning smoother

---

### 3. **Image/Audio Support**

Need to add:

- New shape types: `image` and `audio`
- File upload mechanism
- Image rendering on canvas
- Audio playback controls

---

## Implementation Plan

### Phase 1: Fix Color/Styling Bugs

1. **Fix `applyStyleToSelection` dependency array** in `useCanvas.ts`
   - Add `editorState.shapeStyle` back to dependency array

2. **Verify style propagation** in Canvas component
   - Ensure `styleRef.current` is always up to date
   - Add debug logging if needed

3. **Test all shape types** with colors

### Phase 2: Enhance Panning

1. **Add Pan Tool to Toolbar**
   - Add 'pan' tool type
   - Add hand icon to toolbar
   - Update cursor to grab/grabbing

2. **Improve Pan UX**
   - Add visual feedback
   - Ensure smooth panning

### Phase 3: Add Image Support

1. **Update Types**
   - Add `ImageShape` type
   - Add image tool type

2. **Add File Upload**
   - Create file input component
   - Handle image loading
   - Store image data (Base64 or URL)

3. **Render Images**
   - Update CanvasEngine to draw images
   - Handle image bounds and selection

4. **Add Toolbar Button**
   - Image tool button
   - File picker trigger

### Phase 4: Add Audio Support

1. **Update Types**
   - Add `AudioShape` type
   - Add audio tool type

2. **Add File Upload**
   - Audio file picker
   - Store audio data

3. **Audio Playback**
   - Render audio icon on canvas
   - Play/pause controls
   - Selection and deletion

4. **Add Toolbar Button**
   - Audio tool button

---

## Questions for User

1. **Color Application UX:** Do you want colors to apply immediately to selected shapes (without clicking "Apply to Selection"), or is the current behavior okay?

2. **Images:** Should images be:
   - Stored as Base64 in the document (larger files, self-contained)
   - Stored as URLs (smaller, but requires hosting)
   - Both options?

3. **Audio:**
   - Should audio auto-play when added?
   - Should there be a visual waveform or just an icon?
   - Should audio be positioned like shapes (movable) or be global?

4. **Panning:** Is the current middle-mouse/space+drag sufficient, or do you want a dedicated pan tool button?

---

## Technical Details

### Files to Modify

1. `src/hooks/useCanvas.ts` - Fix dependency array, add image/audio logic
2. `src/types/index.ts` - Add ImageShape and AudioShape types
3. `src/canvas/CanvasEngine.ts` - Add render methods for images/audio
4. `src/components/Canvas.tsx` - Handle image/audio upload and rendering
5. `src/components/Toolbar.tsx` - Add pan, image, audio tools
6. `src/App.tsx` - Wire up new functionality
7. `src/App.css` - Add styles for new features

### New Dependencies Needed

None for basic image/audio support using native APIs.

### Estimated Time

- Phase 1 (Fix colors): 30 minutes
- Phase 2 (Enhance panning): 30 minutes
- Phase 3 (Image support): 2-3 hours
- Phase 4 (Audio support): 2 hours
- **Total: 5-6 hours**

---

## Priority

**HIGH:** Fix color/stroke bugs - these are breaking features
**MEDIUM:** Image support - major feature addition
**LOW:** Audio support - nice to have
**LOW:** Panning enhancements - already works
