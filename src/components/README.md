# Components Directory

This directory contains all React UI components for the TLDraw Clone application.

## Overview

Components are organized by functionality:
- **Main UI**: Toolbar, Canvas, PropertiesPanel, ZoomControls
- **Dialogs**: ImageUploadDialog, AudioUploadDialog, EmbedDialog
- **Workspace**: WorkspaceTabs, WorkspaceTab
- **Utilities**: Tooltip

## Component Files

| Component | File | Purpose | Lines |
|-----------|------|---------|-------|
| Toolbar | `Toolbar.tsx` | Floating bottom toolbar with tools | ~120 |
| Canvas | `Canvas.tsx` | Main canvas rendering and interactions | ~923 |
| Tooltip | `Tooltip.tsx` | Hover tooltip with delay | ~50 |
| ZoomControls | `ZoomControls.tsx` | Zoom in/out/reset buttons | ~60 |
| PropertiesPanel | `PropertiesPanel.tsx` | Right sidebar for shape styling | ~400 |
| WorkspaceTabs | `WorkspaceTabs.tsx` | Tab bar for workspace switching | ~150 |
| WorkspaceTab | `WorkspaceTab.tsx` | Individual workspace tab | ~200 |
| EmbedDialog | `EmbedDialog.tsx` | Dialog for embedding content | ~150 |
| ImageUploadDialog | `ImageUploadDialog.tsx` | Dialog for uploading images | ~200 |
| AudioUploadDialog | `AudioUploadDialog.tsx` | Dialog for uploading audio | ~200 |

## Detailed Component Documentation

### Toolbar

**Purpose**: Floating bottom toolbar providing access to all drawing tools.

