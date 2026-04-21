# Components Directory

This directory contains all React UI components for the TLDraw Clone application.

## Overview

Components are organized by functionality:
- **Main UI**: Toolbar, Canvas, PropertiesPanel, ZoomControls
- **Agent UI**: AgentPanel
- **Dialogs**: ImageUploadDialog, AudioUploadDialog, EmbedDialog
- **Workspace**: WorkspaceTabs, WorkspaceTab
- **Resilience**: ErrorBoundary
- **Utilities**: Tooltip, ColorPicker, selectedInspectorItems

## Component Files

| Component | File | Purpose | Lines |
|-----------|------|---------|-------|
| Toolbar | `Toolbar.tsx` | Floating bottom toolbar with tools | ~120 |
| Canvas | `Canvas.tsx` | Main canvas rendering and interactions | ~1050 |
| AgentPanel | `AgentPanel.tsx` | Sidebar-first agent composer with inline results and expanded diagram preview | ~560 |
| ErrorBoundary | `ErrorBoundary.tsx` | App-level crash boundary with retry and refresh actions | ~150 |
| Tooltip | `Tooltip.tsx` | Hover tooltip with delay | ~50 |
| ZoomControls | `ZoomControls.tsx` | Zoom in/out/reset buttons | ~60 |
| PropertiesPanel | `PropertiesPanel.tsx` | Right sidebar for selection styling and multi-select metadata | ~430 |
| WorkspaceTabs | `WorkspaceTabs.tsx` | Tab bar for workspace switching | ~150 |
| WorkspaceTab | `WorkspaceTab.tsx` | Individual workspace tab | ~200 |
| ColorPicker | `ColorPicker.tsx` | Color picker with HSL gradient and sliders | ~300 |
| SelectedInspectorItems | `selectedInspectorItems.ts` | Pure helper for multi-select inspector metadata rows | ~60 |
| EmbedDialog | `EmbedDialog.tsx` | Dialog for embedding content | ~150 |
| ImageUploadDialog | `ImageUploadDialog.tsx` | Dialog for uploading images | ~200 |
| AudioUploadDialog | `AudioUploadDialog.tsx` | Dialog for uploading audio | ~200 |

## Detailed Component Documentation

### ErrorBoundary

**Purpose**: Catch unexpected render failures at the application shell level so the whole editor does not disappear into a blank screen.

**Behavior**:
- Renders children normally when no error is thrown
- Switches to a user-friendly fallback when any descendant render crashes
- Shows the captured error message in an alert block
- Exposes `Retry` to reset the boundary locally
- Exposes `Refresh` to reload the app or call an injected refresh handler in tests

**Integration**:
- Mounted around `App` in `src/main.tsx`
- Designed to protect the editor shell rather than individual widget-level failures

**Success Criteria**:
- [ ] App bootstrap is wrapped in an error boundary
- [ ] Crashes render a helpful fallback instead of a blank screen
- [ ] Retry can recover if the next render succeeds
- [ ] Refresh offers a clean restart path

**Known Issues**:
- Boundary fallback is intentionally app-wide; it does not yet isolate failures to smaller feature zones

**Dependencies**:
- None beyond React's class-based error boundary lifecycle

---

### AgentPanel

**Purpose**: Right-sidebar workflow surface for canvas-aware agent features with an expanded preview sheet for rich diagram drafts.

**Current Workflows**:
- Review Mode
- Cleanup Suggestions
- Selection Rewrite
- Diagram Generator

**Sidebar-First Interaction Model**:
- Agent now mounts in the same right-side shell family as the inspector instead of opening as a centered modal
- Compose state stays compact: workflow chips, scope summary, prompt, and only the most relevant setup controls stay visible
- Diagram-specific extras are progressively disclosed behind a `Show setup details` toggle
- Review and selection-rewrite results render inline inside the sidebar so the canvas stays visible while the user iterates
- Diagram generation opens a larger preview sheet only after a draft is ready, so rich output no longer competes with setup controls in one column

**Selection Rewrite UI**:
- Workflow chip enables only when the current selection includes at least one text shape
- Context locks to `Selection` because this pass only rewrites the current text selection
- Prompt accepts a short rewrite intent such as clarifying or shortening labels
- Preview shows before/after text changes inline in the sidebar
- Apply action updates the targeted text shapes in one undoable batch
- Helpful validation message appears if the workflow is requested without text-capable shapes selected

