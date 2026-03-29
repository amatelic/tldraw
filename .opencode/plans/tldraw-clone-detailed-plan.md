# TLDraw Clone - Implementation Plan (Updated)

## User Requirements Summary

1. **Colors**: Apply immediately to selected shapes when color is clicked
2. **Images**: Support both Base64 and URL storage types
3. **Audio**: Show visual waveform, movable like shapes
4. **Panning**: Add hand tool button + keyboard shortcut
5. **Keyboard**: Refactor for easier key management and additions

---

## Phase 1: Fix Colors - Immediate Application

### Changes to `useCanvas.ts`

- Remove "Apply to Selection" button logic
- Modify `updateShapeStyle` to also apply to selected shapes immediately
- Remove dependency array issues by refactoring state management

### Changes to `PropertiesPanel.tsx`

- Remove "Apply to Selection" button
- Simplify UI - colors apply immediately

---

## Phase 2: Keyboard System Refactor

### New File: `src/hooks/useKeyboard.ts`

Create centralized keyboard management:

```typescript
interface KeyboardAction {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
  handler: () => void;
  description: string;
}

const defaultShortcuts: KeyboardAction[] = [
  { key: 'z', modifiers: { ctrl: true }, handler: undo, description: 'Undo' },
  { key: 'y', modifiers: { ctrl: true }, handler: redo, description: 'Redo' },
  { key: 'Delete', handler: deleteSelected, description: 'Delete selected' },
  { key: 'v', handler: () => setTool('select'), description: 'Select tool' },
  { key: 'r', handler: () => setTool('rectangle'), description: 'Rectangle tool' },
  { key: 'c', handler: () => setTool('circle'), description: 'Circle tool' },
  { key: 'l', handler: () => setTool('line'), description: 'Line tool' },
  { key: 'f', handler: () => setTool('freehand'), description: 'Freehand tool' },
  { key: 'e', handler: () => setTool('eraser'), description: 'Eraser tool' },
  { key: 'h', handler: () => setTool('pan'), description: 'Pan tool' }, // NEW
  { key: 'i', handler: () => setTool('image'), description: 'Image tool' }, // NEW
  { key: 'a', handler: () => setTool('audio'), description: 'Audio tool' }, // NEW
  { key: 'Escape', handler: clearSelection, description: 'Clear selection' },
];
```

### Changes to `App.tsx`

- Replace inline keyboard handling with `useKeyboard` hook
- Export shortcut configuration for UI display

---

## Phase 3: Add Pan Tool

### Changes to `src/types/index.ts`

```typescript
export type ToolType =
  | 'select'
  | 'pan'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'freehand'
  | 'eraser'
  | 'image'
  | 'audio';
```

### Changes to `Toolbar.tsx`

- Add hand/pan tool button
- Icon: open hand or grab hand
- Tooltip: "Pan (H)"

### Changes to `Canvas.tsx`

- Add 'pan' tool handling
- Change cursor to grab/grabbing when pan tool active
- Support both: dedicated pan tool AND middle-mouse/space+drag (existing)

### Changes to `App.css`

- Add grab/grabbing cursor styles

---

## Phase 4: Image Support (Base64 + URL)

### Changes to `src/types/index.ts`

```typescript
export interface ImageShape extends BaseShape {
  type: 'image';
  src: string; // Can be Base64 data URL or external URL
  originalWidth: number;
  originalHeight: number;
  isBase64: boolean; // Track storage type
}

export type Shape =
  | RectangleShape
  | CircleShape
  | LineShape
  | FreehandShape
  | ImageShape
  | AudioShape;
```

### New Component: `ImageUploadDialog.tsx`

Modal dialog with two tabs/options:

1. **Upload File**: File picker → converts to Base64
2. **External URL**: Text input for image URL

### Changes to `CanvasEngine.ts`

```typescript
private drawImage(shape: ImageShape) {
  const img = new Image();
  img.onload = () => {
    this.ctx.drawImage(img, shape.bounds.x, shape.bounds.y, shape.bounds.width, shape.bounds.height);
  };
  img.src = shape.src;
}
```

### Changes to `Canvas.tsx`

- Handle image tool selection
- Show upload dialog
- Create ImageShape on file/URL select

### Changes to `Toolbar.tsx`

- Add image tool button
- Icon: picture/image icon
- Tooltip: "Image (I)"

---

## Phase 5: Audio Support with Waveform

### Changes to `src/types/index.ts`

```typescript
export interface AudioShape extends BaseShape {
  type: 'audio';
  src: string; // Base64 or URL
  duration: number;
  isPlaying: boolean;
  waveformData: number[]; // Normalized amplitude data for visualization
  isBase64: boolean;
}
```

### New Utility: `src/utils/audioProcessor.ts`

```typescript
export async function extractWaveform(audioSrc: string): Promise<number[]> {
  // Use Web Audio API to decode audio and extract waveform data
  // Return array of normalized values (0-1) for visualization
}
```