**Design**:
- Position: Fixed at bottom center
- Background: White with shadow and rounded corners
- Active tool: Filled blue (#2f80ed) with white icon
- Tooltips: Show tool name and keyboard shortcut on hover (300ms delay)

**Tools (in order)**:
1. Select (V)
2. Hand/Pan (H)
3. Pencil (D)
4. Eraser (E)
5. Arrow (A)
6. Text (T)
7. Rectangle (R)
8. Circle (C)
9. Line (L)
10. Image (I)
11. More (expandable menu)
    - Audio
    - Embed (B)

**Props**:
```typescript
interface ToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}
```

**Behavior**:
- Shows only icons (no text labels)
- Clicking tool calls `onToolChange`
- Active tool highlighted with filled background
- "More" button toggles additional tools
- Chevron icon rotates when expanded

**Success Criteria**:
- [ ] All 10 primary tools visible and clickable
- [ ] Active tool has correct styling
- [ ] Tooltips appear after 300ms hover
- [ ] Expand/collapse works smoothly
- [ ] Keyboard shortcuts shown in tooltips

**Constraints**:
- Fixed position at bottom center
- Icons must be 20x20px SVG
- Maximum 36x36px button size
- Mobile: smaller buttons (32x32px)

**Known Issues**:
- None currently

**Dependencies**:
- `Tooltip` component
- `ToolType` from types

---

### Canvas

**Purpose**: Main drawing surface handling all pointer interactions, rendering, and shape management.

**⚠️ WARNING**: This component is 923 lines - very large and complex. Consider refactoring into smaller components or hooks.

**Responsibilities**:
1. Render shapes using CanvasEngine
2. Handle pointer events (down/move/up) for drawing
3. Handle selection and dragging
4. Handle panning and zooming
5. Text editing with textarea overlay
6. Embed iframe overlays
7. Audio playback toggle
8. Double-click for text editing

**Props**:
```typescript
interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  shapes: Shape[];
  selectedIds: string[];
  tool: ToolType;
  style: ShapeStyle;
  camera: CameraState;
  isDragging: boolean;
  isDrawing: boolean;
  editingTextId: string | null;
  onShapeAdd: (shape: Shape) => void;
  onShapeUpdate: (id: string, updates: Partial<Shape>) => void;
  onShapeDelete: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
  onDraggingChange: (isDragging: boolean) => void;
  onDrawingChange: (isDrawing: boolean) => void;
  onPan: (dx: number, dy: number) => void;
  onZoomAt: (point: Point, factor: number) => void;
  screenToWorld: (point: Point) => Point;
  worldToScreen: (point: Point) => Point;
  onTextEditStart: (id: string) => void;
  onTextEditCommit: () => void;
  onTextEditCancel: () => void;
}
```

**Pointer Event Handling**:

1. **Pointer Down**:
   - Pan tool: Start panning
   - Select tool: Check for shape click, start drag or clear selection
   - Drawing tools (rectangle, circle, line, arrow, pencil): Start drawing
   - Eraser: Delete clicked shape
   - Text: Create text shape and start editing

2. **Pointer Move**:
   - Panning: Update camera position
   - Dragging: Update shape positions using pre-computed functions
   - Drawing: Update shape preview or add pencil points

3. **Pointer Up**:
   - Stop panning/dragging/drawing
   - Finalize shape if meaningful size (>5px)

**Text Editing**:
- Overlay textarea positioned over text shape
- Auto-resizes based on content
- Enter commits, Escape cancels
- Click outside commits

**Embed Overlays**:
- Positioned divs with iframes
- Drag handle at top
- Selection border
- Sandboxed iframe for security

**Performance Optimizations**:
- Pre-computed drag update functions stored in ref
- Debounced re-renders
- Separate refs for all mutable state

**Success Criteria**:
- [ ] All pointer interactions work smoothly
- [ ] Shapes render correctly with all styles
- [ ] Selection indicators visible
- [ ] Text editing works with proper positioning
- [ ] Embed overlays move correctly
- [ ] Audio toggle works
- [ ] 60fps during dragging/panning

**Constraints**:
- Uses native wheel event listener (not React onWheel)
- Coordinate transformation required for all operations
- Textarea position must match zoom level
- Embed iframes need pointer-events management

**Known Issues**:
- Very large component (923 lines) - hard to maintain
- Complex coordinate math for textarea positioning
- Audio elements not cleaned up on unmount
- Potential memory leak with drag update functions

**Dependencies**:
- CanvasEngine (rendering)
- All shape types
- ToolType

---

### Tooltip

**Purpose**: Reusable hover tooltip component with delay.

**Features**:
- 300ms delay before showing (configurable)
- Four positions: top, bottom, left, right
- Dark background with arrow pointing to target
- Fade-in animation
- Accessible (role="tooltip")

**Props**:
```typescript
interface TooltipProps {
  children: ReactNode;
  content: string;
  delay?: number;  // default: 300
  position?: 'top' | 'bottom' | 'left' | 'right';  // default: 'top'
}
```

**Usage**:
```tsx
<Tooltip content="Select (V)" position="top">
  <button>Select</button>
</Tooltip>
```

**Success Criteria**:
- [ ] Tooltip appears after delay on hover
- [ ] Tooltip disappears on mouse leave
- [ ] Animation is smooth
- [ ] Arrow points correctly for all positions
- [ ] Accessible to screen readers

**Constraints**:
- Parent must have position relative or similar
- Tooltip z-index must be higher than other elements
- Content should be short (single line preferred)

**Known Issues**:
- None currently

---

### ZoomControls

**Purpose**: Bottom-center zoom control buttons.

**Features**:
- Zoom in (+)
- Zoom out (-)
- Reset zoom (percentage display)

**Props**:
```typescript
interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}
```

**Success Criteria**:
- [ ] Buttons call correct handlers
- [ ] Zoom percentage displays correctly
- [ ] Positioned correctly over canvas

**Constraints**:
- Positioned absolutely at bottom center
- Must not overlap with toolbar

---

### PropertiesPanel

**Purpose**: Right sidebar for editing shape styles.

**Features**:
- Color picker (11 preset colors)
- Fill color picker
- Stroke width slider (1, 2, 4, 8, 12)
- Stroke style (solid, dashed, dotted)
- Fill style (none, solid, pattern)
- Opacity slider
- Font size (for text shapes)
- Font family
- Font weight/style
- Text alignment

**Props**:
```typescript
interface PropertiesPanelProps {
  style: ShapeStyle;
  onChange: (updates: Partial<ShapeStyle>) => void;
  hasTextSelection?: boolean;
}
```

**Success Criteria**:
- [ ] All style controls work
- [ ] Changes apply immediately to selected shapes
- [ ] Text-specific controls hidden for non-text shapes
- [ ] Panel animates in/out smoothly

**Constraints**:
- Fixed width (240px)
- Scrollable if content overflows
- Only visible when shapes selected

---

### WorkspaceTabs

**Purpose**: Tab bar for managing multiple workspaces.

**Features**:
- Display all workspaces as tabs
- Active tab highlighted
- Add new workspace button (max 10)
- Scrollable if too many tabs

**Props**:
```typescript
interface WorkspaceTabsProps {
  workspaces: Workspace[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  maxWorkspaces: number;
}
```

**Success Criteria**:
- [ ] All workspaces shown as tabs
- [ ] Active tab clearly indicated
- [ ] Can switch between workspaces
- [ ] Add button creates new workspace
- [ ] Respects max workspaces limit

**Constraints**:
- Maximum 10 workspaces
- Tabs have minimum width
- Horizontal scrolling for many tabs

---

### WorkspaceTab

**Purpose**: Individual workspace tab with rename/delete capabilities.

**Features**:
- Click to switch workspace
- Long-press (3s) or right-click for context menu
- Inline rename on double-click or menu option
- Delete option (if not last workspace)
- 15-character truncation with ellipsis
- Hover tooltip showing full name (after 3s)
- Circular progress indicator during long-press

**Props**:
```typescript
interface WorkspaceTabProps {
  workspace: Workspace;
  isActive: boolean;
  canDelete: boolean;
  onClick: () => void;
  onClose: () => void;
  onRename: (name: string) => void;
}
```

**Success Criteria**:
- [ ] Click switches workspace
- [ ] Long-press shows context menu
- [ ] Right-click shows context menu
- [ ] Rename works inline
- [ ] Delete removes workspace
- [ ] Cannot delete last workspace
- [ ] Tooltip shows full name
- [ ] Animation is smooth

**Constraints**:
- Name truncated at 15 characters
- Long-press requires 3 seconds
- Context menu must close on outside click
- Cannot delete if only one workspace

**Known Issues**:
- Context menu positioning can be tricky
- Long-press timing might feel slow to some users

---

### Dialogs (ImageUploadDialog, AudioUploadDialog, EmbedDialog)

**Purpose**: Modal dialogs for adding complex shapes that require external resources.

**Common Features**:
- Overlay backdrop
- Close button (X)
- Form validation
- Submit/cancel buttons
- Error display

**ImageUploadDialog**:
- File upload (drag & drop or click)
- URL input
- Preview image
- Size limits (max 300px width, auto-scaled)

**AudioUploadDialog**:
- File upload (audio files)
- Waveform preview
- Duration display
- Loop option

**EmbedDialog**:
- URL input
- YouTube vs website detection
- Embed preview
- Validation

**Success Criteria**:
- [ ] Dialogs open/close correctly
- [ ] Form validation prevents invalid input
- [ ] File uploads work
- [ ] URL inputs validated
- [ ] Previews shown before submit
- [ ] Cancel closes without action

**Constraints**:
- Modals block interaction with rest of app
- File size limits apply
- URL must be valid format

## Testing

Each component has corresponding test file:
- `ComponentName.test.tsx`

Run tests:
```bash
npm test -- ComponentName
```

## Adding New Components

1. Create `NewComponent.tsx`
2. Create `NewComponent.test.tsx`
3. Add to this README
4. Export from index if needed

## Styling

- Component-specific styles in `ComponentName.css` (if needed)
- Most styles in `App.css`
- Use CSS variables from `index.css` for consistency