**Cleanup Suggestions UI**:
- Workflow runs locally through deterministic cleanup rules so it is always available
- Prompt is optional and acts as focus guidance rather than free-form chat
- Preview renders inline inside the sidebar with one row per proposed cleanup action
- Each row shows:
  - the affected shape label
  - whether the action is an update or delete
  - the fields being changed
- Users can select or deselect individual cleanup actions before apply
- Delete actions require explicit confirmation before `Apply selected` or `Apply all` becomes available
- Both apply paths reuse the grouped mutation flow, so cleanup lands on the canvas as one undoable change

**Diagram Generator UI**:
- Compact preset options for common work-diagram formats
- Audience and presentation-goal fields tucked into setup details instead of always-on cards
- Starter examples for backend architecture and storyboard prompts inside the setup details section
- Full-board context lock for first-pass generation
- Preview summary stays visible above the detailed sections and shows planned node/connector counts
- Starter-example regressions now lock the expected preview experience for:
  - messaging app backend architecture
  - storytelling storyboard
- Preview opens in an expanded sheet for:
  - diagram sections
  - planned nodes
  - planned connectors
  - warnings
  - presentation brief details and list-based talk-track content
- Apply action sends the approved draft onto the canvas and closes back to the board on success
- Apply errors surface inside the preview sheet without discarding the generated draft

**Success Criteria**:
- [ ] Agent opens as a compact right-sidebar composer instead of a centered modal
- [ ] Diagram setup uses progressive disclosure instead of showing every option at once
- [ ] Selection Rewrite only becomes available when selected text exists
- [ ] Selection Rewrite stays scoped to the current selection
- [ ] Selection Rewrite previews before/after text before apply
- [ ] Selection Rewrite applies successfully and closes back to the board
- [ ] Review and rewrite results stay inline in the sidebar
- [ ] Diagram Generator appears as a distinct workflow, not generic chat UI
- [ ] Context locks to full board for diagram generation
- [ ] Presets and starter examples populate the prompt scaffolding
- [ ] Generated diagrams open in a larger preview surface before apply
- [ ] Approved drafts can be applied from preview without leaving the panel in a broken state
- [ ] Cleanup Suggestions previews proposed actions inline before apply
- [ ] Cleanup Suggestions supports selected-only apply as well as apply-all
- [ ] Cleanup delete actions require explicit confirmation
- [ ] Cleanup Suggestions applies in one undoable mutation batch
- [ ] Review Mode behavior remains unchanged

**Known Issues**:
- Diagram generation is still full-board only in the first release
- Live diagram generation depends on a reachable OpenCode server; if it is unavailable, the UI falls back to the deterministic mock transport and shows a warning in the draft preview
- Rectangle and circle node labels are applied as separate text shapes because the canvas primitives do not yet support inline text
- Applied connector endpoints are static; moving nodes later does not auto-reroute the generated arrows/lines
- Presentation briefs remain session-level preview content and are not yet persisted into workspace data

**Dependencies**:
- `AgentOrchestrator`
- `types/agents.ts`

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

**⚠️ WARNING**: This component is ~1050 lines - very large and complex. Consider refactoring into smaller components or hooks.