### Changes to `CanvasEngine.ts`

```typescript
private drawAudio(shape: AudioShape) {
  const { x, y, width, height } = shape.bounds;

  // Draw waveform
  this.ctx.fillStyle = shape.style.color;
  const barWidth = width / shape.waveformData.length;

  shape.waveformData.forEach((amplitude, i) => {
    const barHeight = amplitude * height;
    const barX = x + i * barWidth;
    const barY = y + (height - barHeight) / 2;
    this.ctx.fillRect(barX, barY, barWidth - 1, barHeight);
  });

  // Draw play/pause indicator
  if (shape.isPlaying) {
    // Draw pause icon
  } else {
    // Draw play icon
  }
}
```

### New Component: `AudioUploadDialog.tsx`

Similar to image dialog - upload file or enter URL

### Changes to `Canvas.tsx`

- Handle audio tool
- Show upload dialog
- Generate waveform data
- Handle click to play/pause

### Changes to `Toolbar.tsx`

- Add audio tool button
- Icon: speaker/audio icon
- Tooltip: "Audio (A)"

---

## Phase 6: Selection Handling for New Types

### Changes to `Canvas.tsx`

Update `isPointInShape` function:

```typescript
const isPointInShape = (point: Point, shape: Shape): boolean => {
  switch (shape.type) {
    // ... existing cases ...
    case 'image':
    case 'audio':
      return (
        point.x >= shape.bounds.x &&
        point.x <= shape.bounds.x + shape.bounds.width &&
        point.y >= shape.bounds.y &&
        point.y <= shape.bounds.y + shape.bounds.height
      );
  }
};
```

---

## File Changes Summary

### Modified Files:

1. `src/types/index.ts` - Add ImageShape, AudioShape, update ToolType
2. `src/hooks/useCanvas.ts` - Fix colors, add image/audio logic
3. `src/hooks/useKeyboard.ts` - NEW: Centralized keyboard management
4. `src/canvas/CanvasEngine.ts` - Add drawImage, drawAudio methods
5. `src/components/Canvas.tsx` - Handle new tools, file uploads
6. `src/components/Toolbar.tsx` - Add pan, image, audio buttons
7. `src/components/PropertiesPanel.tsx` - Remove apply button
8. `src/App.tsx` - Use new keyboard hook, wire up dialogs
9. `src/App.css` - Add new styles

### New Files:

1. `src/hooks/useKeyboard.ts` - Keyboard shortcut management
2. `src/components/ImageUploadDialog.tsx` - Image upload modal
3. `src/components/AudioUploadDialog.tsx` - Audio upload modal
4. `src/utils/audioProcessor.ts` - Waveform extraction utility

---

## Keyboard Shortcuts (Refactored)

| Key            | Action            | Tool      |
| -------------- | ----------------- | --------- |
| `V`            | Select tool       | Select    |
| `H`            | Pan tool          | Pan       |
| `R`            | Rectangle tool    | Rectangle |
| `C`            | Circle tool       | Circle    |
| `L`            | Line tool         | Line      |
| `F`            | Freehand tool     | Freehand  |
| `E`            | Eraser tool       | Eraser    |
| `I`            | Image tool        | Image     |
| `A`            | Audio tool        | Audio     |
| `Ctrl+Z`       | Undo              | -         |
| `Ctrl+Y`       | Redo              | -         |
| `Delete`       | Delete selected   | -         |
| `Escape`       | Clear selection   | -         |
| `Space`        | Pan (hold + drag) | -         |
| `Middle Mouse` | Pan               | -         |

---

## Implementation Order

1. **Keyboard Refactor** (30 min)
   - Create useKeyboard hook
   - Update App.tsx
   - Test all existing shortcuts

2. **Fix Colors** (15 min)
   - Modify updateShapeStyle to apply immediately
   - Remove apply button
   - Test with all shape types

3. **Pan Tool** (30 min)
   - Add to types
   - Add toolbar button
   - Add keyboard shortcut
   - Test panning

4. **Image Support** (2 hours)
   - Add ImageShape type
   - Create upload dialog
   - Add drawImage to CanvasEngine
   - Add toolbar button
   - Test both Base64 and URL

5. **Audio Support** (2 hours)
   - Add AudioShape type
   - Create audio processor
   - Create upload dialog
   - Add drawAudio to CanvasEngine
   - Add playback controls
   - Add toolbar button
   - Test waveform visualization

**Total Estimated Time: 5-6 hours**

---

## Questions/Confirmations

1. **Audio Waveform Detail**: How many bars should the waveform show? (suggested: 50-100 for good visual)

2. **Image Resizing**: Should images be resizable after placement? (recommended: yes)

3. **Audio Playback**: Should audio loop, or play once? (recommended: configurable, default once)

4. **File Size Limits**: Any limits on Base64 image/audio sizes? (recommended: 5MB max)

5. **Waveform Generation**: Should we cache waveform data, or regenerate on each render? (recommended: cache in shape)