**Responsibilities**:
1. Render shapes using CanvasEngine
2. Handle pointer events (down/move/up) for drawing
3. Handle single selection, additive multi-selection, marquee selection, and dragging
4. Handle panning and zooming
5. Text editing with textarea overlay
6. Embed iframe overlays
7. Audio playback toggle
8. Double-click for text editing
9. Right-click context menu for selection actions
10. Render combined multi-selection and marquee feedback overlays

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
  onDeleteSelected: () => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
}
```

**Pointer Event Handling**:

1. **Pointer Down**:
   - Pan tool: Start panning
   - Select tool: single-click selects, `Shift + Click` toggles top-level entities, dragging a selected entity moves the full current selection, and dragging from empty canvas starts marquee selection
   - Drawing tools (rectangle, circle, line, arrow, pencil): Start drawing
   - Eraser: Delete clicked shape
   - Text: Create a text shape, select it, and immediately enter edit mode while keeping the text tool active for repeated placement

2. **Pointer Move**:
   - Panning: Update camera position
   - Marquee selection: Update the live selection rectangle
   - Dragging: Update shape positions using pre-computed functions
   - Drawing: Update shape preview or add pencil points

3. **Pointer Up**:
   - Stop panning/dragging/drawing
   - Commit marquee selection when active
   - Finalize shape if meaningful size (>5px)

4. **Context Menu**:
   - Right-clicking a shape opens a lightweight selection menu
   - Right-clicking an unselected shape selects it before opening the menu
   - Right-clicking an already selected shape preserves the current selection
   - Menu actions currently include delete, group/ungroup, bring to front, and send to back
   - Menu closes on outside click, Escape, tool changes, or when selection clears

**Selection Model**:
- Child shapes inside groups resolve to their top-level group for canvas selection
- `Shift + Click` adds or removes top-level entities from the current selection
- Empty-canvas drag creates a marquee that selects intersecting top-level entities
- `Shift + drag` adds marquee hits to the existing selection
- Multi-selection keeps per-shape outlines and adds a combined selection frame without per-shape resize handles
- `Space + drag`, middle click, and the pan tool all pan the board; `Shift + drag` is reserved for additive marquee selection

**Text Editing**:
- Overlay textarea positioned over text shape
- Auto-resizes based on content
- Enter commits, Escape cancels
- Click outside commits

**Embed Overlays**:
- Positioned divs with iframes
- Drag handle at top
- Eight resize handles on the selected embed (corners + edges)
- Selection border
- Sandboxed iframe for security

**Performance Optimizations**:
- Pre-computed drag update functions stored in ref
- Debounced re-renders
- Separate refs for all mutable state
- Uses `useElementSize` to react to app-shell and layout resizes, not just browser window resizes

**Success Criteria**:
- [ ] All pointer interactions work smoothly
- [ ] Shapes render correctly with all styles
- [ ] Selection indicators visible
- [ ] `Shift + Click` supports additive multi-selection
- [ ] Empty-canvas drag creates marquee selection
- [ ] Multi-selection shows a combined frame without a wall of resize handles
- [ ] Text editing works with proper positioning
- [ ] Right-click menu exposes core selection actions without breaking drag/draw flows
- [ ] Embed overlays move correctly
- [ ] Embed overlays resize correctly from corners and edges
- [ ] Audio toggle works
- [ ] 60fps during dragging/panning

**Constraints**:
- Uses native wheel event listener (not React onWheel)
- Coordinate transformation required for all operations
- Textarea position must match zoom level
- Embed iframes need pointer-events management
- Embed resize handles clamp to a minimum frame of 160x120 world units
- Select-mode `Shift + drag` is reserved for additive marquee selection, not panning

**Known Issues**:
- Very large component (~1050 lines) - hard to maintain
- Complex coordinate math for textarea positioning
- Audio elements not cleaned up on unmount
- Potential memory leak with drag update functions

**Dependencies**:
- CanvasEngine (rendering)
- All shape types
- ToolType
- `useElementSize` hook for resize-driven canvas refresh

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

### ColorPicker

**Purpose**: Reusable floating color picker with a tactile, inspector-style workflow for custom and preset colors.

**Design**:
- Centered popover header with close control and optional eyedropper
- Segmented "Custom / Variables" tab strip with working preset swatches
- Large saturation/lightness field with refined hue and alpha sliders
- Switchable HSLA, RGBA, and Hex numeric formats styled like native design-tool controls
- Light-only theme styling via local CSS variables

**Features**:
- Real-time color preview
- Interactive gradient picker for saturation and lightness
- Hue and alpha sliders with drag handles
- Input validation for HSLA, RGBA, and Hex values
- Preset variable swatches for common inspector colors
- Optional embedded fill-gradient editor with Solid, Linear, and Rounded modes
- Gradient stop switching plus inline angle control for linear fills
- Browser-supported eyedropper API integration
- Full keyboard accessibility

**Props**:
```typescript
interface ColorPickerProps {
  color: string;
  alpha?: number;
  onChange: (color: string, alpha: number) => void;
  onClose?: () => void;
  showAlpha?: boolean;
  variables?: ColorPickerVariable[];
  allowGradient?: boolean;
  gradientValue?: FillGradient | null;
  onGradientChange?: (gradient: FillGradient | null) => void;
}
```

**Usage**:
```tsx
<ColorPicker 
  color="#FF5733" 
  alpha={1}
  onChange={(newColor, nextAlpha) => setStrokeColor(newColor, nextAlpha)} 
/>
```

**Success Criteria**:
- [ ] HSL gradient picker allows selecting any color
- [ ] Hue slider adjusts color hue smoothly
- [ ] Alpha slider adjusts transparency (0-100%)
- [ ] Hex input accepts valid hex colors and updates picker
- [ ] HSL inputs accept valid HSL values and update picker
- [ ] RGBA inputs accept valid values and update picker
- [ ] Hex mode remains available from the format switcher
- [ ] Variables tab applies preset swatches
- [ ] Embedded gradient controls can switch between solid, linear, and rounded fills
- [ ] Gradient stop edits update the active stop without leaving the picker
- [ ] Header actions remain accessible in supported browsers
- [ ] Eyedropper works in supported browsers
- [ ] All inputs are keyboard accessible

**Constraints**:
- Eyedropper requires browser support (Chrome/Edge 95+)
- Preset variables currently ship from the component's default swatch list unless custom variables are passed in
- Gradient editing is opt-in and only appears when `allowGradient` and `onGradientChange` are provided
- Minimum picker size for touch interactions (300px width recommended)
- Must handle invalid input gracefully

**Known Issues**:
- Eyedropper not supported in Firefox or Safari
- Touch interactions on mobile may need optimization
- Variables are local picker presets, not persisted design tokens yet

**Dependencies**:
- CSS variables from `index.css` for theming
- Browser EyeDropper API (optional)

---

### ZoomControls

**Purpose**: Floating zoom control buttons layered over the full-viewport canvas.

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
- [ ] Positioned correctly over the canvas without shrinking the drawing surface

**Constraints**:
- Positioned as floating chrome over the canvas
- Must avoid the floating toolbar and inspector on common viewport sizes

---

### PropertiesPanel

**Purpose**: Floating right-hand inspector for editing selection layout, styling, typography, color, and effects without reducing canvas width or height.

**Design**:
- Floating inspector shell with rounded surfaces and compact section rhythm
- Collapsible sections with light metadata summaries in the header
- Inline stroke/fill color cards with floating ColorPicker popovers
- Compact typography and control groups inspired by modern design inspectors
- Container-relative overlay treatment so the canvas remains full-size even inside a resizable embed host

**Features**:
- **Selected Items Section**:
  - Appears only for multi-select states above the layout section
  - Lists the current top-level selected entities in back-to-front layer order
  - Each row shows the user-facing type label, `L{layerIndex}` badge, and a read-only group hierarchy breadcrumb
  - Uses tighter row spacing so longer multi-select lists stay scannable without overwhelming the panel
  - Uses generic hierarchy labels such as `Ungrouped`, `Top level`, and `Group > Group` instead of raw ids
- **Layout Section**:
  - Live position and size readouts from the selected shape or combined multi-select frame
  - Single selected frame-like shapes can edit X, Y, W, and H directly from the inspector inputs
  - Multi-select align, distribute, tidy, and group actions
  - Single selected groups expose an ungroup action in the same section
- **Style Section**: 
  - Stroke width chooser with three compareable picker treatments: Visual, Slider, and Compact
  - All picker variants target the same discrete widths (1, 2, 4, 8, 12) so UI exploration does not change canvas behavior
  - Stroke style segmented control (solid, dashed, dotted)
  - Fill style segmented control (none, solid, pattern)
  - Opacity slider with inline percentage readout
  - Blend mode selector (16 blend modes)
- **Type Section** (for text shapes):
  - Font family and size
  - Weight, emphasis, and alignment controls
- **Color Section**:
  - Separate stroke and fill rows with current hex values
- Reduced quick swatch palette for both stroke and fill to keep the inspector calmer
- Section-level custom ColorPicker opens in a floating portal anchored to the trigger, and the portal stays inside the `.app` shell when the board is embedded
- Fill color opens the same ColorPicker with embedded solid/linear/rounded gradient controls, so stop editing stays in one place
- **Effects Section**: 
- Multiple shadows with individual controls (X offset, Y offset, Blur, Color, Opacity)
- Shadow ColorPicker uses the same floating portal so the picker layout stays stable even when the inspector is narrow
  - Add/remove shadow buttons
  - Empty state prompt when no shadows exist

**Collapsible Sections**:
- Each section can be expanded/collapsed independently
- State persists during panel visibility
- Headers show lightweight metadata (selection size, current blend mode, active color)

**Theming**:
- Uses local CSS variables in the component stylesheet for the inspector palette
- Dark mode is temporarily disabled so the inspector and picker always use the light palette
- Shares scroll container behavior with the app shell via `App.css`
- On narrow shells the floating desktop panel collapses toward a bottom-sheet overlay via container queries, so embed resizes behave like viewport resizes

**Props**:
```typescript
interface PropertiesPanelProps {
  style: ShapeStyle;
  onChange: (updates: Partial<ShapeStyle>) => void;
  layoutBounds?: Bounds | null;
  onLayoutBoundsChange?: (bounds: Partial<Bounds>) => void;
  hasTextSelection?: boolean;
  selectedItems?: SelectedInspectorItem[];
  onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute?: (axis: 'horizontal' | 'vertical') => void;
  onTidy?: () => void;
  selectedCount?: number;
  onGroup?: () => void;
  onUngroup?: () => void;
  canGroup?: boolean;
  canUngroup?: boolean;
}
```

**Shadow Controls**:
When a shape supports shadows (rectangles, circles, lines, arrows, pencil strokes):
- **Shadow List**: Each shadow displayed with controls
- **X Offset**: Horizontal shadow displacement (-50 to 50 pixels)
- **Y Offset**: Vertical shadow displacement (-50 to 50 pixels)
- **Blur**: Shadow blur radius (0 to 50 pixels)
- **Color**: Shadow color picker with ColorPicker integration
- **Opacity**: Shadow transparency slider (0-100%)
- **Add Shadow**: Button to add new shadow to the list
- **Remove Shadow**: Button to remove individual shadows

**Supported Shadow Shapes**:
- Rectangles and circles (fill + stroke shadows)
- Lines and arrows (stroke-only shadows)
- Pencil/freehand drawings (stroke-only shadows)
- Images, audio, text, and embeds (shadows not supported)

**Success Criteria**:
- [ ] All style controls work and apply immediately
- [ ] Changes apply immediately to selected shapes
- [ ] Stroke width picker can switch between the three comparison layouts without losing functionality
- [ ] Layout X/Y/W/H reflects the current selected frame bounds
- [ ] Layout X/Y/W/H edits update single selected frame-like shapes on blur or Enter
- [ ] Text-specific controls hidden for non-text shapes
- [ ] Panel animates in/out smoothly
- [ ] Sections can be collapsed/expanded independently
- [ ] ColorPicker integration works for all color inputs
- [ ] ColorPicker width stays stable regardless of inspector/sidebar width
- [ ] Fill ColorPicker updates solid, linear, and rounded backgrounds immediately
- [ ] Blend mode selector shows all 16 options
- [ ] Multiple shadows can be added and configured
- [ ] Shadow X/Y inputs work from negative to positive offsets
- [ ] Shadow blur input works from 0 upward
- [ ] Shadow opacity slider works from 0 to 100%
- [ ] Add shadow button creates new shadow with defaults
- [ ] Remove shadow button deletes individual shadows
- [ ] Multi-select arrange actions remain available
- [ ] Multi-select inspector shows selected items with type, layer index, and hierarchy metadata
- [ ] Group and ungroup actions appear in the layout section when selection state allows them
- [ ] Dark mode displays correctly with component tokens
- [ ] Panel is scrollable when content overflows

**Constraints**:
- Fixed width (240px)
- Scrollable if content overflows
- Only visible when shapes selected
- CSS variables must be defined in `index.css`
- Minimum 4 sections (Layout, Style, Opacity, Effects)
- Floating picker placement assumes the board is rendered inside the `.app` shell; it falls back to `document.body` in isolated tests or standalone mounts
- Direct layout editing is intentionally limited to single selected rectangle, image, audio, text, and embed shapes; multi-select and other geometry types remain read-only

**Known Issues**:
- None currently

**Dependencies**:
- `ColorPicker` component for color selection
- `selectedInspectorItems.ts` for multi-select metadata shaping
- CSS variables from `index.css`

---

### WorkspaceTabs

**Purpose**: Tab bar for managing multiple workspaces.

**Features**:
- Display all workspaces as tabs
- Active tab highlighted with the same soft-surface visual language used by the redesigned inspector
- Add new workspace button (max 10)
- Scrollable if too many tabs
- Inline validation feedback for rename failures in the visible rail and hidden-workspace overflow menu
- Switches to a compact overflow UI once the count exceeds 6 workspaces so the add button remains visible
- Keeps the first 5 workspaces pinned in the rail and moves the remaining ones into an overflow menu
- Hidden workspaces can still be switched, renamed, and closed from the overflow menu
- Rounded workspace rail shell that matches the header chrome redesign in `src/App.css`
- Rendered inside a floating header shell so the canvas can stay full-viewport
- Shares a single desktop row with the floating header action pills
- The previous standalone app title row has been removed to keep the floating header compact
- Uses softer add/remove/layout motion and roomier internal spacing for the tab pills and add button
- Active workspace state is carried by a shared moving pill, so tab switching feels spatially connected instead of abruptly recolored

**Props**:
```typescript
interface WorkspaceTabsProps {
  workspaces: Workspace[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => WorkspaceRenameResult;
  maxWorkspaces: number;
}
```

**Success Criteria**:
- [ ] All workspaces shown as tabs
- [ ] Active tab clearly indicated
- [ ] Can switch between workspaces
- [ ] Add button creates new workspace
- [ ] Respects max workspaces limit
- [ ] Overflow trigger appears after the 6th workspace without pushing the add button out of view
- [ ] Hidden workspaces remain manageable from the overflow menu
- [ ] Rename validation errors remain visible without collapsing the current editor
- [ ] Header chrome and workspace rail feel visually aligned with the right-side inspector shell

**Constraints**:
- Maximum 10 workspaces
- Tabs have minimum width
- Horizontal scrolling for many tabs
- Overflow mode starts once more than 6 workspaces exist
- In overflow mode, 5 tabs stay visible in the rail and the rest move into a dropdown menu
- Visual styling is implemented from `src/App.css` because the header and workspace rail are treated as one shared chrome surface
- On desktop, the rail is expected to align horizontally with the header action group
- Motion should respect `prefers-reduced-motion` and spacing should preserve clear separation between the active tab and the add button
- Mobile-style header stacking is driven by the app shell container width, not only the browser viewport, so narrow embeds still collapse cleanly
- Validation feedback currently covers empty/all-whitespace names and names longer than 50 characters; duplicate-name rejection is still not enforced

---

### WorkspaceTab

**Purpose**: Individual workspace tab with rename/delete capabilities.

**Features**:
- Click to switch workspace
- Long-press (3s) or right-click for context menu
- Inline rename on double-click or menu option
- Inline rename keeps the editor open when validation fails
- Delete option (if not last workspace)
- 15-character truncation with ellipsis
- Hover tooltip showing full name (after 3s)
- Circular progress indicator during long-press
- Pill-style active state with accent gradient to mirror the inspector color controls
- Stable tab shell with an always-visible close affordance instead of hover-only chrome

**Props**:
```typescript
interface WorkspaceTabProps {
  workspace: Workspace;
  isActive: boolean;
  canDelete: boolean;
  onClick: () => void;
  onClose: () => void;
  onRename: (name: string) => boolean | void;
}
```

**Success Criteria**:
- [ ] Click switches workspace
- [ ] Long-press shows context menu
- [ ] Right-click shows context menu
- [ ] Rename works inline
- [ ] Invalid rename attempts keep the user in the editor and surface feedback
- [ ] Delete removes workspace
- [ ] Cannot delete last workspace
- [ ] Tooltip shows full name
- [ ] Animation is smooth

**Constraints**:
- Name truncated at 15 characters
- Name validation is delegated to the store-backed parent rename handler
- Long-press requires 3 seconds
- Context menu must close on outside click
- Cannot delete if only one workspace

**Known Issues**:
- Context menu positioning can be tricky
- Long-press timing might feel slow to some users
- Visual regression coverage for the tab shell relies on Playwright computed-style checks rather than screenshot diffing

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
- Dialog sizing is bounded by the app shell so embeds can shrink without forcing viewport-width modals

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
